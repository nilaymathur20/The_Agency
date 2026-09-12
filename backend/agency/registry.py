"""Agent Registry (201 logical agents) - not 201 processes."""
from typing import Dict, Any, List, Optional
from .config import get_config
from .store import get_store

class AgentRegistry:
    def __init__(self, config=None, store=None):
        self.config = config or get_config()
        self.store = store or get_store()
        self._definitions: Dict[str, Dict[str, Any]] = {}
        self._load_definitions()

    def _load_definitions(self):
        defs = self.config.get_agent_definitions()
        for d in defs:
            agent = {
                "id": d["id"],
                "role": d["role"],
                "skills": d.get("skills", []),
                "tools": d.get("tools", []),
                "permissions": d.get("permissions", []),
                "model_policy": d.get("model_policy", "balanced"),
                "preferred_task_types": d.get("preferred_task_types", []),
                "status": d.get("status", "dormant"),
                "current_task_id": None,
            }
            self._definitions[d["id"]] = agent
            # upsert to store
            try:
                self.store.upsert_agent(agent)
            except Exception as e:
                print(f"[registry] upsert {d['id']} failed: {e}")

    def list_agents(self) -> List[Dict[str, Any]]:
        return self.store.list_agents()

    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        return self.store.get_agent(agent_id)

    def get_available(self, role: str = None, task_type: str = None) -> List[Dict[str, Any]]:
        agents = self.list_agents()
        # filter dormant or ready
        available = [a for a in agents if a["status"] in ("dormant","ready")]
        if role:
            available = [a for a in available if a["role"] == role]
        if task_type:
            # prefer agents whose preferred_task_types includes task_type
            preferred = [a for a in available if task_type in (a.get("preferred_task_types") or []) or task_type in ",".join(a.get("preferred_task_types") or [])]
            if preferred:
                return preferred
        return available

    def select_for_task(self, task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        # Heuristic: match owner_role or task title keywords
        title = (task.get("title") or "").lower()
        desc = (task.get("description") or "").lower()
        text = title + " " + desc
        # Determine desired role
        role_map = [
            (["frontend","ui","react","vue"], "frontend_developer"),
            (["backend","api","fastapi"], "backend_developer"),
            (["fullstack","full-stack"], "fullstack_developer"),
            (["mobile","ios","android"], "mobile_developer"),
            (["devops","docker","ci"], "devops_engineer"),
            (["test","qa"], "qa_engineer"),
            (["data","etl","sql"], "data_engineer"),
            (["ml","ai","embedding"], "ml_engineer"),
            (["security","auth"], "security_engineer"),
            (["cloud","aws"], "cloud_engineer"),
            (["architecture","design"], "architect"),
            (["review","tech lead"], "tech_lead"),
            (["docs","readme"], "documentation_writer"),
        ]
        desired_role = None
        for keywords, role in role_map:
            if any(k in text for k in keywords):
                desired_role = role
                break
        # If task has explicit owner_role
        if task.get("owner_role"):
            desired_role = task["owner_role"]
        if task.get("owner_agent_id"):
            ag = self.get_agent(task["owner_agent_id"])
            if ag:
                return ag
        # Find available
        if desired_role:
            candidates = self.get_available(role=desired_role)
            if candidates:
                return candidates[0]
        # Fallback: any available
        avail = self.get_available()
        if avail:
            return avail[0]
        # If none available, pick least busy working? For now return first dormant
        all_agents = self.list_agents()
        dormant = [a for a in all_agents if a["status"]=="dormant"]
        if dormant:
            return dormant[0]
        return None

    def set_status(self, agent_id: str, status: str, current_task_id: str = None):
        fields = {"status": status}
        if current_task_id is not None:
            fields["current_task_id"] = current_task_id
        # also handle clearing task id when dormant
        if status == "dormant":
            fields["current_task_id"] = None
        self.store.update_agent(agent_id, fields)

    def stats(self) -> Dict[str, Any]:
        agents = self.list_agents()
        by_role = {}
        by_status = {}
        for a in agents:
            by_role[a["role"]] = by_role.get(a["role"], 0) + 1
            by_status[a["status"]] = by_status.get(a["status"], 0) + 1
        return {"total": len(agents), "by_role": by_role, "by_status": by_status}

_registry: AgentRegistry | None = None

def get_registry(config=None, store=None) -> AgentRegistry:
    global _registry
    if _registry is None:
        _registry = AgentRegistry(config=config, store=store)
    return _registry
