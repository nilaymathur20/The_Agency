import React, { useState, useCallback } from 'react';
import { Tooltip } from '../common/Tooltip';
import { classnames } from '../../utils/classnames';
import './KPICard.css';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: { direction: 'up' | 'down' | 'neutral'; percentage: number; period: string };
  definition?: string;
  onClick?: () => void;
  isLoading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  ({ label, value, trend, definition, onClick, isLoading = false, variant='default' }, ref) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const handleInfoClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setShowTooltip(!showTooltip);
    }, [showTooltip]);

    const trendColor = trend
      ? trend.direction === 'up' ? 'trend--positive' : trend.direction === 'down' ? 'trend--negative' : 'trend--neutral'
      : '';

    return (
      <div
        ref={ref}
        className={classnames('kpi-card', `kpi-card--${variant}`, isLoading && 'kpi-card--loading', onClick && 'kpi-card--clickable')}
        onClick={onClick}
        role="region"
        aria-label={label}
      >
        <div className="kpi-card__header">
          <span className="kpi-card__label">{label}</span>
          {definition && (
            <Tooltip content={definition} isOpen={showTooltip} onToggle={() => setShowTooltip(!showTooltip)}>
              <button className="kpi-card__info" onClick={handleInfoClick} aria-label={`More info about ${label}`} type="button">
                <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2"/><text x="8" y="11" textAnchor="middle" fontSize="9" fontWeight="700">?</text></svg>
              </button>
            </Tooltip>
          )}
        </div>
        <div className={classnames('kpi-card__value', isLoading && 'skeleton')}>{isLoading ? '—' : value}</div>
        {trend && (
          <div className={classnames('kpi-card__trend', trendColor)}>
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
              <polyline points={trend.direction==='up'?'4,10 8,6 12,10':'4,6 8,10 12,6'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{trend.direction==='up'?'+':''}{trend.percentage}% vs {trend.period}</span>
          </div>
        )}
      </div>
    );
  }
);
KPICard.displayName = 'KPICard';
