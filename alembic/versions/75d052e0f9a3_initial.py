"""initial: Create all application tables

This migration creates all tables defined in app.models.
Uses "CREATE TABLE IF NOT EXISTS" so it is safe to run
on a database that already has some or all of these tables
(e.g. from the original Java Rebuild deployment).

Revision ID: 75d052e0f9a3
Revises: 
Create Date: 2026-07-14 15:09:46.105354
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '75d052e0f9a3'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- department (parent table referenced by user) ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS department (
            dept_id VARCHAR(20) NOT NULL,
            name VARCHAR(100) NOT NULL,
            is_disabled BOOLEAN DEFAULT false,
            parent_id VARCHAR(20),
            PRIMARY KEY (dept_id)
        )
    """)

    # --- user ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS "user" (
            user_id VARCHAR(20) NOT NULL,
            login_name VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(200) UNIQUE,
            password VARCHAR(200) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            avatar_url VARCHAR(500),
            workphone VARCHAR(30),
            is_active BOOLEAN DEFAULT true,
            is_disabled BOOLEAN DEFAULT false,
            dept_id VARCHAR(20) REFERENCES department(dept_id),
            role_id VARCHAR(20),
            created_on TIMESTAMP DEFAULT now(),
            modified_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (user_id)
        )
    """)

    # --- login_log ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS login_log (
            log_id SERIAL PRIMARY KEY,
            user_id VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            login_time TIMESTAMP DEFAULT now(),
            ip_addr VARCHAR(50),
            user_agent VARCHAR(500)
        )
    """)

    # --- external_user ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS external_user (
            id BIGSERIAL PRIMARY KEY,
            bind_user VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            app_id VARCHAR(100) NOT NULL,
            app_user VARCHAR(200) NOT NULL
        )
    """)

    # --- notification ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS notification (
            message_id BIGSERIAL PRIMARY KEY,
            from_user VARCHAR(20) REFERENCES "user"(user_id),
            to_user VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            message TEXT,
            type INTEGER DEFAULT 1,
            unread BOOLEAN DEFAULT true,
            related_record VARCHAR(20),
            created_on TIMESTAMP DEFAULT now()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_notification_to_user
        ON notification(to_user)
    """)

    # --- attachment_folder ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS attachment_folder (
            folder_id VARCHAR(20) NOT NULL,
            folder_name VARCHAR(200) NOT NULL,
            parent_id VARCHAR(20),
            scope INTEGER DEFAULT 1,
            created_by VARCHAR(20) REFERENCES "user"(user_id),
            created_on TIMESTAMP DEFAULT now(),
            is_deleted BOOLEAN DEFAULT false,
            PRIMARY KEY (folder_id)
        )
    """)

    # --- attachment ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS attachment (
            attachment_id VARCHAR(20) NOT NULL,
            file_name VARCHAR(200) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size BIGINT DEFAULT 0,
            belong_entity INTEGER DEFAULT 0,
            in_folder VARCHAR(20) REFERENCES attachment_folder(folder_id),
            created_by VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            created_on TIMESTAMP DEFAULT now(),
            is_deleted BOOLEAN DEFAULT false,
            PRIMARY KEY (attachment_id)
        )
    """)

    # --- dashboard_config ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS dashboard_config (
            config_id VARCHAR(20) NOT NULL,
            title VARCHAR(100) NOT NULL,
            config TEXT,
            created_by VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            modified_on TIMESTAMP DEFAULT now(),
            is_disabled BOOLEAN DEFAULT false,
            PRIMARY KEY (config_id)
        )
    """)

    # --- chart_config ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS chart_config (
            chart_id VARCHAR(20) NOT NULL,
            title VARCHAR(100) NOT NULL,
            chart_type VARCHAR(50),
            belong_entity VARCHAR(50),
            config TEXT,
            created_by VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            modified_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (chart_id)
        )
    """)

    # --- project_config ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS project_config (
            config_id VARCHAR(20) NOT NULL,
            project_name VARCHAR(100) NOT NULL,
            project_code VARCHAR(10),
            icon_name VARCHAR(50),
            scope INTEGER DEFAULT 1,
            status INTEGER DEFAULT 1,
            members TEXT,
            created_by VARCHAR(20) REFERENCES "user"(user_id),
            modified_on TIMESTAMP DEFAULT now(),
            is_disabled BOOLEAN DEFAULT false,
            PRIMARY KEY (config_id)
        )
    """)

    # --- project_plan_config ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS project_plan_config (
            plan_id VARCHAR(20) NOT NULL,
            project_id VARCHAR(20) NOT NULL REFERENCES project_config(config_id),
            plan_name VARCHAR(100) NOT NULL,
            seq INTEGER DEFAULT 0,
            flow_status INTEGER DEFAULT 0,
            PRIMARY KEY (plan_id)
        )
    """)

    # --- project_task ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS project_task (
            task_id VARCHAR(20) NOT NULL,
            project_id VARCHAR(20) NOT NULL REFERENCES project_config(config_id),
            project_plan_id VARCHAR(20) REFERENCES project_plan_config(plan_id),
            task_number BIGINT,
            task_name VARCHAR(500) NOT NULL,
            description TEXT,
            priority INTEGER DEFAULT 1,
            status INTEGER DEFAULT 0,
            deadline TIMESTAMP,
            seq INTEGER DEFAULT 0,
            created_by VARCHAR(20) REFERENCES "user"(user_id),
            modified_on TIMESTAMP DEFAULT now(),
            created_on TIMESTAMP DEFAULT now(),
            is_deleted BOOLEAN DEFAULT false,
            PRIMARY KEY (task_id)
        )
    """)

    # --- task_comment ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS task_comment (
            comment_id VARCHAR(20) NOT NULL,
            task_id VARCHAR(20) NOT NULL REFERENCES project_task(task_id),
            content TEXT NOT NULL,
            created_by VARCHAR(20) REFERENCES "user"(user_id),
            created_on TIMESTAMP DEFAULT now(),
            is_deleted BOOLEAN DEFAULT false,
            PRIMARY KEY (comment_id)
        )
    """)

    # --- task_tag ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS task_tag (
            tag_id VARCHAR(20) NOT NULL,
            tag_name VARCHAR(100) NOT NULL,
            color VARCHAR(20),
            project_id VARCHAR(20) REFERENCES project_config(config_id),
            created_by VARCHAR(20) REFERENCES "user"(user_id),
            PRIMARY KEY (tag_id)
        )
    """)

    # --- robot_trigger_config ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS robot_trigger_config (
            config_id VARCHAR(20) NOT NULL,
            belong_entity VARCHAR(50) NOT NULL,
            name VARCHAR(100),
            action_type VARCHAR(50) NOT NULL,
            when_filter TEXT,
            when_timer VARCHAR(100),
            action_content TEXT,
            priority INTEGER DEFAULT 1,
            is_disabled BOOLEAN DEFAULT false,
            modified_on TIMESTAMP DEFAULT now(),
            created_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (config_id)
        )
    """)

    # --- robot_approval_config ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS robot_approval_config (
            config_id VARCHAR(20) NOT NULL,
            name VARCHAR(100) NOT NULL,
            belong_entity VARCHAR(50) NOT NULL,
            flow_definition TEXT,
            is_disabled BOOLEAN DEFAULT false,
            modified_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (config_id)
        )
    """)

    # --- robot_approval_step ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS robot_approval_step (
            step_id VARCHAR(20) NOT NULL,
            record_id VARCHAR(20) NOT NULL,
            approval_id VARCHAR(20) NOT NULL REFERENCES robot_approval_config(config_id),
            node VARCHAR(50),
            state INTEGER DEFAULT 0,
            is_canceled BOOLEAN DEFAULT false,
            approver VARCHAR(20) REFERENCES "user"(user_id),
            remark TEXT,
            created_on TIMESTAMP DEFAULT now(),
            modified_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (step_id)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_robot_approval_step_record
        ON robot_approval_step(record_id)
    """)

    # --- approval_status ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS approval_status (
            id BIGSERIAL PRIMARY KEY,
            record_id VARCHAR(20) NOT NULL UNIQUE,
            approval_id VARCHAR(20) REFERENCES robot_approval_config(config_id),
            state INTEGER DEFAULT 0,
            submitter VARCHAR(20) REFERENCES "user"(user_id),
            prev_step_node VARCHAR(50),
            created_on TIMESTAMP DEFAULT now(),
            modified_on TIMESTAMP DEFAULT now()
        )
    """)

    # --- feeds ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS feeds (
            feeds_id VARCHAR(20) NOT NULL,
            content TEXT,
            images TEXT,
            attachments TEXT,
            scope VARCHAR(100) DEFAULT 'ALL',
            type INTEGER DEFAULT 1,
            related_record VARCHAR(20),
            content_more TEXT,
            auto_location VARCHAR(200),
            is_deleted BOOLEAN DEFAULT false,
            created_by VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            created_on TIMESTAMP DEFAULT now(),
            modified_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (feeds_id)
        )
    """)

    # --- feeds_comment ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS feeds_comment (
            comment_id VARCHAR(20) NOT NULL,
            feeds_id VARCHAR(20) NOT NULL REFERENCES feeds(feeds_id),
            content TEXT,
            images TEXT,
            attachments TEXT,
            is_deleted BOOLEAN DEFAULT false,
            created_by VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            created_on TIMESTAMP DEFAULT now(),
            modified_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (comment_id)
        )
    """)

    # --- feeds_like ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS feeds_like (
            like_id VARCHAR(20) NOT NULL,
            source VARCHAR(20) NOT NULL REFERENCES feeds(feeds_id),
            created_by VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            PRIMARY KEY (like_id)
        )
    """)

    # --- feeds_mention ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS feeds_mention (
            mention_id VARCHAR(20) NOT NULL,
            feeds_id VARCHAR(20) NOT NULL REFERENCES feeds(feeds_id),
            user_id VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            PRIMARY KEY (mention_id)
        )
    """)

    # --- feeds_status ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS feeds_status (
            id BIGSERIAL PRIMARY KEY,
            feeds_id VARCHAR(20) NOT NULL REFERENCES feeds(feeds_id),
            created_by VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            created_on TIMESTAMP DEFAULT now()
        )
    """)

    # --- rebuild_api ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS rebuild_api (
            unique_id VARCHAR(20) NOT NULL,
            app_id VARCHAR(50) NOT NULL UNIQUE,
            app_secret VARCHAR(100) NOT NULL,
            bind_user VARCHAR(20) REFERENCES "user"(user_id),
            bind_ips VARCHAR(500),
            created_on TIMESTAMP DEFAULT now(),
            modified_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (unique_id)
        )
    """)

    # --- rebuild_api_request ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS rebuild_api_request (
            request_id VARCHAR(50) NOT NULL,
            app_id VARCHAR(50) NOT NULL,
            remote_ip VARCHAR(50),
            request_url VARCHAR(500),
            request_body TEXT,
            response_body TEXT,
            response_time TIMESTAMP,
            request_time TIMESTAMP DEFAULT now(),
            PRIMARY KEY (request_id)
        )
    """)

    # --- smsend_log ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS smsend_log (
            send_id BIGSERIAL PRIMARY KEY,
            type INTEGER NOT NULL,
            to_user VARCHAR(200),
            content TEXT,
            send_time TIMESTAMP DEFAULT now(),
            status INTEGER DEFAULT 1
        )
    """)

    # --- aibot_chat ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS aibot_chat (
            chat_id VARCHAR(20) NOT NULL,
            subject VARCHAR(200),
            created_by VARCHAR(20) NOT NULL REFERENCES "user"(user_id),
            created_on TIMESTAMP DEFAULT now(),
            modified_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (chat_id)
        )
    """)

    # --- aibot_chat_message ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS aibot_chat_message (
            message_id BIGSERIAL PRIMARY KEY,
            chat_id VARCHAR(20) NOT NULL REFERENCES aibot_chat(chat_id),
            role VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            created_on TIMESTAMP DEFAULT now()
        )
    """)

    # --- data_report_config ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS data_report_config (
            config_id VARCHAR(20) NOT NULL,
            belong_entity VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            template_file VARCHAR(500),
            template_type INTEGER DEFAULT 1,
            extra_definition TEXT,
            is_disabled BOOLEAN DEFAULT false,
            modified_on TIMESTAMP DEFAULT now(),
            created_on TIMESTAMP DEFAULT now(),
            PRIMARY KEY (config_id)
        )
    """)

    # --- system_config ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS system_config (
            id BIGSERIAL PRIMARY KEY,
            item VARCHAR(100) NOT NULL UNIQUE,
            value TEXT,
            modified_on TIMESTAMP DEFAULT now()
        )
    """)


def downgrade() -> None:
    """Reverse the migration by dropping all tables, in dependency order."""
    tables = [
        "system_config",
        "data_report_config",
        "aibot_chat_message",
        "aibot_chat",
        "smsend_log",
        "rebuild_api_request",
        "rebuild_api",
        "feeds_status",
        "feeds_mention",
        "feeds_like",
        "feeds_comment",
        "feeds",
        "approval_status",
        "robot_approval_step",
        "robot_approval_config",
        "robot_trigger_config",
        "task_tag",
        "task_comment",
        "project_task",
        "project_plan_config",
        "project_config",
        "chart_config",
        "dashboard_config",
        "attachment",
        "attachment_folder",
        "notification",
        "external_user",
        "login_log",
        '"user"',
        "department",
    ]
    for t in tables:
        op.execute(f'DROP TABLE IF EXISTS {t} CASCADE')
