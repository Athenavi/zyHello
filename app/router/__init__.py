from fastapi import APIRouter
from . import (
    # Original API routers
    user,
    account,
    signup,
    trigger,
    approval,
    project,
    files,
    notification,
    dashboard,
    # New template-rendering routers
    general,
    common,
    admin_common,
    admin_project,
    admin_bizuser,
    admin_audit,
    admin_setup,
    admin_metadata,
    admin_data,
    admin_integration,
    admin_robot,
    contacts,
    feeds,
    error,
    aibot,
)

router = APIRouter()

# ── Original API routers ───────────────────────────────────────────
router.include_router(signup.router, tags=["Signup & Login"])
router.include_router(user.router, tags=["User Settings"])
router.include_router(account.router, tags=["Account"])
router.include_router(notification.router, tags=["Notification"])
router.include_router(dashboard.router, tags=["Dashboard"])
router.include_router(trigger.router, tags=["Robot Triggers"])
router.include_router(approval.router, tags=["Approval"])
router.include_router(project.router, tags=["Project"])
router.include_router(files.router, tags=["Files"])

# ── New template-rendering routers ─────────────────────────────────
router.include_router(general.router, tags=["General Entity Pages"])
router.include_router(common.router, tags=["Common Pages"])
router.include_router(admin_common.router, tags=["Admin Common"])
router.include_router(admin_project.router, tags=["Admin Project"])
router.include_router(admin_bizuser.router, tags=["Admin Business Users"])
router.include_router(admin_audit.router, tags=["Admin Audit"])
router.include_router(admin_setup.router, tags=["Admin Setup"])
router.include_router(admin_metadata.router, tags=["Admin Metadata"])
router.include_router(admin_data.router, tags=["Admin Data"])
router.include_router(admin_integration.router, tags=["Admin Integration"])
router.include_router(admin_robot.router, tags=["Admin Robot"])
router.include_router(contacts.router, tags=["Contacts"])
router.include_router(feeds.router, tags=["Feeds"])
router.include_router(error.router, tags=["Error Pages"])
router.include_router(aibot.router, tags=["AI Bot"])
