import React from 'react';
import { Icon } from '../common/Icon';
import './Sidebar.css';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
  active?: boolean;
}

interface SidebarProps {
  items: NavItem[];
  onSelect: (id: string) => void;
  collapsed?: boolean;
  projectName?: string;
  status?: string;
}

export function Sidebar({ items, onSelect, collapsed = false, projectName, status }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="sidebar__header">
        <div className="sidebar__project">
          <div className="sidebar__project-icon">◈</div>
          {!collapsed && (
            <div className="sidebar__project-info">
              <div className="sidebar__project-name">{projectName || 'No project'}</div>
              <div className="sidebar__project-status">{status || 'Select a project'}</div>
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map(item => (
          <button
            key={item.id}
            className={`sidebar__item ${item.active ? 'sidebar__item--active' : ''}`}
            onClick={() => onSelect(item.id)}
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="sidebar__item-icon">
              <Icon name={item.icon as any} size={16} />
            </span>
            {!collapsed && <span className="sidebar__item-label">{item.label}</span>}
            {!collapsed && item.count !== undefined && (
              <span className="sidebar__item-count">{item.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__footer-card">
          <div className="sidebar__footer-title">201 Agents</div>
          <div className="sidebar__footer-desc">12 parallel • Auto fallback on 429</div>
          <div className="sidebar__footer-dots">
            <span className="dot dot--ok" /> <span className="dot dot--run" /> <span className="dot dot--wait" />
          </div>
        </div>
      </div>
    </aside>
  );
}
