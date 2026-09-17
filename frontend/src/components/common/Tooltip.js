import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import './Tooltip.css';
export function Tooltip({ content, children, isOpen, onToggle, position = 'top' }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = isOpen ?? internalOpen;
    const toggle = onToggle ?? (() => setInternalOpen(v => !v));
    return (_jsxs("span", { className: "tooltip__wrapper", onMouseEnter: () => setInternalOpen(true), onMouseLeave: () => setInternalOpen(false), children: [_jsx("span", { onClick: toggle, role: "button", tabIndex: 0, onKeyDown: e => e.key === 'Enter' && toggle(), children: children }), open && _jsx("span", { className: `tooltip tooltip--${position}`, role: "tooltip", children: content })] }));
}
