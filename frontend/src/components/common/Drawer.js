import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Drawer Component */
/* Content guidance: Header with record type, monospace id, name; body with dividers; footer action bar */
import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Drawer.css';
export function Drawer({ isOpen, onClose, title, id, subtitle, children, footer, width = 420 }) {
    const drawerRef = useRef(null);
    const triggerRef = useRef(null);
    // Focus trap and Escape handling
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
            return;
        }
        if (e.key === 'Tab' && drawerRef.current) {
            const focusableElements = drawerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            }
            else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        }
    }, [onClose]);
    useEffect(() => {
        if (isOpen) {
            // Store the trigger element to return focus later
            triggerRef.current = document.activeElement;
            // Add event listeners
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
            // Focus the first focusable element in drawer
            setTimeout(() => {
                const firstFocusable = drawerRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                firstFocusable?.focus();
            }, 0);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            // Return focus to trigger
            triggerRef.current?.focus();
        };
    }, [isOpen, handleKeyDown]);
    if (!isOpen)
        return null;
    return createPortal(_jsx("div", { className: "drawer-overlay", onClick: onClose, role: "presentation", children: _jsxs("div", { ref: drawerRef, className: "drawer", onClick: (e) => e.stopPropagation(), role: "dialog", "aria-modal": "true", "aria-labelledby": "drawer-title", style: { width }, children: [_jsxs("header", { className: "drawer__header", children: [_jsxs("div", { className: "drawer__header-content", children: [_jsx("h2", { id: "drawer-title", className: "drawer__title", children: title }), _jsx("span", { className: "drawer__id", children: id }), subtitle && _jsx("p", { className: "drawer__subtitle", children: subtitle })] }), _jsx("button", { className: "drawer__close", onClick: onClose, "aria-label": "Close drawer", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M15 5L5 15M5 5l10 10" }) }) })] }), _jsx("div", { className: "drawer__body", children: children }), footer && (_jsx("footer", { className: "drawer__footer", children: footer }))] }) }), document.body);
}
