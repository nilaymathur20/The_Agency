"""Structured agent messages (MESSAGING.md)"""
import uuid
from datetime import datetime
from typing import Dict, Any, List

from .store import get_store
from .events import get_event_bus

MESSAGE_TYPES = [
    "TASK_ASSIGNMENT","TASK_ACCEPTED","TASK_BLOCKED","TASK_PROGRESS",
    "TASK_COMPLETED","TASK_FAILED","REVIEW_REQUEST","REVIEW_RESULT",
    "DEPENDENCY_READY","APPROVAL_REQUEST","APPROVAL_RESULT","INTEGRATION_REQUEST"
]

def create_message(project_id: str, from_agent: str, to_agent: str, message_type: str, payload: Dict[str, Any] = None, task_id: str = None, store=None, event_bus=None) -> Dict[str, Any]:
    if message_type not in MESSAGE_TYPES:
        raise ValueError(f"Invalid message_type {message_type}")
    msg = {
        "id": f"MSG-{uuid.uuid4().hex[:8]}",
        "project_id": project_id,
        "task_id": task_id,
        "from_agent": from_agent,
        "to_agent": to_agent,
        "message_type": message_type,
        "payload": payload or {},
        "created_at": datetime.utcnow().isoformat(),
    }
    s = store or get_store()
    s.add_message(msg)
    eb = event_bus or get_event_bus(store=s)
    eb.emit(project_id, f"message.{message_type.lower()}", {"message_id": msg["id"], "from": from_agent, "to": to_agent, "payload": payload}, task_id=task_id, agent_id=from_agent)
    return msg

def list_messages(project_id: str, store=None, limit: int = 200) -> List[Dict[str, Any]]:
    s = store or get_store()
    return s.list_messages(project_id, limit=limit)

def completion_report(summary: str, files_changed: List[str], tests: Dict[str, Any] = None, commit: str = None, blockers: List[str] = None) -> Dict[str, Any]:
    return {
        "summary": summary,
        "files_changed": files_changed or [],
        "tests": tests or {"status": "unknown"},
        "commit": commit,
        "blockers": blockers or [],
    }
