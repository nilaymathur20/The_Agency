/* Operations Interface Shell */
/* App shell: left navigation rail + primary workspace + optional contextual drawer */

import React, { useState, ReactNode } from 'react';
import './operations.css';

export type ScreenId = 'dashboard' | 'agents' | 'tasks' | 'audit';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ReactNode;
  count?: number;
}

interface OperationsShellProps {
  children: ReactNode;
  activeScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
  navItems: NavItem[];
}

export function OperationsShell({ children, activeScreen, onScreenChange, navItems }: OperationsShellProps) {
  return (
    <div className="operations-layout">
      <nav className="operations-nav" aria-label="Main navigation">
        <div className="operations-nav__header">
          <div className="operations-nav__logo">Operations</div>
          <div className="operations-nav__subtitle">AI Agency Console</div>
        </div>
        <ul className="operations-nav__list" role="list">
          {navItems.map(item => (
            <li key={item.id} className="operations-nav__item">
              <button
                className={`operations-nav__button ${activeScreen === item.id ? 'operations-nav__button--active' : ''}`}
                onClick={() => onScreenChange(item.id)}
                aria-current={activeScreen === item.id ? 'page' : undefined}
              >
                <span className="operations-nav__icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="operations-nav__count">{item.count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="operations-main">
        {children}
      </main>
    </div>
  );
}