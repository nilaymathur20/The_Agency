/* Badge Component */
/* Content guidance: Always pair color with a text label - never encode state in color alone */

import React, { ReactNode } from 'react';
import { classnames } from '../../utils/classnames';
import './Badge.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function Badge({ variant, children, className, icon }: BadgeProps) {
  return (
    <span className={classnames('badge', `badge--${variant}`, className)}>
      {icon && <span className="badge__icon" aria-hidden="true">{icon}</span>}
      <span className="badge__label">{children}</span>
    </span>
  );
}