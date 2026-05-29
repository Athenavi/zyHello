"""SQLAlchemy database models mapped from Java entities."""
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, ForeignKey, BigInteger
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "user"

    user_id = Column(String(20), primary_key=True)
    login_name = Column(String(100), unique=True, nullable=False)
    email = Column(String(200), unique=True)
    password = Column(String(200), nullable=False)
    full_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500))
    workphone = Column(String(30))
    is_active = Column(Boolean, default=True)
    is_disabled = Column(Boolean, default=False)
    dept_id = Column(String(20), ForeignKey("department.dept_id"))
    role_id = Column(String(20))
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    department = relationship("Department", back_populates="users", foreign_keys=[dept_id])
    login_logs = relationship("LoginLog", back_populates="user", order_by="LoginLog.login_time.desc()")


class Department(Base):
    __tablename__ = "department"

    dept_id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    is_disabled = Column(Boolean, default=False)
    parent_id = Column(String(20))

    users = relationship("User", back_populates="department")


class LoginLog(Base):
    __tablename__ = "login_log"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    login_time = Column(DateTime, default=datetime.utcnow)
    ip_addr = Column(String(50))
    user_agent = Column(String(500))

    user = relationship("User", back_populates="login_logs")


class ExternalUser(Base):
    __tablename__ = "external_user"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    bind_user = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    app_id = Column(String(100), nullable=False)
    app_user = Column(String(200), nullable=False)


class Notification(Base):
    __tablename__ = "notification"

    message_id = Column(BigInteger, primary_key=True, autoincrement=True)
    from_user = Column(String(20), ForeignKey("user.user_id"))
    to_user = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    message = Column(Text)
    type = Column(Integer, default=1)
    unread = Column(Boolean, default=True)
    related_record = Column(String(20))
    created_on = Column(DateTime, default=datetime.utcnow)


class Attachment(Base):
    __tablename__ = "attachment"

    attachment_id = Column(String(20), primary_key=True)
    file_name = Column(String(200), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, default=0)
    belong_entity = Column(Integer, default=0)
    in_folder = Column(String(20), ForeignKey("attachment_folder.folder_id"))
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    created_on = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)

    folder = relationship("AttachmentFolder", back_populates="files")


class AttachmentFolder(Base):
    __tablename__ = "attachment_folder"

    folder_id = Column(String(20), primary_key=True)
    folder_name = Column(String(200), nullable=False)
    parent_id = Column(String(20))
    scope = Column(Integer, default=1)
    created_by = Column(String(20), ForeignKey("user.user_id"))
    created_on = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)

    files = relationship("Attachment", back_populates="folder")


class DashboardConfig(Base):
    __tablename__ = "dashboard_config"

    config_id = Column(String(20), primary_key=True)
    title = Column(String(100), nullable=False)
    config = Column(Text)
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_disabled = Column(Boolean, default=False)


class ChartConfig(Base):
    __tablename__ = "chart_config"

    chart_id = Column(String(20), primary_key=True)
    title = Column(String(100), nullable=False)
    chart_type = Column(String(50))
    belong_entity = Column(String(50))
    config = Column(Text)
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProjectConfig(Base):
    __tablename__ = "project_config"

    config_id = Column(String(20), primary_key=True)
    project_name = Column(String(100), nullable=False)
    project_code = Column(String(10))
    icon_name = Column(String(50))
    scope = Column(Integer, default=1)
    status = Column(Integer, default=1)
    members = Column(Text)  # JSON array of user IDs
    created_by = Column(String(20), ForeignKey("user.user_id"))
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_disabled = Column(Boolean, default=False)


class ProjectPlanConfig(Base):
    __tablename__ = "project_plan_config"

    plan_id = Column(String(20), primary_key=True)
    project_id = Column(String(20), ForeignKey("project_config.config_id"), nullable=False)
    plan_name = Column(String(100), nullable=False)
    seq = Column(Integer, default=0)
    flow_status = Column(Integer, default=0)

    project = relationship("ProjectConfig")


class ProjectTask(Base):
    __tablename__ = "project_task"

    task_id = Column(String(20), primary_key=True)
    project_id = Column(String(20), ForeignKey("project_config.config_id"), nullable=False)
    project_plan_id = Column(String(20), ForeignKey("project_plan_config.plan_id"))
    task_number = Column(BigInteger)
    task_name = Column(String(500), nullable=False)
    description = Column(Text)
    priority = Column(Integer, default=1)
    status = Column(Integer, default=0)
    deadline = Column(DateTime)
    seq = Column(Integer, default=0)
    created_by = Column(String(20), ForeignKey("user.user_id"))
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_on = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)

    project = relationship("ProjectConfig")
    plan = relationship("ProjectPlanConfig")


class RobotTriggerConfig(Base):
    __tablename__ = "robot_trigger_config"

    config_id = Column(String(20), primary_key=True)
    belong_entity = Column(String(50), nullable=False)
    name = Column(String(100))
    action_type = Column(String(50), nullable=False)
    when = Column(Integer)
    when_filter = Column(Text)
    when_timer = Column(String(100))
    action_content = Column(Text)
    priority = Column(Integer, default=1)
    is_disabled = Column(Boolean, default=False)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_on = Column(DateTime, default=datetime.utcnow)


