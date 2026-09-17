import React from 'react';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import './Header.css';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isConnected?: boolean;
  provider?: string;
}

export function Header({ onToggleSidebar, isConnected = true, provider = 'mock' }: HeaderProps) {
  return (
    <header className="header" role="banner">
      <div className="header__left">
        <button className="header__menu" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h14M3 10h14M3 14h14" /></svg>
        </button>
        <div className="header__brand">
          <div className="header__logo">◆</div>
          <div>
            <div className="header__title">AI Agency</div>
            <div className="header__subtitle">Autonomous Engineering v2</div>
          </div>
        </div>
      </div>
      <div className="header__center">
        <div className={`header__status ${isConnected ? 'header__status--online' : 'header__status--offline'}`}>
          <span className="header__dot" aria-hidden="true" />
          {isConnected ? 'Live' : 'Connecting…'}
        </div>
        <span className="header__provider">{provider}</span>
      </div>
      <div className="header__right">
        <Button variant="ghost" size="sm" onClick={() => window.open('/docs', '_blank')} icon={<Icon name="code" size={14} />}>API</Button>
        <Button variant="ghost" size="sm" onClick={() => window.open('/api/health', '_blank')} icon={<Icon name="activity" size={14} />}>Health</Button>
        <div className="header__avatar" aria-label="User">N</div>
      </div>
    </header>
  );
}
