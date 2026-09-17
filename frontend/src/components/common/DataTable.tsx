/* DataTable Component */
/* Content guidance: Real <table> with scope="col" headers, sticky header, sortable, full-row keyboard focus */

import React, { ReactNode, useCallback, useRef, useEffect } from 'react';
import { classnames } from '../../utils/classnames';
import './DataTable.css';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  selectedRows?: Set<string>;
  onSelectRow?: (key: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  isLoading?: boolean;
  loadingTemplate?: ReactNode;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  errorMessage?: string;
  onRetry?: () => void;
  ariaLabel?: string;
  showSelection?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  selectedRows,
  onSelectRow,
  onSelectAll,
  isLoading,
  loadingTemplate,
  emptyMessage = 'No data available',
  emptyAction,
  errorMessage,
  onRetry,
  ariaLabel,
  showSelection,
  pagination
}: DataTableProps<T>) {
  const getRowKey = useCallback((row: T) => String(row[keyField]), [keyField]);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allSelected = data.length > 0 && data.every(row => selectedRows?.has(getRowKey(row)));
  const someSelected = data.some(row => selectedRows?.has(getRowKey(row)));

  // Handle indeterminate state for select all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const handleSort = (key: string) => {
    if (onSort) onSort(key);
  };

  // Loading state
  if (isLoading) {
    return loadingTemplate || (
      <div className="data-table-container">
        <table className="data-table" aria-label={ariaLabel}>
          <thead>
            <tr>
              {showSelection && <th scope="col" className="data-table__checkbox-col"></th>}
              {columns.map(col => (
                <th key={col.key} scope="col" style={{ width: col.width }}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length + (showSelection ? 1 : 0)} className="data-table__loading">
                Loading...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // Error state
  if (errorMessage) {
    return (
      <div className="data-table-container">
        <div className="data-table__error">
          <p>{errorMessage}</p>
          {onRetry && <button onClick={onRetry}>Retry</button>}
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="data-table-container">
        <div className="data-table__empty">
          <p>{emptyMessage}</p>
          {emptyAction}
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {showSelection && (
              <th scope="col" className="data-table__checkbox-col">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width }}
                aria-sort={sortKey === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {col.sortable ? (
                  <button
                    className="data-table__sort-btn"
                    onClick={() => handleSort(col.key)}
                  >
                    <span>{col.header}</span>
                    {sortKey === col.key && (
                      <span className="data-table__sort-indicator" aria-hidden="true">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const rowKey = getRowKey(row);
            const isSelected = selectedRows?.has(rowKey);

            return (
              <tr
                key={rowKey}
                className={classnames(isSelected && 'data-table__row--selected')}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {showSelection && (
                  <td className="data-table__checkbox-col">
                    <input
                      type="checkbox"
                      aria-label={`Select ${rowKey}`}
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectRow?.(rowKey, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {pagination && (
        <div className="data-table__pagination">
          <span className="data-table__pagination-info">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="data-table__pagination-controls">
            <button
              disabled={pagination.page === 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}