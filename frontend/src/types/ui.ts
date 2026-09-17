import { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'icon' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: StatusVariant;
  duration?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}
