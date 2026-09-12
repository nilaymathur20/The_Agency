"""Structured event bus (OBSERVABILITY.md) - persists to store + in-memory pub/sub."""
import asyncio
import json
from datetime import datetime
from typing import Any, Callable, Dict, List
import uuid

from .store import get_store

def _now():
    return datetime.utcnow().isoformat()

class EventBus:
    def __init__(self, store=None):
        self.store = store or get_store()
        self._listeners: Dict[str, List[Callable]] = {}
        self._queues: Dict[str, List[asyncio.Queue]] = {}

    def emit(self, project_id: str, event_type: str, payload: Dict[str, Any] = None, task_id: str = None, agent_id: str = None) -> Dict[str, Any]:
        payload = payload or {}
        event = {
            "id": uuid.uuid4().hex[:12],
            "task_id": task_id,
            "project_id": project_id,
            "agent_id": agent_id,
            "event_type": event_type,
            "payload": payload,
            "created_at": _now(),
        }
        # persist
        try:
            self.store.add_event(event)
        except Exception as e:
            print(f"[events] persist failed: {e}")
        # notify WebSocket queues for project
        for q in self._queues.get(project_id, []):
            try:
                q.put_nowait(event)
            except:
                pass
        for q in self._queues.get("*", []):
            try:
                q.put_nowait(event)
            except:
                pass
        return event

    def subscribe(self, project_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        if project_id not in self._queues:
            self._queues[project_id] = []
        self._queues[project_id].append(q)
        return q

    def unsubscribe(self, project_id: str, queue: asyncio.Queue):
        if project_id in self._queues:
            try:
                self._queues[project_id].remove(queue)
            except:
                pass

    def list_events(self, project_id: str, limit: int = 200):
        return self.store.list_events(project_id, limit=limit)

_bus: EventBus | None = None

def get_event_bus(store=None) -> EventBus:
    global _bus
    if _bus is None:
        _bus = EventBus(store=store)
    return _bus
