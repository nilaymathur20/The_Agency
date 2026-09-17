"""Web Scraper Tool - Fetch web content for research and reference"""
import json
import re
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any

TOOL_SCHEMAS = [
    {
        "name": "fetch_url",
        "description": "Fetch content from a URL. Returns HTML/text content, useful for scraping documentation, references, or web research.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The URL to fetch"},
                "extract_type": {"type": "string", "enum": ["html", "text", "markdown", "links"], "description": "What to extract from the page", "default": "text"}
            },
            "required": ["url"]
        }
    },
    {
        "name": "search_web",
        "description": "Search the web for information. Returns search results with titles and snippets.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "num_results": {"type": "integer", "description": "Number of results to return", "default": 5}
            },
            "required": ["query"]
        }
    }
]

def fetch_url(ws_root: Path, url: str, extract_type: str = "text", timeout: int = 30) -> Dict[str, Any]:
    """Fetch content from a URL"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if not parsed.scheme:
            return {"success": False, "error": "Invalid URL - missing scheme (http/https)"}
        if parsed.scheme not in ("http", "https"):
            return {"success": False, "error": f"Unsupported scheme: {parsed.scheme}"}
    except Exception as e:
        return {"success": False, "error": f"URL parse error: {str(e)}"}

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; AI-Agency/1.0; Research Bot)"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            content = response.read().decode("utf-8", errors="ignore")
            content_type = response.headers.get("Content-Type", "")

        if extract_type == "html":
            return {
                "success": True,
                "content": content[:50000],
                "content_type": content_type,
                "url": url
            }

        elif extract_type == "text":
            # Basic HTML to text conversion
            text = re.sub(r"<script[^>]*>.*?</script>", "", content, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text)
            text = text.strip()

            return {
                "success": True,
                "content": text[:50000],
                "url": url
            }

        elif extract_type == "markdown":
            # Simple HTML to markdown-like conversion
            md = content
            md = re.sub(r"<h1[^>]*>(.*?)</h1>", r"# \1\n\n", md, flags=re.DOTALL | re.IGNORECASE)
            md = re.sub(r"<h2[^>]*>(.*?)</h2>", r"## \1\n\n", md, flags=re.DOTALL | re.IGNORECASE)
            md = re.sub(r"<h3[^>]*>(.*?)</h3>", r"### \1\n\n", md, flags=re.DOTALL | re.IGNORECASE)
            md = re.sub(r"<p[^>]*>(.*?)</p>", r"\1\n\n", md, flags=re.DOTALL | re.IGNORECASE)
            md = re.sub(r"<a[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", r"[\2](\1)", md, flags=re.DOTALL | re.IGNORECASE)
            md = re.sub(r"<[^>]+>", "", md)
            md = re.sub(r"\n{3,}", "\n\n", md)

            return {
                "success": True,
                "content": md[:50000],
                "url": url
            }

        elif extract_type == "links":
            # Extract all links
            link_pattern = r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]*)</a>'
            links = re.findall(link_pattern, content, re.IGNORECASE)
            unique_links = {}
            for href, text in links:
                if href.startswith(("http://", "https://")):
                    unique_links[href] = text.strip() if text.strip() else href

            return {
                "success": True,
                "links": list(unique_links.items())[:50],
                "count": len(unique_links),
                "url": url
            }

        return {"success": True, "content": content[:50000], "url": url}

    except urllib.error.HTTPError as e:
        return {"success": False, "error": f"HTTP Error {e.code}: {e.reason}"}
    except urllib.error.URLError as e:
        return {"success": False, "error": f"URL Error: {str(e.reason)}"}
    except Exception as e:
        return {"success": False, "error": f"Fetch error: {str(e)}"}


def search_web(ws_root: Path, query: str, num_results: int = 5) -> Dict[str, Any]:
    """Search the web using DuckDuckGo (no API key required)"""
    try:
        import urllib.parse
        encoded_query = urllib.parse.quote_plus(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded_query}"

        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode("utf-8", errors="ignore")

        # Parse results
        results = []
        result_pattern = r'<a class="result__a" href="[^"]*&q=([^&"]+)[^"]*"[^>]*>(.*?)</a>'
        matches = re.findall(result_pattern, html, re.DOTALL)

        for match in matches[:num_results]:
            url_decoded = urllib.parse.unquote(match[0])
            title = re.sub(r'<[^>]+>', '', match[1]).strip()
            if title and url_decoded:
                results.append({
                    "title": title,
                    "url": url_decoded
                })

        if not results:
            # Fallback: try to find any links
            link_pattern = r'<a rel="nofollow" class="result__url"[^>]*>(.*?)</a>'
            links = re.findall(link_pattern, html, re.DOTALL)
            for link in links[:num_results]:
                link = link.strip()
                if link.startswith("http"):
                    results.append({
                        "title": link,
                        "url": link
                    })

        return {
            "success": True,
            "query": query,
            "results": results[:num_results],
            "count": len(results)
        }

    except Exception as e:
        return {"success": False, "error": f"Search error: {str(e)}"}