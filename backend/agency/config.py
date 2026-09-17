"""Configuration loader: config/*.yaml + env (.env) + per-role OpenRouter models."""
import os
import yaml
from pathlib import Path
from typing import Any, Dict

# Load .env first (like Agency Chain's API config) — do not fail if missing
try:
    from dotenv import load_dotenv
    # Search for .env at project root (parent of backend)
    _project_root = Path(__file__).parent.parent.parent
    load_dotenv(_project_root / ".env", override=False)
    load_dotenv(_project_root / ".env.example", override=False)
except ImportError:
    pass

CONFIG_DIR = Path(__file__).parent.parent.parent / "config"

DEFAULTS = {
    "agency": {
        "max_active_agents": 12,
        "max_tool_calls_per_task": 100,
        "max_task_runtime_seconds": 3600,
        "max_retries": 3,
        "repair_loop_limit": 3,
    },
    "workspace": {"root": "./workspace/projects"},
    "models": {"provider": "mock", "default_policy": "balanced"},
    "security": {"sandbox_required": True, "network_default": False},
}

def _load_yaml(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    with open(path, "r") as f:
        data = yaml.safe_load(f) or {}
        return data

class AgencyConfig:
    def __init__(self, config_dir: Path | None = None):
        self.config_dir = Path(config_dir) if config_dir else CONFIG_DIR
        self.agency = {}
        self.workspace = {}
        self.models = {}
        self.security = {}
        self.limits = {}
        self.tools = {}
        self.model_policies = {}
        self.agents = []
        self.agency_chain = {}
        self._load()

    def _load(self):
        # agency.yaml
        agency_cfg = _load_yaml(self.config_dir / "agency.yaml")
        for k, v in DEFAULTS.items():
            cfg = agency_cfg.get(k, v) if isinstance(agency_cfg.get(k), dict) else agency_cfg.get(k, v)
            if isinstance(v, dict) and isinstance(cfg, dict):
                merged = {**v, **cfg}
                setattr(self, k, merged)
            else:
                setattr(self, k, cfg if cfg is not None else v)

        if "agency" in agency_cfg:
            self.agency = {**DEFAULTS["agency"], **agency_cfg["agency"]}
        if "workspace" in agency_cfg:
            self.workspace = {**DEFAULTS["workspace"], **agency_cfg["workspace"]}
        if "models" in agency_cfg:
            self.models = {**DEFAULTS["models"], **agency_cfg["models"]}
        if "security" in agency_cfg:
            self.security = agency_cfg["security"]

        # limits.yaml
        limits_cfg = _load_yaml(self.config_dir / "limits.yaml")
        self.limits = limits_cfg.get("limits", limits_cfg)

        # tools.yaml
        tools_cfg = _load_yaml(self.config_dir / "tools.yaml")
        self.tools = tools_cfg.get("tools", tools_cfg)

        # security.yaml
        sec_cfg = _load_yaml(self.config_dir / "security.yaml")
        if sec_cfg:
            sec_data = sec_cfg.get("security", sec_cfg)
            for kk, vv in sec_data.items():
                self.security[kk] = vv
            self.security_config = sec_data
        else:
            self.security_config = self.security

        # model_policies.yaml
        mp = _load_yaml(self.config_dir / "model_policies.yaml")
        self.model_policies = mp.get("policies", {})
        self.models_meta = mp.get("models", {})

        # agents.yaml
        agents_cfg = _load_yaml(self.config_dir / "agents.yaml")
        self.agents = agents_cfg.get("agents", [])

        # agency_chain.yaml (Agency Chain) — optional
        cc = _load_yaml(self.config_dir / "agency_chain.yaml")
        if not cc:
            # legacy fallback
            cc = _load_yaml(self.config_dir / "chat_chain.yaml")
        self.agency_chain = cc.get("chain", cc) if cc else {}
        # Also support workflow_templates-style folder
        workflow_templates = self.config_dir / "workflow_templates"
        if workflow_templates.exists():
            self.yaml_templates = list(workflow_templates.glob("*.yaml"))
        else:
            self.yaml_templates = []

        # ── Env overrides (Collaborative Workflow .env) ──
        # OpenRouter as unified provider for ALL agents (Agency Chain used OpenAI; we use OpenRouter)
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self.openrouter_referer = os.getenv("OPENROUTER_REFERER", "http://localhost:8000")
        self.openrouter_title = os.getenv("OPENROUTER_TITLE", "AI Agency - Agency Chain")

        # Per-role model mapping via env (like Agency Chain's model assignment per agent)
        # MODEL_CEO, MODEL_CTO, etc. — fallback to model_policies.yaml
        self.role_models: Dict[str, str] = {}
        for role in ["CEO","CTO","CPO","PROGRAMMER","REVIEWER","TESTER","DEFAULT"]:
            env_key = f"MODEL_{role}"
            val = os.getenv(env_key)
            if val:
                self.role_models[role.lower()] = val
        # Also support lower-case variant
        for k,v in os.environ.items():
            if k.startswith("MODEL_") and k not in ["MODEL_CEO","MODEL_CTO","MODEL_PROGRAMMER","MODEL_REVIEWER","MODEL_TESTER","MODEL_CPO","MODEL_DEFAULT"]:
                self.role_models[k[6:].lower()] = v

        if os.getenv("WORKSPACE_ROOT"):
            self.workspace["root"] = os.getenv("WORKSPACE_ROOT")
        if os.getenv("AGENCY_DATABASE_URL"):
            self.database_url = os.getenv("AGENCY_DATABASE_URL")
        else:
            self.database_url = None

        # Workflow chain toggles (generic, with legacy compat)
        _max_turns = os.getenv("WORKFLOW_MAX_TURNS") or os.getenv("AGENCY_CHAIN_MAX_TURNS") or "8"
        self.workflow_max_turns = int(_max_turns)
        # keep legacy aliases
        self.agency_chain_max_turns = self.workflow_max_turns
        # legacy alias
        _clar = os.getenv("WORKFLOW_CLARIFICATION") or os.getenv("AGENCY_CHAIN_CLARIFICATION") or "true"
        self.workflow_clarification = _clar.lower() not in ("0","false","no")
        self.agency_chain_clarification = self.workflow_clarification
        # legacy alias

        # Resolve workspace root
        ws_root = self.workspace.get("root", "./workspace/projects")
        if not os.path.isabs(ws_root):
            project_root = Path(__file__).parent.parent.parent
            self.workspace_root = (project_root / ws_root).resolve()
        else:
            self.workspace_root = Path(ws_root).resolve()

        # provider
        self.provider = self.models.get("provider", "mock")
        if os.getenv("AGENCY_PROVIDER"):
            self.provider = os.getenv("AGENCY_PROVIDER")

    def get_model_policy(self, name: str) -> Dict[str, Any]:
        return self.model_policies.get(name, self.model_policies.get("balanced", {}))

    def get_model_for_role(self, role: str) -> str | None:
        """Collaborative Workflow: get OpenRouter model for a specific role (ceo/cto/programmer...)."""
        if not role:
            return None
        # direct role mapping
        if role.lower() in self.role_models:
            return self.role_models[role.lower()]
        # try without suffix like backend_developer -> programmer?
        mapping = {
            "architect": "cto",
            "backend_developer": "programmer",
            "frontend_developer": "programmer",
            "fullstack_developer": "programmer",
            "qa_engineer": "tester",
            "security_engineer": "reviewer",
            "tech_lead": "cto",
            "engineering_manager": "ceo",
        }
        mapped = mapping.get(role.lower())
        if mapped and mapped in self.role_models:
            return self.role_models[mapped]
        # fallback to default
        return self.role_models.get("default")

    def get_agent_definitions(self):
        return self.agents

_config: AgencyConfig | None = None

def get_config(config_dir: Path | None = None) -> AgencyConfig:
    global _config
    if _config is None or config_dir is not None:
        _config = AgencyConfig(config_dir=config_dir)
    return _config

def reload_config(config_dir: Path | None = None) -> AgencyConfig:
    global _config
    _config = AgencyConfig(config_dir=config_dir)
    return _config
