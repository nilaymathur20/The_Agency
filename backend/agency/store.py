"""SQLite control-plane store - separate from application DBs. Implements DATABASE_SCHEMA.md"""
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import threading

DB_PATH = Path(__file__).parent.parent.parent / "workspace" / "agency.db"

def _now() -> str:
    return datetime.utcnow().isoformat()

class Store:
    def __init__(self, db_path: Path | None = None):
        self.db_path = Path(db_path) if db_path else DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._init_db()

    def _connect(self):
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            # projects
            cur.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                workspace_path TEXT,
                status TEXT,
                requirements TEXT,
                created_at TEXT,
                updated_at TEXT
            )""")
            # agents
            cur.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                role TEXT,
                status TEXT,
                model_policy TEXT,
                current_task_id TEXT,
                skills TEXT,
                tools TEXT,
                permissions TEXT,
                created_at TEXT,
                updated_at TEXT
            )""")
            # tasks
            cur.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                parent_task_id TEXT,
                title TEXT,
                description TEXT,
                owner_agent_id TEXT,
                owner_role TEXT,
                status TEXT,
                priority TEXT,
                acceptance_criteria TEXT,
                dependencies TEXT,
                retry_count INTEGER,
                files_changed TEXT,
                report TEXT,
                error TEXT,
                created_at TEXT,
                started_at TEXT,
                completed_at TEXT,
                chat_chain_phase TEXT,
                instructor TEXT,
                assistant TEXT
            )""")
            # migrate: add ChatDev columns if missing on old DB
            for col, typ in [("chat_chain_phase","TEXT"),("instructor","TEXT"),("assistant","TEXT")]:
                try:
                    cur.execute(f"ALTER TABLE tasks ADD COLUMN {col} {typ}")
                except sqlite3.OperationalError:
                    pass  # already exists
            cur.execute("""
            CREATE TABLE IF NOT EXISTS task_dependencies (
                task_id TEXT,
                depends_on_task_id TEXT,
                PRIMARY KEY (task_id, depends_on_task_id)
            )""")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS task_events (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                project_id TEXT,
                agent_id TEXT,
                event_type TEXT,
                payload TEXT,
                created_at TEXT
            )""")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS agent_messages (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                task_id TEXT,
                from_agent TEXT,
                to_agent TEXT,
                message_type TEXT,
                payload TEXT,
                created_at TEXT
            )""")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS model_requests (
                id TEXT PRIMARY KEY,
                agent_id TEXT,
                task_id TEXT,
                project_id TEXT,
                model TEXT,
                status TEXT,
                latency_ms INTEGER,
                input_tokens INTEGER,
                output_tokens INTEGER,
                error TEXT,
                created_at TEXT
            )""")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS tool_executions (
                id TEXT PRIMARY KEY,
                agent_id TEXT,
                task_id TEXT,
                project_id TEXT,
                tool TEXT,
                arguments TEXT,
                result TEXT,
                status TEXT,
                duration_ms INTEGER,
                created_at TEXT
            )""")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                task_id TEXT,
                requested_by TEXT,
                operation TEXT,
                status TEXT,
                reason TEXT,
                approved_by TEXT,
                payload TEXT,
                created_at TEXT
            )""")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS checkpoints (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                git_commit TEXT,
                description TEXT,
                created_at TEXT
            )""")
            conn.commit()
            conn.close()

    # ---------- Projects ----------
    def create_project(self, project: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("INSERT INTO projects (id,name,description,workspace_path,status,requirements,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
                        (project["id"], project["name"], project.get("description"), project.get("workspace_path"), project.get("status","created"), project.get("requirements"), project.get("created_at", _now()), project.get("updated_at", _now())))
            conn.commit()
            conn.close()
        return project

    def get_project(self, pid: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects WHERE id=?", (pid,))
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None

    def list_projects(self) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects ORDER BY created_at DESC")
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def update_project(self, pid: str, fields: Dict[str, Any]):
        if not fields:
            return
        fields["updated_at"] = _now()
        sets = ", ".join([f"{k}=?" for k in fields.keys()])
        vals = list(fields.values()) + [pid]
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute(f"UPDATE projects SET {sets} WHERE id=?", vals)
            conn.commit()
            conn.close()

    # ---------- Tasks ----------
    def create_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        # store dependencies as JSON, also in task_dependencies — now with ChatDev fields
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("""INSERT INTO tasks
                (id,project_id,parent_task_id,title,description,owner_agent_id,owner_role,status,priority,acceptance_criteria,dependencies,retry_count,files_changed,report,error,created_at,started_at,completed_at,chat_chain_phase,instructor,assistant)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (task["id"], task["project_id"], task.get("parent_task_id"), task["title"], task.get("description"), task.get("owner_agent_id"), task.get("owner_role"), task.get("status","queued"), task.get("priority","medium"),
                 json.dumps(task.get("acceptance_criteria",[])), json.dumps(task.get("dependencies",[])), task.get("retry_count",0), json.dumps(task.get("files_changed",[])), json.dumps(task.get("report")) if task.get("report") else None, task.get("error"), task.get("created_at", _now()), task.get("started_at"), task.get("completed_at"),
                 task.get("chat_chain_phase"), task.get("instructor"), task.get("assistant")))
            # dependencies table
            for dep in task.get("dependencies", []):
                try:
                    cur.execute("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?,?)", (task["id"], dep))
                except sqlite3.IntegrityError:
                    pass
            conn.commit()
            conn.close()
        return task

    def get_task(self, tid: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM tasks WHERE id=?", (tid,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        # parse json fields
        for k in ["acceptance_criteria","dependencies","files_changed","report"]:
            if d.get(k):
                try:
                    d[k] = json.loads(d[k]) if isinstance(d[k], str) else d[k]
                except:
                    pass
            else:
                if k in ["acceptance_criteria","dependencies","files_changed"]:
                    d[k] = []
        return d

    def list_tasks(self, project_id: str) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM tasks WHERE project_id=? ORDER BY created_at ASC", (project_id,))
        rows = cur.fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            for k in ["acceptance_criteria","dependencies","files_changed","report"]:
                if d.get(k):
                    try:
                        d[k] = json.loads(d[k]) if isinstance(d[k], str) else d[k]
                    except:
                        pass
                else:
                    if k in ["acceptance_criteria","dependencies","files_changed"]:
                        d[k] = []
            result.append(d)
        return result

    def update_task(self, tid: str, fields: Dict[str, Any]):
        if not fields:
            return
        # handle json fields
        json_fields = {"acceptance_criteria","dependencies","files_changed","report"}
        db_fields = {}
        for k,v in fields.items():
            if k in json_fields:
                db_fields[k] = json.dumps(v) if v is not None else None
            else:
                db_fields[k] = v
        sets = ", ".join([f"{k}=?" for k in db_fields.keys()])
        vals = list(db_fields.values()) + [tid]
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute(f"UPDATE tasks SET {sets} WHERE id=?", vals)
            # update dependencies table if dependencies changed
            if "dependencies" in fields:
                cur.execute("DELETE FROM task_dependencies WHERE task_id=?", (tid,))
                for dep in fields["dependencies"]:
                    try:
                        cur.execute("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?,?)", (tid, dep))
                    except sqlite3.IntegrityError:
                        pass
            conn.commit()
            conn.close()

    def list_tasks_by_status(self, statuses: List[str]) -> List[Dict[str, Any]]:
        if not statuses:
            return []
        placeholders = ",".join(["?"]*len(statuses))
        conn = self._connect()
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM tasks WHERE status IN ({placeholders})", statuses)
        rows = cur.fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            for k in ["acceptance_criteria","dependencies","files_changed","report"]:
                if d.get(k):
                    try:
                        d[k] = json.loads(d[k]) if isinstance(d[k], str) else d[k]
                    except:
                        pass
                else:
                    if k in ["acceptance_criteria","dependencies","files_changed"]:
                        d[k] = []
            result.append(d)
        return result

    # ---------- Agents ----------
    def upsert_agent(self, agent: Dict[str, Any]):
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            # check exists
            cur.execute("SELECT id FROM agents WHERE id=?", (agent["id"],))
            exists = cur.fetchone()
            if exists:
                cur.execute("UPDATE agents SET role=?, status=?, model_policy=?, current_task_id=?, skills=?, tools=?, permissions=?, updated_at=? WHERE id=?",
                            (agent["role"], agent.get("status","dormant"), agent.get("model_policy","balanced"), agent.get("current_task_id"), json.dumps(agent.get("skills",[])), json.dumps(agent.get("tools",[])), json.dumps(agent.get("permissions",[])), _now(), agent["id"]))
            else:
                cur.execute("INSERT INTO agents (id,role,status,model_policy,current_task_id,skills,tools,permissions,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            (agent["id"], agent["role"], agent.get("status","dormant"), agent.get("model_policy","balanced"), agent.get("current_task_id"), json.dumps(agent.get("skills",[])), json.dumps(agent.get("tools",[])), json.dumps(agent.get("permissions",[])), _now(), _now()))
            conn.commit()
            conn.close()

    def get_agent(self, aid: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM agents WHERE id=?", (aid,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        for k in ["skills","tools","permissions"]:
            if d.get(k):
                try:
                    d[k] = json.loads(d[k])
                except:
                    d[k] = []
        return d

    def list_agents(self) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM agents ORDER BY role, id")
        rows = cur.fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            for k in ["skills","tools","permissions"]:
                if d.get(k):
                    try:
                        d[k] = json.loads(d[k])
                    except:
                        d[k] = []
            result.append(d)
        return result

    def update_agent(self, aid: str, fields: Dict[str, Any]):
        if not fields:
            return
        # handle json
        db_fields = {}
        for k,v in fields.items():
            if k in ["skills","tools","permissions"]:
                db_fields[k] = json.dumps(v)
            else:
                db_fields[k] = v
        db_fields["updated_at"] = _now()
        sets = ", ".join([f"{k}=?" for k in db_fields.keys()])
        vals = list(db_fields.values()) + [aid]
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute(f"UPDATE agents SET {sets} WHERE id=?", vals)
            conn.commit()
            conn.close()

    # ---------- Events ----------
    def add_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("INSERT INTO task_events (id,task_id,project_id,agent_id,event_type,payload,created_at) VALUES (?,?,?,?,?,?,?)",
                        (event["id"], event.get("task_id"), event.get("project_id"), event.get("agent_id"), event.get("event_type"), json.dumps(event.get("payload",{})), event.get("created_at", _now())))
            conn.commit()
            conn.close()
        return event

    def list_events(self, project_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM task_events WHERE project_id=? ORDER BY created_at DESC LIMIT ?", (project_id, limit))
        rows = cur.fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["payload"] = json.loads(d["payload"]) if d["payload"] else {}
            except:
                d["payload"] = {}
            result.append(d)
        # return chronological
        result.reverse()
        return result

    # ---------- Model requests ----------
    def add_model_request(self, req: Dict[str, Any]):
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("INSERT INTO model_requests (id,agent_id,task_id,project_id,model,status,latency_ms,input_tokens,output_tokens,error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        (req["id"], req.get("agent_id"), req.get("task_id"), req.get("project_id"), req.get("model"), req.get("status"), req.get("latency_ms",0), req.get("input_tokens"), req.get("output_tokens"), req.get("error"), req.get("created_at", _now())))
            conn.commit()
            conn.close()

    # ---------- Tool executions ----------
    def add_tool_execution(self, rec: Dict[str, Any]):
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("INSERT INTO tool_executions (id,agent_id,task_id,project_id,tool,arguments,result,status,duration_ms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        (rec["id"], rec.get("agent_id"), rec.get("task_id"), rec.get("project_id"), rec.get("tool"), json.dumps(rec.get("arguments",{})), json.dumps(rec.get("result",{})), rec.get("status","success"), rec.get("duration_ms",0), rec.get("created_at", _now())))
            conn.commit()
            conn.close()

    def list_tool_executions(self, project_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM tool_executions WHERE project_id=? ORDER BY created_at DESC LIMIT ?", (project_id, limit))
        rows = cur.fetchall()
        conn.close()
        res = []
        for r in rows:
            d = dict(r)
            try:
                d["arguments"] = json.loads(d["arguments"]) if d["arguments"] else {}
                d["result"] = json.loads(d["result"]) if d["result"] else {}
            except:
                pass
            res.append(d)
        return res

    # ---------- Approvals ----------
    def create_approval(self, appr: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("INSERT INTO approvals (id,project_id,task_id,requested_by,operation,status,reason,approved_by,payload,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        (appr["id"], appr["project_id"], appr.get("task_id"), appr.get("requested_by"), appr["operation"], appr.get("status","pending"), appr.get("reason"), appr.get("approved_by"), json.dumps(appr.get("payload",{})), appr.get("created_at", _now())))
            conn.commit()
            conn.close()
        return appr

    def get_approval(self, aid: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM approvals WHERE id=?", (aid,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        try:
            d["payload"] = json.loads(d["payload"]) if d["payload"] else {}
        except:
            d["payload"] = {}
        return d

    def list_approvals(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        if status:
            cur.execute("SELECT * FROM approvals WHERE status=? ORDER BY created_at DESC", (status,))
        else:
            cur.execute("SELECT * FROM approvals ORDER BY created_at DESC")
        rows = cur.fetchall()
        conn.close()
        res = []
        for r in rows:
            d = dict(r)
            try:
                d["payload"] = json.loads(d["payload"]) if d["payload"] else {}
            except:
                d["payload"] = {}
            res.append(d)
        return res

    def update_approval(self, aid: str, fields: Dict[str, Any]):
        if not fields:
            return
        db_fields = {}
        for k,v in fields.items():
            if k == "payload":
                db_fields[k] = json.dumps(v)
            else:
                db_fields[k] = v
        sets = ", ".join([f"{k}=?" for k in db_fields.keys()])
        vals = list(db_fields.values()) + [aid]
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute(f"UPDATE approvals SET {sets} WHERE id=?", vals)
            conn.commit()
            conn.close()

    # ---------- Checkpoints ----------
    def create_checkpoint(self, cp: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("INSERT INTO checkpoints (id,project_id,git_commit,description,created_at) VALUES (?,?,?,?,?)",
                        (cp["id"], cp["project_id"], cp.get("git_commit"), cp.get("description"), cp.get("created_at", _now())))
            conn.commit()
            conn.close()
        return cp

    def list_checkpoints(self, project_id: str) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM checkpoints WHERE project_id=? ORDER BY created_at DESC", (project_id,))
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    # ---------- Messages ----------
    def add_message(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("INSERT INTO agent_messages (id,project_id,task_id,from_agent,to_agent,message_type,payload,created_at) VALUES (?,?,?,?,?,?,?,?)",
                        (msg["id"], msg["project_id"], msg.get("task_id"), msg["from_agent"], msg["to_agent"], msg["message_type"], json.dumps(msg.get("payload",{})), msg.get("created_at", _now())))
            conn.commit()
            conn.close()
        return msg

    def list_messages(self, project_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM agent_messages WHERE project_id=? ORDER BY created_at DESC LIMIT ?", (project_id, limit))
        rows = cur.fetchall()
        conn.close()
        res = []
        for r in rows:
            d = dict(r)
            try:
                d["payload"] = json.loads(d["payload"]) if d["payload"] else {}
            except:
                d["payload"] = {}
            res.append(d)
        res.reverse()
        return res

# singleton
_store: Store | None = None

def get_store(db_path: Path | None = None) -> Store:
    global _store
    if _store is None or db_path is not None:
        _store = Store(db_path=db_path)
    return _store
