"""Approval request/response schemas."""
from pydantic import BaseModel
from typing import Optional


class ApprovalSubmitRequest(BaseModel):
    record_id: str
    approval_id: str


class ApprovalActionRequest(BaseModel):
    record_id: str
    step_id: Optional[str] = None
    remark: Optional[str] = ""
    approval_id: Optional[str] = None


class ApprovalApproveRequest(BaseModel):
    step_id: str
    remark: Optional[str] = ""


class ApprovalCancelRequest(BaseModel):
    record_id: str


class ApprovalUrgeRequest(BaseModel):
    record_id: str


class ApprovalRevokeRequest(BaseModel):
    record_id: str


class ApprovalReferralRequest(BaseModel):
    step_id: str
    to_user_id: str


class ApprovalCountersignRequest(BaseModel):
    step_id: str
    remark: Optional[str] = ""


class FlowDefinitionQuery(BaseModel):
    approval_id: str
