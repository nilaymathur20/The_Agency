/* Metric Component */
/* Content guidance: Label, value with unit, time context, comparison where relevant */

import React, { ReactNode } from 'react';
import { classnames } from '../../utils/classnames';
import './Metric.css';

interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  timeWindow?: string;
  delta?: {
    value: number;
    direction: 'up' | 'down';
    comparison: string;
  };
  className?: string;
}

export function Metric({ label, value, unit, timeWindow, delta, className }: MetricProps) {
  return (
    <div className={classnames('metric', className)}>
      <span className="metric__label">{label}</span>
      <div className="metric__value-row">
        <span className="metric__value">
          {value}
          {unit && <span className="metric__unit">{unit}</span>}
        </span>
        {delta && (
          <span className={classnames('metric__delta', `metric__delta--${delta.direction}`)}>
            {delta.direction === 'up' ? '+' : '-'}{Math.abs(delta.value)} {delta.comparison}
          </span>
        )}
      </div>
      {timeWindow && <span className="metric__time">{timeWindow}</span>}
    </div>
  );
}