class RobotApprovalConfig(Base):
    __tablename__ = "robot_approval_config"

    config_id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    belong_entity = Column(String(50), nullable=False)
    flow_definition = Column(Text)
    is_disabled = Column(Boolean, default=False)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RobotApprovalStep(Base):
    __tablename__ = "robot_approval_step"

    step_id = Column(String(20), primary_key=True)
    record_id = Column(String(20), nullable=False)
    approval_id = Column(String(20), ForeignKey("robot_approval_config.config_id"), nullable=False)
    node = Column(String(50))
    state = Column(Integer, default=0)
    is_canceled = Column(Boolean, default=False)
    approver = Column(String(20), ForeignKey("user.user_id"))
    remark = Column(Text)
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ApprovalStatus(Base):
    __tablename__ = "approval_status"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    record_id = Column(String(20), unique=True, nullable=False)
    approval_id = Column(String(20), ForeignKey("robot_approval_config.config_id"))
    state = Column(Integer, default=0)
    submitter = Column(String(20), ForeignKey("user.user_id"))
    prev_step_node = Column(String(50))
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TaskComment(Base):
    __tablename__ = "task_comment"

    comment_id = Column(String(20), primary_key=True)
    task_id = Column(String(20), ForeignKey("project_task.task_id"), nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    created_on = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)


class TaskTag(Base):
    __tablename__ = "task_tag"

    tag_id = Column(String(20), primary_key=True)
    tag_name = Column(String(100), nullable=False)
    color = Column(String(20))
    project_id = Column(String(20), ForeignKey("project_config.config_id"))
    created_by = Column(String(20), ForeignKey("user.user_id"))


# ---------------------------------------------------------------------------
# Feeds models
# ---------------------------------------------------------------------------

class Feeds(Base):
    __tablename__ = "feeds"

    feeds_id = Column(String(20), primary_key=True)
    content = Column(Text)
    images = Column(Text)          # JSON array
    attachments = Column(Text)     # JSON array
    scope = Column(String(100), default="ALL")
    type = Column(Integer, default=1)           # 1=dynamic, 2=approval, 10=announcement, 20=schedule
    related_record = Column(String(20))
    content_more = Column(Text)    # JSON
    auto_location = Column(String(200))
    is_deleted = Column(Boolean, default=False)
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeedsComment(Base):
    __tablename__ = "feeds_comment"

    comment_id = Column(String(20), primary_key=True)
    feeds_id = Column(String(20), ForeignKey("feeds.feeds_id"), nullable=False)
    content = Column(Text)
    images = Column(Text)
    attachments = Column(Text)
    is_deleted = Column(Boolean, default=False)
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeedsLike(Base):
    __tablename__ = "feeds_like"

    like_id = Column(String(20), primary_key=True)
    source = Column(String(20), ForeignKey("feeds.feeds_id"), nullable=False)
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)


class FeedsMention(Base):
    __tablename__ = "feeds_mention"

    mention_id = Column(String(20), primary_key=True)
    feeds_id = Column(String(20), ForeignKey("feeds.feeds_id"), nullable=False)
    user_id = Column(String(20), ForeignKey("user.user_id"), nullable=False)


class FeedsStatus(Base):
    __tablename__ = "feeds_status"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    feeds_id = Column(String(20), ForeignKey("feeds.feeds_id"), nullable=False)
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    created_on = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# API management models
# ---------------------------------------------------------------------------

class RebuildApi(Base):
    __tablename__ = "rebuild_api"

    unique_id = Column(String(20), primary_key=True)
    app_id = Column(String(50), unique=True, nullable=False)
    app_secret = Column(String(100), nullable=False)
    bind_user = Column(String(20), ForeignKey("user.user_id"))
    bind_ips = Column(String(500))
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RebuildApiRequest(Base):
    __tablename__ = "rebuild_api_request"

    request_id = Column(String(50), primary_key=True)
    app_id = Column(String(50), nullable=False)
    remote_ip = Column(String(50))
    request_url = Column(String(500))
    request_body = Column(Text)
    response_body = Column(Text)
    response_time = Column(DateTime)
    request_time = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# SMS / Email log
# ---------------------------------------------------------------------------

class SmsendLog(Base):
    __tablename__ = "smsend_log"

    send_id = Column(BigInteger, primary_key=True, autoincrement=True)
    type = Column(Integer, nullable=False)       # 1=SMS, 2=Email
    to_user = Column(String(200))
    content = Column(Text)
    send_time = Column(DateTime, default=datetime.utcnow)
    status = Column(Integer, default=1)


# ---------------------------------------------------------------------------
# AiBot models
# ---------------------------------------------------------------------------

class AibotChat(Base):
    __tablename__ = "aibot_chat"

    chat_id = Column(String(20), primary_key=True)
    subject = Column(String(200))
    created_by = Column(String(20), ForeignKey("user.user_id"), nullable=False)
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AibotChatMessage(Base):
    __tablename__ = "aibot_chat_message"

    message_id = Column(BigInteger, primary_key=True, autoincrement=True)
    chat_id = Column(String(20), ForeignKey("aibot_chat.chat_id"), nullable=False)
    role = Column(String(20), nullable=False)     # user / ai / system
    content = Column(Text, nullable=False)
    created_on = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Data report / import config
# ---------------------------------------------------------------------------

class DataReportConfig(Base):
    __tablename__ = "data_report_config"

    config_id = Column(String(20), primary_key=True)
    belong_entity = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    template_file = Column(String(500))
    template_type = Column(Integer, default=1)   # 1=record, 2=list, 3=word, 4=html5
    extra_definition = Column(Text)
    is_disabled = Column(Boolean, default=False)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_on = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# System configuration (key-value store)
# ---------------------------------------------------------------------------

class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    item = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
