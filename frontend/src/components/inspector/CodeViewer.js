import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import './CodeViewer.css';
export function CodeViewer({ projectId, path }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!path)
            return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.getFile(projectId, path)
            .then(res => { if (!cancelled)
            setContent(res.content); })
            .catch(err => { if (!cancelled)
            setError(err.message); })
            .finally(() => { if (!cancelled)
            setLoading(false); });
        return () => { cancelled = true; };
    }, [projectId, path]);
    if (!path) {
        return _jsx("div", { className: "codeviewer__empty", children: "Select a file to preview its contents." });
    }
    if (loading)
        return _jsxs("div", { className: "codeviewer__empty", children: ["Loading ", path, "\u2026"] });
    if (error)
        return _jsxs("div", { className: "codeviewer__error", children: ["Failed to load file: ", error] });
    return (_jsxs("div", { className: "codeviewer", children: [_jsxs("div", { className: "codeviewer__bar", children: [_jsx("span", { className: "codeviewer__path mono", children: path }), _jsx("button", { className: "codeviewer__copy", onClick: () => navigator.clipboard.writeText(content), children: "Copy" })] }), _jsx("pre", { className: "codeviewer__pre", children: _jsx("code", { children: content }) })] }));
}
