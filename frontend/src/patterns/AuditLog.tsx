/* Audit Log Pattern */
/* Reverse-chronological table: Time, Actor (name + role), Action (monospace), Target (id + label), Result badge, expandable row */

import React, { useState, useMemo } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { auditEvents } from '../data/seed';
import type { AuditEvent } from '../types/seed';
import './AuditLog.css';

// Result badge mapping
function getResultBadgeVariant(result: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (result) {
    case 'success':
      return 'success';
    case 'failure':
      return 'danger';
    case 'pending':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function AuditLog() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter events
  const filteredEvents = useMemo(() => {
    let result = [...auditEvents];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(e =>
        e.actor.name.toLowerCase().includes(searchLower) ||
        e.action.toLowerCase().includes(searchLower) ||
        e.targetId.toLowerCase().includes(searchLower) ||
        e.targetLabel.toLowerCase().includes(searchLower)
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      result = result.filter(e => e.action === actionFilter);
    }

    // Result filter
    if (resultFilter !== 'all') {
      result = result.filter(e => e.result === resultFilter);
    }

    return result;
  }, [search, actionFilter, resultFilter]);

  const columns: Column<AuditEvent>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      render: (row: AuditEvent) => (
        <span className="mono tabular-nums">
          {row.timestamp.replace('T', ' ').slice(0, 16)}
        </span>
      )
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row: AuditEvent) => (
        <div>
          <span>{row.actor.name}</span>
          <span className="audit-actor-role">{row.actor.role}</span>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: AuditEvent) => <span className="mono">{row.action}</span>
    },
    {
      key: 'targetId',
      header: 'Target',
      render: (row: AuditEvent) => (
        <div>
          <span className="mono">{row.targetId}</span>
          <span className="audit-target-label">{row.targetLabel}</span>
        </div>
      )
    },
    {
      key: 'result',
      header: 'Result',
      render: (row: AuditEvent) => <Badge variant={getResultBadgeVariant(row.result)}>{row.result}</Badge>
    },
    {
      key: 'expand',
      header: '',
      render: (row: AuditEvent) => (
        <button
          className="audit-expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedRow(expandedRow === row.timestamp ? null : row.timestamp);
          }}
          aria-expanded={expandedRow === row.timestamp}
          aria-label={expandedRow === row.timestamp ? 'Collapse details' : 'Expand details'}
        >
          {expandedRow === row.timestamp ? 'Hide' : 'Details'}
        </button>
      )
    }
  ];

  // Get unique actions for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set(auditEvents.map(e => e.action));
    return Array.from(actions).sort();
  }, []);

  return (
    <div className="audit-log">
      {/* Filters */}
      <div className="audit-log__filters">
        <div className="audit-log__search">
          <Input
            placeholder="Search audit log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="audit-log__filter-group">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="audit-log__select"
            aria-label="Filter by action"
          >
            <option value="all">All actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="audit-log__select"
            aria-label="Filter by result"
          >
            <option value="all">All results</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredEvents}
        keyField="timestamp"
        sortKey="timestamp"
        sortDirection="desc"
        onRowClick={(row) => setExpandedRow(expandedRow === row.timestamp ? null : row.timestamp)}
        ariaLabel="Audit log"
      />

      {/* Expanded row details */}
      {expandedRow && (
        <div className="audit-log__expanded">
          {(() => {
            const event = auditEvents.find(e => e.timestamp === expandedRow);
            if (!event) return null;
            return (
              <>
                <h4 className="audit-log__expanded-title">Event Details</h4>
                <dl className="audit-log__expanded-grid">
                  <dt>Timestamp</dt>
                  <dd className="mono tabular-nums">{event.timestamp}</dd>

                  <dt>Actor</dt>
                  <dd>{event.actor.name} ({event.actor.role})</dd>

                  <dt>Action</dt>
                  <dd className="mono">{event.action}</dd>

                  <dt>Target</dt>
                  <dd>
                    <span className="mono">{event.targetId}</span>
                    <span> — {event.targetLabel}</span>
                  </dd>

                  <dt>Result</dt>
                  <dd><Badge variant={getResultBadgeVariant(event.result)}>{event.result}</Badge></dd>

                  <dt>Details</dt>
                  <dd>{event.details}</dd>
                </dl>
              </>
            );
          })()}
        </div>
      )}

      {/* Footer */}
      <div className="audit-log__footer">
        Showing {filteredEvents.length} of {auditEvents.length} events
      </div>
    </div>
  );
}