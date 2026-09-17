import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Button Component */
/* Content guidance: Labels should be verbs (Create task, Save changes, Cancel task) */
/* Keyboard: Enter/Space activates, Tab navigates, one primary button per action region */
import { forwardRef } from 'react';
import { classnames } from '../../utils/classnames';
import './Button.css';
export const Button = forwardRef(({ variant = 'primary', size = 'md', isLoading = false, icon, children, fullWidth = false, className, disabled, ...props }, ref) => {
    const isDisabled = disabled || isLoading;
    return (_jsxs("button", { ref: ref, className: classnames('btn', `btn--${variant}`, `btn--${size}`, fullWidth && 'btn--full', isDisabled && 'btn--disabled', isLoading && 'btn--loading', className), disabled: isDisabled, "aria-busy": isLoading, ...props, children: [icon && _jsx("span", { className: "btn__icon", children: icon }), children && _jsx("span", { className: "btn__label", children: children }), isLoading && _jsx("span", { className: "btn__spinner", "aria-hidden": "true" })] }));
});
Button.displayName = 'Button';
