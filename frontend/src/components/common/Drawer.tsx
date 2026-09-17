/* Drawer Component */
/* Content guidance: Header with record type, monospace id, name; body with dividers; footer action bar */

import React, { ReactNode, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { classnames } from '../../utils/classnames';
import './Drawer.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  id: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  id,
  subtitle,
  children,
  footer,
  width = 420
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Focus trap and Escape handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab' && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Store the trigger element to return focus later
      triggerRef.current = document.activeElement as HTMLButtonElement;

      // Add event listeners
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus the first focusable element in drawer
      setTimeout(() => {
        const firstFocusable = drawerRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        firstFocusable?.focus();
      }, 0);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Return focus to trigger
      triggerRef.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div className="drawer-overlay" onClick={onClose} role="presentation">
      <div
        ref={drawerRef}
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{ width }}
      >
        <header className="drawer__header">
          <div className="drawer__header-content">
            <h2 id="drawer-title" className="drawer__title">{title}</h2>
            <span className="drawer__id">{id}</span>
            {subtitle && <p className="drawer__subtitle">{subtitle}</p>}
          </div>
          <button
            className="drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 5L5 15M5 5l10 10" />
            </svg>
          </button>
        </header>

        <div className="drawer__body">
          {children}
        </div>

        {footer && (
          <footer className="drawer__footer">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}