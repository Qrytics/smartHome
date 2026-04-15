"""
Automation rules CRUD and default template endpoints.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services import db_client
from app.services.rules_engine import DEFAULT_RULESET

router = APIRouter()


class RulePayload(BaseModel):
    name: str = Field(..., min_length=3, max_length=120)
    trigger: str
    comparator: str
    threshold: float
    action: str
    action_value: Optional[str] = ""
    enabled: bool = True


class RuleTogglePayload(BaseModel):
    enabled: bool


@router.get("")
async def list_rules() -> Dict[str, List[Dict]]:
    return {"rules": db_client.list_automation_rules()}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_rule(payload: RulePayload) -> Dict:
    return db_client.create_automation_rule(payload.model_dump())


@router.put("/{rule_id}")
async def update_rule(rule_id: str, payload: RulePayload) -> Dict:
    updated = db_client.update_automation_rule(rule_id, payload.model_dump())
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return updated


@router.post("/{rule_id}/toggle")
async def toggle_rule(rule_id: str, payload: RuleTogglePayload) -> Dict:
    updated = db_client.toggle_automation_rule(rule_id, payload.enabled)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return updated


@router.delete("/{rule_id}")
async def delete_rule(rule_id: str) -> Dict:
    deleted = db_client.delete_automation_rule(rule_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return {"status": "deleted", "id": rule_id}


@router.get("/templates/default")
async def get_default_ruleset() -> Dict:
    return {"rules": DEFAULT_RULESET}
