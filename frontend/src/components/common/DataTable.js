import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* DataTable Component */
/* Content guidance: Real <table> with scope="col" headers, sticky header, sortable, full-row keyboard focus */
import { useCallback, useRef, useEffect } from 'react';
import { classnames } from '../../utils/classnames';
import './DataTable.css';
export function DataTable({ columns, data, keyField, sortKey, sortDirection, onSort, onRowClick, selectedRows, onSelectRow, onSelectAll, isLoading, loadingTemplate, emptyMessage = 'No data available', emptyAction, errorMessage, onRetry, ariaLabel, showSelection, pagination }) {
    const getRowKey = useCallback((row) => String(row[keyField]), [keyField]);
    const selectAllRef = useRef(null);
    const allSelected = data.length > 0 && data.every(row => selectedRows?.has(getRowKey(row)));
    const someSelected = data.some(row => selectedRows?.has(getRowKey(row)));
    // Handle indeterminate state for select all checkbox
    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someSelected && !allSelected;
        }
    }, [someSelected, allSelected]);
    const handleSort = (key) => {
        if (onSort)
            onSort(key);
    };
    // Loading state
    if (isLoading) {
        return loadingTemplate || (_jsx("div", { className: "data-table-container", children: _jsxs("table", { className: "data-table", "aria-label": ariaLabel, children: [_jsx("thead", { children: _jsxs("tr", { children: [showSelection && _jsx("th", { scope: "col", className: "data-table__checkbox-col" }), columns.map(col => (_jsx("th", { scope: "col", style: { width: col.width }, children: col.header }, col.key)))] }) }), _jsx("tbody", { children: _jsx("tr", { children: _jsx("td", { colSpan: columns.length + (showSelection ? 1 : 0), className: "data-table__loading", children: "Loading..." }) }) })] }) }));
    }
    // Error state
    if (errorMessage) {
        return (_jsx("div", { className: "data-table-container", children: _jsxs("div", { className: "data-table__error", children: [_jsx("p", { children: errorMessage }), onRetry && _jsx("button", { onClick: onRetry, children: "Retry" })] }) }));
    }
    // Empty state
    if (data.length === 0) {
        return (_jsx("div", { className: "data-table-container", children: _jsxs("div", { className: "data-table__empty", children: [_jsx("p", { children: emptyMessage }), emptyAction] }) }));
    }
    return (_jsxs("div", { className: "data-table-container", children: [_jsxs("table", { className: "data-table", "aria-label": ariaLabel, children: [_jsx("thead", { children: _jsxs("tr", { children: [showSelection && (_jsx("th", { scope: "col", className: "data-table__checkbox-col", children: _jsx("input", { ref: selectAllRef, type: "checkbox", "aria-label": "Select all", checked: allSelected, onChange: (e) => onSelectAll?.(e.target.checked) }) })), columns.map(col => (_jsx("th", { scope: "col", style: { width: col.width }, "aria-sort": sortKey === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined, children: col.sortable ? (_jsxs("button", { className: "data-table__sort-btn", onClick: () => handleSort(col.key), children: [_jsx("span", { children: col.header }), sortKey === col.key && (_jsx("span", { className: "data-table__sort-indicator", "aria-hidden": "true", children: sortDirection === 'asc' ? '↑' : '↓' }))] })) : (col.header) }, col.key)))] }) }), _jsx("tbody", { children: data.map(row => {
                            const rowKey = getRowKey(row);
                            const isSelected = selectedRows?.has(rowKey);
                            return (_jsxs("tr", { className: classnames(isSelected && 'data-table__row--selected'), onClick: () => onRowClick?.(row), tabIndex: onRowClick ? 0 : undefined, onKeyDown: (e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
                                        e.preventDefault();
                                        onRowClick(row);
                                    }
                                }, children: [showSelection && (_jsx("td", { className: "data-table__checkbox-col", children: _jsx("input", { type: "checkbox", "aria-label": `Select ${rowKey}`, checked: isSelected, onChange: (e) => {
                                                e.stopPropagation();
                                                onSelectRow?.(rowKey, e.target.checked);
                                            }, onClick: (e) => e.stopPropagation() }) })), columns.map(col => (_jsx("td", { children: col.render ? col.render(row) : row[col.key] }, col.key)))] }, rowKey));
                        }) })] }), pagination && (_jsxs("div", { className: "data-table__pagination", children: [_jsxs("span", { className: "data-table__pagination-info", children: ["Showing ", (pagination.page - 1) * pagination.pageSize + 1, " to", ' ', Math.min(pagination.page * pagination.pageSize, pagination.total), " of ", pagination.total] }), _jsxs("div", { className: "data-table__pagination-controls", children: [_jsx("button", { disabled: pagination.page === 1, onClick: () => pagination.onPageChange(pagination.page - 1), "aria-label": "Previous page", children: "Previous" }), _jsx("button", { disabled: pagination.page * pagination.pageSize >= pagination.total, onClick: () => pagination.onPageChange(pagination.page + 1), "aria-label": "Next page", children: "Next" })] })] }))] }));
}
