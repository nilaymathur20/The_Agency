"""
Legacy compatibility shim — re-exports workflow chain.

This file exists so older imports (from agency.chat_chain import ...) keep working.
New code should import from agency.agency_chain.
"""
from .agency_chain import *  # noqa: F401,F403
from .agency_chain import get_chain, build_tasks_from_chain  # noqa: F401
