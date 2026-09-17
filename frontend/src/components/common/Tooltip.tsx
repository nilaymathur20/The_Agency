import React, { useState, ReactNode } from 'react';
import './Tooltip.css';

interface TooltipProps {
  content: string;
  children: ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, isOpen, onToggle, position='top' }: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen(v => !v));

  return (
    <span className="tooltip__wrapper" onMouseEnter={() => setInternalOpen(true)} onMouseLeave={() => setInternalOpen(false)}>
      <span onClick={toggle} role="button" tabIndex={0} onKeyDown={e => e.key==='Enter' && toggle()}>
        {children}
      </span>
      {open && <span className={`tooltip tooltip--${position}`} role="tooltip">{content}</span>}
    </span>
  );
}
