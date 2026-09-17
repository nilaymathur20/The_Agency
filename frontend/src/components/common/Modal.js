import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Modal Component */
/* Content guidance: Title states decision, body states consequence with exact affected count */
import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { classnames } from '../../utils/classnames';
import './Modal.css';
export function Modal({ isOpen, onClose, title, children, footer, variant = 'default' }) {
    const modalRef = useRef(null);
    const triggerRef = useRef(null);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
            return;
        }
        if (e.key === 'Tab' && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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
            triggerRef.current = document.activeElement;
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                const firstFocusable = modalRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                firstFocusable?.focus();
            }, 0);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            triggerRef.current?.focus();
        };
    }, [isOpen, handleKeyDown]);
    if (!isOpen)
        return null;
    return createPortal(_jsx("div", { className: "modal-overlay", onClick: onClose, role: "presentation", children: _jsxs("div", { ref: modalRef, className: classnames('modal', `modal--${variant}`), onClick: (e) => e.stopPropagation(), role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-title", children: [_jsxs("header", { className: "modal__header", children: [_jsx("h2", { id: "modal-title", className: "modal__title", children: title }), _jsx("button", { className: "modal__close", onClick: onClose, "aria-label": "Close", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M15 5L5 15M5 5l10 10" }) }) })] }), _jsx("div", { className: "modal__body", children: children }), footer && (_jsx("footer", { className: "modal__footer", children: footer }))] }) }), document.body);
}
