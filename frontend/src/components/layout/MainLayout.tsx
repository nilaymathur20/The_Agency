import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, NavItem } from './Sidebar';
import './MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  onNavSelect: (id: string) => void;
  isConnected?: boolean;
  provider?: string;
  projectName?: string;
  projectStatus?: string;
}

export function MainLayout({ children, navItems, onNavSelect, isConnected, provider, projectName, projectStatus }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`app-layout ${collapsed ? 'app-layout--collapsed' : ''}`}>
      <Sidebar
        items={navItems}
        onSelect={onNavSelect}
        collapsed={collapsed}
        projectName={projectName}
        status={projectStatus}
      />
      <div style={{ display:'contents' }}>
        <Header isConnected={isConnected} provider={provider} onToggleSidebar={() => setCollapsed(v => !v)} />
        <main className="layout-main" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
