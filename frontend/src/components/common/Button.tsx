/* Button Component */
/* Content guidance: Labels should be verbs (Create task, Save changes, Cancel task) */
/* Keyboard: Enter/Space activates, Tab navigates, one primary button per action region */

import React, { forwardRef, ReactNode } from 'react';
import { classnames } from '../../utils/classnames';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, icon, children, fullWidth = false, className, disabled, ...props }, ref) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={classnames(
          'btn',
          `btn--${variant}`,
          `btn--${size}`,
          fullWidth && 'btn--full',
          isDisabled && 'btn--disabled',
          isLoading && 'btn--loading',
          className
        )}
        disabled={isDisabled as boolean}
        aria-busy={isLoading}
        {...props}
      >
        {icon && <span className="btn__icon">{icon}</span>}
        {children && <span className="btn__label">{children}</span>}
        {isLoading && <span className="btn__spinner" aria-hidden="true" />}
      </button>
    );
  }
);

Button.displayName = 'Button';