import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { classnames } from '../../utils/classnames';
import './Badge.css';
export function Badge({ variant, children, className, icon }) {
    return (_jsxs("span", { className: classnames('badge', `badge--${variant}`, className), children: [icon && _jsx("span", { className: "badge__icon", "aria-hidden": "true", children: icon }), _jsx("span", { className: "badge__label", children: children })] }));
}
