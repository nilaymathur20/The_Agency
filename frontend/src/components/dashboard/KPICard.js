import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { Tooltip } from '../common/Tooltip';
import { classnames } from '../../utils/classnames';
import './KPICard.css';
export const KPICard = React.forwardRef(({ label, value, trend, definition, onClick, isLoading = false, variant = 'default' }, ref) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const handleInfoClick = useCallback((e) => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
    }, [showTooltip]);
    const trendColor = trend
        ? trend.direction === 'up' ? 'trend--positive' : trend.direction === 'down' ? 'trend--negative' : 'trend--neutral'
        : '';
    return (_jsxs("div", { ref: ref, className: classnames('kpi-card', `kpi-card--${variant}`, isLoading && 'kpi-card--loading', onClick && 'kpi-card--clickable'), onClick: onClick, role: "region", "aria-label": label, children: [_jsxs("div", { className: "kpi-card__header", children: [_jsx("span", { className: "kpi-card__label", children: label }), definition && (_jsx(Tooltip, { content: definition, isOpen: showTooltip, onToggle: () => setShowTooltip(!showTooltip), children: _jsx("button", { className: "kpi-card__info", onClick: handleInfoClick, "aria-label": `More info about ${label}`, type: "button", children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 16 16", children: [_jsx("circle", { cx: "8", cy: "8", r: "7", fill: "none", stroke: "currentColor", strokeWidth: "1.2" }), _jsx("text", { x: "8", y: "11", textAnchor: "middle", fontSize: "9", fontWeight: "700", children: "?" })] }) }) }))] }), _jsx("div", { className: classnames('kpi-card__value', isLoading && 'skeleton'), children: isLoading ? '—' : value }), trend && (_jsxs("div", { className: classnames('kpi-card__trend', trendColor), children: [_jsx("svg", { width: "12", height: "12", viewBox: "0 0 16 16", "aria-hidden": "true", children: _jsx("polyline", { points: trend.direction === 'up' ? '4,10 8,6 12,10' : '4,6 8,10 12,6', fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) }), _jsxs("span", { children: [trend.direction === 'up' ? '+' : '', trend.percentage, "% vs ", trend.period] })] }))] }));
});
KPICard.displayName = 'KPICard';
