"""Pydantic domain models for control plane."""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import uuid

def gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:8]}" if prefix else uuid.uuid4().hex[:8]

class ProjectStatus(str, Enum):
    created = "created"
    running = "running"
    paused = "paused"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"

class TaskStatus(str, Enum):
    queued = "queued"
    running = "running"
    waiting = "waiting"
    blocked = "blocked"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"

class AgentStatus(str, Enum):
    dormant = "dormant"
    awakened = "awakened"
    working = "working"
    waiting = "waiting"
    ready = "ready"

class ApprovalStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    denied = "denied"

# ---- API models ----

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    requirements: Optional[str] = None

class Project(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    workspace_path: str
    status: ProjectStatus = ProjectStatus.created
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    requirements: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    priority: str = "medium"
    dependencies: List[str] = []
    acceptance_criteria: List[str] = []

class Task(BaseModel):
    id: str
    project_id: str
    parent_task_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    owner_agent_id: Optional[str] = None
    owner_role: Optional[str] = None
    status: TaskStatus = TaskStatus.queued
    priority: str = "medium"
    dependencies: List[str] = []
    acceptance_criteria: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    files_changed: List[str] = []
    report: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class AgentDefinition(BaseModel):
    id: str
    role: str
    skills: List[str] = []
    tools: List[str] = []
    permissions: List[str] = []
    model_policy: str = "balanced"
    preferred_task_types: List[str] = []
    status: AgentStatus = AgentStatus.dormant
    current_task_id: Optional[str] = None

class AgentState(BaseModel):
    id: str
    role: str
    status: AgentStatus
    model_policy: str
    current_task_id: Optional[str] = None
    skills: List[str] = []
    tools: List[str] = []
    permissions: List[str] = []

class TaskEvent(BaseModel):
    id: str
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    agent_id: Optional[str] = None
    event_type: str
    payload: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ToolExecutionRecord(BaseModel):
    id: str
    agent_id: Optional[str] = None
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    tool: str
    arguments: Dict[str, Any] = {}
    result: Optional[Dict[str, Any]] = None
    status: str = "success"
    duration_ms: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ModelRequestRecord(BaseModel):
    id: str
    agent_id: Optional[str] = None
    task_id: Optional[str] = None
    model: str
    status: str
    latency_ms: int = 0
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Approval(BaseModel):
    id: str
    project_id: str
    task_id: Optional[str] = None
    requested_by: Optional[str] = None
    operation: str
    status: ApprovalStatus = ApprovalStatus.pending
    reason: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    payload: Dict[str, Any] = {}

class Checkpoint(BaseModel):
    id: str
    project_id: str
    git_commit: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AgentMessage(BaseModel):
    id: str
    project_id: str
    task_id: Optional[str] = None
    from_agent: str
    to_agent: str
    message_type: str
    payload: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Tool Gateway contracts
class ToolCallRequest(BaseModel):
    tool: str
    arguments: Dict[str, Any] = {}
    task_id: Optional[str] = None
    agent_id: Optional[str] = None
    project_id: Optional[str] = None
    request_id: Optional[str] = None
    timeout: int = 60

class ToolCallResult(BaseModel):
    success: bool
    tool: str
    output: Any = None
    error: Optional[str] = None
    error_category: Optional[str] = None
    duration_ms: int = 0
    affected_files: List[str] = []
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    audit_id: Optional[str] = None
