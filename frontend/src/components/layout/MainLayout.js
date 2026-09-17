import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './MainLayout.css';
export function MainLayout({ children, navItems, onNavSelect, isConnected, provider, projectName, projectStatus }) {
    const [collapsed, setCollapsed] = useState(false);
    return (_jsxs("div", { className: `app-layout ${collapsed ? 'app-layout--collapsed' : ''}`, children: [_jsx(Sidebar, { items: navItems, onSelect: onNavSelect, collapsed: collapsed, projectName: projectName, status: projectStatus }), _jsxs("div", { style: { display: 'contents' }, children: [_jsx(Header, { isConnected: isConnected, provider: provider, onToggleSidebar: () => setCollapsed(v => !v) }), _jsx("main", { className: "layout-main", role: "main", children: children })] })] }));
}
