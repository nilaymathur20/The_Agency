import React, { forwardRef } from 'react';
import { classnames } from '../../utils/classnames';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
    return (
      <div className={classnames('input-group', className)}>
        {label && <label htmlFor={inputId} className="input__label">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={classnames('input', error && 'input--error')}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && <div id={`${inputId}-error`} className="input__error" role="alert">{error}</div>}
        {hint && !error && <div id={`${inputId}-hint`} className="input__hint">{hint}</div>}
      </div>
    );
  }
);
Input.displayName = 'Input';
