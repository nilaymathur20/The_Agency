import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { classnames } from '../../utils/classnames';
import './Metric.css';
export function Metric({ label, value, unit, timeWindow, delta, className }) {
    return (_jsxs("div", { className: classnames('metric', className), children: [_jsx("span", { className: "metric__label", children: label }), _jsxs("div", { className: "metric__value-row", children: [_jsxs("span", { className: "metric__value", children: [value, unit && _jsx("span", { className: "metric__unit", children: unit })] }), delta && (_jsxs("span", { className: classnames('metric__delta', `metric__delta--${delta.direction}`), children: [delta.direction === 'up' ? '+' : '-', Math.abs(delta.value), " ", delta.comparison] }))] }), timeWindow && _jsx("span", { className: "metric__time", children: timeWindow })] }));
}
