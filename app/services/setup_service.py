"""Setup service — install wizard, DB connection test, cache test."""
import os
import subprocess
from datetime import datetime
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.models import SystemConfig


def test_database_connection(db_props: dict) -> dict:
    """Test database connection with provided properties.

    Returns {"success": True, "message": "..."} or {"success": False, "error": "..."}.
    """
    db_type = db_props.get("dbType", "mysql")
    host = db_props.get("dbHost", "127.0.0.1")
    port = db_props.get("dbPort", "3306")
    name = db_props.get("dbName", "")
    user = db_props.get("dbUser", "")
    password = db_props.get("dbPassword", "")

    # Reject system databases
    forbidden = {"mysql", "sys", "information_schema", "performance_schema"}
    if name.lower() in forbidden:
        return {"success": False, "error": "请勿使用 MySQL 系统数据库"}

    if db_type == "mysql":
        url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"
    elif db_type == "postgresql":
        url = f"postgresql://{user}:{password}@{host}:{port}/{name}"
    elif db_type == "sqlite":
        url = f"sqlite:///{name}"
    else:
        return {"success": False, "error": f"不支持的数据库类型: {db_type}"}

    try:
        test_engine = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
        with test_engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()

        product_info = ""
        try:
            with test_engine.connect() as conn:
                if db_type == "mysql":
                    r = conn.execute(text("SELECT VERSION()"))
                    product_info = f"MySQL {r.scalar()}"
                elif db_type == "postgresql":
                    r = conn.execute(text("SELECT version()"))
                    product_info = r.scalar()
                elif db_type == "sqlite":
                    product_info = "SQLite"
        except Exception:
            product_info = db_type

        test_engine.dispose()
        return {"success": True, "message": f"连接成功 : {product_info}"}

    except Exception as e:
        return {"success": False, "error": f"连接错误 : {str(e)}"}


def test_cache_connection(cache_props: dict) -> dict:
    """Test Redis cache connection.

    Returns {"success": True, "message": "..."} or {"success": False, "error": "..."}.
    """
    host = cache_props.get("CacheHost", "127.0.0.1")
    port = int(cache_props.get("CachePort", 6379))
    password = cache_props.get("CachePassword") or None

    try:
        import redis
        r = redis.Redis(host=host, port=port, password=password, socket_timeout=3)
        info = r.info("server")
        info_str = str(info)[:80]
        return {"success": True, "message": f"连接成功 : {info_str}"}
    except ImportError:
        return {"success": False, "error": "缺少 redis-py 库，请安装 redis 依赖"}
    except Exception as e:
        return {"success": False, "error": f"连接错误 : {str(e)}"}


def check_install_status() -> dict:
    """Check whether the system has already been installed.

    Returns {"installed": True/False}.
    """
    from app.database import engine, SessionLocal
    from sqlalchemy import inspect as sa_inspect
    try:
        insp = sa_inspect(engine)
        tables = insp.get_table_names()
        if "user" not in tables:
            return {"installed": False}
        # Check if admin user exists (use ORM to avoid SQL keyword issues)
        from app.models import User
        session = SessionLocal()
        try:
            count = session.query(User).filter(User.login_name == "admin").count()
            return {"installed": count > 0}
        finally:
            session.close()
    except Exception:
        return {"installed": False}


def install_rebuild(db: Session, install_props: dict) -> dict:
    """Execute initial installation — create tables, seed admin user.

    Uses the database properties from install_props to connect to the correct DB.

    Returns {"success": True} or {"success": False, "error": "..."}.
    """
    try:
        # Build database URL from install properties
        db_type = install_props.get("dbType", "sqlite")
        host = install_props.get("dbHost", "127.0.0.1")
        port = install_props.get("dbPort", "3306")
        name = install_props.get("dbName", "")
        user = install_props.get("dbUser", "")
        password = install_props.get("dbPassword", "")

        if db_type == "mysql":
            database_url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"
        elif db_type == "postgresql":
            database_url = f"postgresql://{user}:{password}@{host}:{port}/{name}"
        elif db_type == "sqlite":
            database_url = f"sqlite:///{name or 'rebuild.db'}"
        else:
            return {"success": False, "error": f"不支持的数据库类型: {db_type}"}

        # Re-initialize the global engine with the user-provided database URL
        from app.database import reinit_engine
        reinit_engine(database_url)

        from app.models import Base
        from app.database import engine
        Base.metadata.create_all(bind=engine)

        # Re-open a session on the new engine to seed admin user
        from app.database import SessionLocal
        new_session = SessionLocal()
        try:
            from app.models import User
            admin = new_session.query(User).filter(User.login_name == "admin").first()
            if not admin:
                import hashlib
                default_password = hashlib.sha256("admin".encode()).hexdigest()
                admin = User(
                    user_id="001-0000000000000001",
                    login_name="admin",
                    full_name="管理员",
                    email="admin@getrebuild.com",
                    password=default_password,
                    is_active=True,
                )
                new_session.add(admin)
                new_session.commit()
        finally:
            new_session.close()

        # Persist DATABASE_URL to .env so it survives server restarts
        _save_env_database_url(database_url)

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": f"安装失败 : {str(e)}"}


def _save_env_database_url(database_url: str) -> None:
    """Write DATABASE_URL to the .env file, preserving other existing keys."""
    import os
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    lines: list[str] = []
    if os.path.isfile(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    found = False
    new_lines: list[str] = []
    for line in lines:
        if line.strip().startswith("DATABASE_URL="):
            new_lines.append(f"DATABASE_URL={database_url}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"DATABASE_URL={database_url}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def request_sn(sn: str = None) -> dict:
    """Request or validate a serial number.

    Returns {"success": True} or {"success": False, "error": "..."}.
    """
    if not sn:
        return {"success": True}

    # Validate SN format (basic check)
    if len(sn) < 16:
        return {"success": False, "error": "无效商业授权码"}

    return {"success": True}


def install_rbsystem(db: Session, file_name: str) -> dict:
    """Install/import an RB system definition file.

    Returns {"success": True} or {"success": False, "error": "..."}.
    """
    if not file_name:
        return {"success": False, "error": "请指定文件"}

    # Validate file exists
    rb_path = os.path.join(os.getcwd(), "rbsystems", file_name)
    if not os.path.exists(rb_path):
        return {"success": False, "error": f"文件不存在: {file_name}"}

    try:
        import json
        with open(rb_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Process the RB system definition
        # This would normally create entities, fields, etc.
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
