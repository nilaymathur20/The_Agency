"""Docker tools - via CLI, require approval for run."""
import subprocess
from pathlib import Path
from typing import Dict, Any

def _run(cmd: list, cwd: Path, timeout: int = 60) -> Dict[str, Any]:
    try:
        result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout)
        stdout = result.stdout or ""
        stderr = result.stderr or ""
        if len(stdout) > 500_000:
            stdout = stdout[:500_000] + "\n...[truncated]"
        if len(stderr) > 500_000:
            stderr = stderr[:500_000] + "\n...[truncated]"
        return {"success": result.returncode==0, "stdout": stdout, "stderr": stderr, "exit_code": result.returncode, "error_category": None if result.returncode==0 else "DOCKER_ERROR"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout", "error_category": "TIMEOUT"}
    except FileNotFoundError:
        return {"success": False, "error": "docker not available in this environment", "error_category": "DOCKER_ERROR"}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "DOCKER_ERROR"}

def build_docker_image(workspace_root: Path, dockerfile: str = "Dockerfile", tag: str = "agency-app:latest") -> Dict[str, Any]:
    # docker build -t tag -f dockerfile .
    df_path = workspace_root / dockerfile
    if not df_path.exists():
        return {"success": False, "error": f"Dockerfile not found: {dockerfile}", "error_category": "VALIDATION_ERROR"}
    return _run(["docker", "build", "-t", tag, "-f", str(df_path), "."], cwd=workspace_root, timeout=300)

def run_container(workspace_root: Path, image: str = "agency-app:latest", ports: str = "", name: str = "") -> Dict[str, Any]:
    cmd = ["docker", "run", "-d"]
    if ports:
        # ports like "8000:8000" - split
        for p in ports.split(","):
            p=p.strip()
            if p:
                cmd += ["-p", p]
    if name:
        cmd += ["--name", name]
    cmd.append(image)
    return _run(cmd, cwd=workspace_root, timeout=60)

def stop_container(workspace_root: Path, name: str) -> Dict[str, Any]:
    return _run(["docker", "stop", name], cwd=workspace_root, timeout=30)

def container_logs(workspace_root: Path, name: str, tail: int = 100) -> Dict[str, Any]:
    return _run(["docker", "logs", "--tail", str(tail), name], cwd=workspace_root, timeout=30)

TOOL_SCHEMAS = [
    {"name":"build_docker_image","description":"Build docker image","parameters":{"type":"object","properties":{"dockerfile":{"type":"string","default":"Dockerfile"},"tag":{"type":"string","default":"agency-app:latest"}},"required":[]}},
    {"name":"run_container","description":"Run docker container (requires approval)","parameters":{"type":"object","properties":{"image":{"type":"string","default":"agency-app:latest"},"ports":{"type":"string","default":""},"name":{"type":"string","default":""}},"required":[]}},
    {"name":"stop_container","description":"Stop container","parameters":{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}},
    {"name":"container_logs","description":"Get container logs","parameters":{"type":"object","properties":{"name":{"type":"string"},"tail":{"type":"integer","default":100}},"required":["name"]}},
]
