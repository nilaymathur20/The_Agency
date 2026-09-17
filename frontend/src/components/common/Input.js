import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { classnames } from '../../utils/classnames';
import './Input.css';
export const Input = forwardRef(({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
    return (_jsxs("div", { className: classnames('input-group', className), children: [label && _jsx("label", { htmlFor: inputId, className: "input__label", children: label }), _jsx("input", { ref: ref, id: inputId, className: classnames('input', error && 'input--error'), "aria-invalid": !!error, "aria-describedby": error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined, ...props }), error && _jsx("div", { id: `${inputId}-error`, className: "input__error", role: "alert", children: error }), hint && !error && _jsx("div", { id: `${inputId}-hint`, className: "input__hint", children: hint })] }));
});
Input.displayName = 'Input';
