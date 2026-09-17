/* Task Queue Pattern */
/* Status filter tabs with counts, columns: Task (id + title), Assigned agent, Status, Priority, Dependency, Started, Duration */

import React, { useState, useMemo } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { tasks, agents, TASK_STATUSES } from '../data/seed';
import type { Task, TaskStatus } from '../types/seed';
import './TaskQueue.css';

// Status badge mapping
function getStatusBadgeVariant(status: TaskStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'WORKING':
    case 'WAITING_FOR_DEPENDENCY':
      return 'warning';
    case 'FAILED':
      return 'danger';
    case 'QUEUED':
    case 'WAITING':
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

interface TaskQueueProps {
  onSelectTask: (task: Task) => void;
}

export function TaskQueue({ onSelectTask }: TaskQueueProps) {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number | null = a[sortKey as keyof Task] as string | number | null;
      let bVal: string | number | null = b[sortKey as keyof Task] as string | number | null;

      if (sortKey === 'createdAt' || sortKey === 'startedAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [statusFilter, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const columns: Column<Task>[] = [
    {
      key: 'id',
      header: 'Task',
      render: (row: Task) => (
        <div>
          <span className="mono">{row.id}</span>
          <div className="task-title">{row.title}</div>
        </div>
      )
    },
    {
      key: 'assignedAgentId',
      header: 'Assigned agent',
      render: (row: Task) => row.assignedAgentId ? <span className="mono">{row.assignedAgentId}</span> : <span className="text-tertiary">Unassigned</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Task) => <Badge variant={getStatusBadgeVariant(row.status)}>{row.status.replace(/_/g, ' ')}</Badge>
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
    },
    {
      key: 'dependsOnTaskId',
      header: 'Dependency',
      render: (row: Task) => row.dependsOnTaskId ? <span className="mono">{row.dependsOnTaskId}</span> : <span className="text-tertiary">—</span>
    },
    {
      key: 'startedAt',
      header: 'Started',
      sortable: true,
      render: (row: Task) => row.startedAt ? <span className="mono tabular-nums">{row.startedAt.replace('T', ' ').slice(0, 16)}</span> : '—'
    },
    {
      key: 'duration',
      header: 'Duration',
    }
  ];

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tasks.length };
    tasks.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, []);

  // Row selection
  const handleSelectRow = (key: string, selected: boolean) => {
    const newSelected = new Set(selectedRows);
    if (selected) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(filteredTasks.map(t => t.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  // Cancel handler
  const handleCancel = () => {
    setIsCancelModalOpen(false);
    // In real app, would call API to cancel tasks
    console.log('Cancelling tasks:', Array.from(selectedRows));
    setSelectedRows(new Set());
  };

  // Get assigned agent for selected task
  const selectedTaskAgent = selectedTask?.assignedAgentId
    ? agents.find(a => a.id === selectedTask.assignedAgentId)
    : null;

  return (
    <div className="task-queue">
      {/* Status filter tabs */}
      <div className="task-queue__status-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={statusFilter === 'all'}
          className={`task-queue__status-tab ${statusFilter === 'all' ? 'task-queue__status-tab--active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All <span className="task-queue__status-count">{statusCounts.all}</span>
        </button>
        {TASK_STATUSES.map(status => (
          <button
            key={status}
            role="tab"
            aria-selected={statusFilter === status}
            className={`task-queue__status-tab ${statusFilter === status ? 'task-queue__status-tab--active' : ''}`}
            onClick={() => setStatusFilter(status as TaskStatus)}
          >
            {status.replace(/_/g, ' ')} <span className="task-queue__status-count">{statusCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {selectedRows.size > 0 && (
        <div className="task-queue__bulk-bar">
          <span>{selectedRows.size} selected</span>
          <Button variant="danger" size="sm" onClick={() => setIsCancelModalOpen(true)}>
            Cancel selected
          </Button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredTasks}
        keyField="id"
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={(row) => {
          setSelectedTask(row);
          onSelectTask(row);
        }}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        showSelection={true}
        ariaLabel="Task queue"
      />

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel tasks"
        variant="danger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>Keep tasks</Button>
            <Button variant="danger" onClick={handleCancel}>Cancel {selectedRows.size} tasks</Button>
          </>
        }
      >
        <p>
          Are you sure you want to cancel {selectedRows.size} task{selectedRows.size > 1 ? 's' : ''}?
        </p>
        <p className="text-tertiary">
          Cancelled tasks cannot be resumed and will be marked as CANCELLED.
        </p>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title || ''}
        id={selectedTask?.id || ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedTask(null)}>Close</Button>
            {selectedTask?.status !== 'CANCELLED' && selectedTask?.status !== 'COMPLETED' && (
              <Button variant="danger">Cancel task</Button>
            )}
          </>
        }
      >
        {selectedTask && (
          <div className="task-drawer">
            <div className="task-drawer__section">
              <h3 className="task-drawer__section-title">Status</h3>
              <Badge variant={getStatusBadgeVariant(selectedTask.status)}>{selectedTask.status.replace(/_/g, ' ')}</Badge>
            </div>

            <div className="task-drawer__section">
              <h3 className="task-drawer__section-title">Priority</h3>
              <span>{selectedTask.priority}</span>
            </div>

            <div className="task-drawer__section">
              <h3 className="task-drawer__section-title">Assigned agent</h3>
              {selectedTaskAgent ? (
                <div>
                  <span className="mono">{selectedTask.id}</span>
                  <p className="text-tertiary">{selectedTaskAgent.name}</p>
                </div>
              ) : (
                <span className="text-tertiary">Unassigned</span>
              )}
            </div>

            <div className="task-drawer__section">
              <h3 className="task-drawer__section-title">Created</h3>
              <span className="mono tabular-nums">{selectedTask.createdAt.replace('T', ' ').slice(0, 16)}</span>
            </div>

            {selectedTask.startedAt && (
              <div className="task-drawer__section">
                <h3 className="task-drawer__section-title">Started</h3>
                <span className="mono tabular-nums">{selectedTask.startedAt.replace('T', ' ').slice(0, 16)}</span>
              </div>
            )}

            {selectedTask.duration && (
              <div className="task-drawer__section">
                <h3 className="task-drawer__section-title">Duration</h3>
                <span>{selectedTask.duration}</span>
              </div>
            )}

            {selectedTask.dependsOnTaskId && (
              <div className="task-drawer__section">
                <h3 className="task-drawer__section-title">Depends on</h3>
                <span className="mono">{selectedTask.dependsOnTaskId}</span>
              </div>
            )}

            {selectedTask.retries > 0 && (
              <div className="task-drawer__section">
                <h3 className="task-drawer__section-title">Retries</h3>
                <span>{selectedTask.retries}</span>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}