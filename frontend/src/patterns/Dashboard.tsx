/* Dashboard Pattern */
/* 4 metrics, active tasks table, exceptions panel, task outcomes chart */

import React, { useState } from 'react';
import { Metric } from '../components/common/Metric';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { DataTable, Column } from '../components/common/DataTable';
import { agents, tasks, taskOutcomesByDay, dashboardMetrics, teams } from '../data/seed';
import type { Task, Agent } from '../types/seed';
import './Dashboard.css';

interface DashboardProps {
  onViewTasks: () => void;
  onSelectTask: (task: Task) => void;
  onSelectAgent: (agent: Agent) => void;
}

// Status badge mapping
function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'READY':
    case 'COMPLETED':
      return 'success';
    case 'WORKING':
    case 'WAITING_FOR_DEPENDENCY':
      return 'warning';
    case 'FAILED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function Dashboard({ onViewTasks, onSelectTask, onSelectAgent }: DashboardProps) {
  const [showChartData, setShowChartData] = useState(false);

  // Get active tasks (top 10 by priority)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const activeTasks = tasks
    .filter(t => t.status === 'WORKING')
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 10);

  // Exceptions
  const exceptions = dashboardMetrics.exceptions;

  // Calculate chart dimensions
  const maxValue = Math.max(
    ...taskOutcomesByDay.map(d => d.completed + d.failed + d.cancelled)
  );

  return (
    <div className="dashboard-screen">
      {/* Metrics */}
      <section className="dashboard-metrics">
        <Metric
          label="Ready agents"
          value={dashboardMetrics.readyAgents}
          timeWindow="Current"
        />
        <Metric
          label="Active tasks"
          value={dashboardMetrics.activeTasks}
          timeWindow="Current"
        />
        <Metric
          label="Failed tasks"
          value={dashboardMetrics.failedTasks24h}
          unit=""
          timeWindow="Last 24h"
          delta={{
            value: dashboardMetrics.failedTasks24hPrevious,
            direction: dashboardMetrics.failedTasks24h > dashboardMetrics.failedTasks24hPrevious ? 'up' : 'down',
            comparison: 'vs previous 24h'
          }}
        />
        <Metric
          label="Waiting on dependency"
          value={dashboardMetrics.waitingOnDependency}
          timeWindow="Current"
        />
      </section>

      {/* Active Tasks Table */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">Active tasks</h2>
          <Button variant="tertiary" size="sm" onClick={onViewTasks}>View all</Button>
        </div>
        <DataTable
          columns={[
            {
              key: 'id',
              header: 'Task',
              render: (row: Task) => (
                <div>
                  <span className="mono">{row.id}</span>
                  <div className="dashboard-task-title">{row.title}</div>
                </div>
              )
            },
            {
              key: 'assignedAgentId',
              header: 'Agent',
              render: (row: Task) => row.assignedAgentId ? <span className="mono">{row.assignedAgentId}</span> : <span className="text-tertiary">Unassigned</span>
            },
            {
              key: 'status',
              header: 'Status',
              render: (row: Task) => <Badge variant={getStatusBadgeVariant(row.status)}>{row.status.replace(/_/g, ' ')}</Badge>
            },
            {
              key: 'priority',
              header: 'Priority',
              sortable: true,
            },
            {
              key: 'startedAt',
              header: 'Started',
              render: (row: Task) => row.startedAt ? row.startedAt.replace('T', ' ').slice(0, 16) : '—'
            },
            {
              key: 'duration',
              header: 'Duration',
            }
          ]}
          data={activeTasks}
          keyField="id"
          onRowClick={onSelectTask}
          ariaLabel="Active tasks"
        />
      </section>

      {/* Exceptions Panel */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">Exceptions</h2>
        <div className="dashboard-exceptions">
          {/* Failed tasks in last 24h */}
          {exceptions.failedTasks24h.length > 0 && (
            <div className="dashboard-exception-group">
              <h3 className="dashboard-exception-group__title">Failed tasks (24h)</h3>
              <ul className="dashboard-exception-list">
                {exceptions.failedTasks24h.map(task => (
                  <li key={task.id} className="dashboard-exception-item" onClick={() => onSelectTask(task)}>
                    <Badge variant="danger">{task.status}</Badge>
                    <span className="mono">{task.id}</span>
                    <span className="dashboard-exception-item__title">{task.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Waiting long */}
          {exceptions.waitingLong.length > 0 && (
            <div className="dashboard-exception-group">
              <h3 className="dashboard-exception-group__title">Waiting for dependency {'>'}15m</h3>
              <ul className="dashboard-exception-list">
                {exceptions.waitingLong.map(task => (
                  <li key={task.id} className="dashboard-exception-item" onClick={() => onSelectTask(task)}>
                    <Badge variant="warning">{task.status.replace(/_/g, ' ')}</Badge>
                    <span className="mono">{task.id}</span>
                    <span className="dashboard-exception-item__title">{task.title}</span>
                    {task.dependsOnTaskId && <span className="mono dashboard-exception-item__dep">blocked by {task.dependsOnTaskId}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stale agents */}
          {exceptions.staleAgents.length > 0 && (
            <div className="dashboard-exception-group">
              <h3 className="dashboard-exception-group__title">Agents failed or stale {'>'}5m</h3>
              <ul className="dashboard-exception-list">
                {exceptions.staleAgents.map(agent => (
                  <li key={agent.id} className="dashboard-exception-item" onClick={() => onSelectAgent(agent)}>
                    <Badge variant="danger">{agent.status}</Badge>
                    <span className="mono">{agent.id}</span>
                    <span className="dashboard-exception-item__title">{agent.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {exceptions.failedTasks24h.length === 0 &&
           exceptions.waitingLong.length === 0 &&
           exceptions.staleAgents.length === 0 && (
            <p className="dashboard-exceptions__empty">No exceptions to report</p>
          )}
        </div>
      </section>

      {/* Task Outcomes Chart */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">Task outcomes by day — last 14 days</h2>
          <Button variant="tertiary" size="sm" onClick={() => setShowChartData(!showChartData)}>
            {showChartData ? 'Hide data' : 'View data'}
          </Button>
        </div>

        {/* Stacked bar chart */}
        <div className="dashboard-chart" role="img" aria-label="Task outcomes by day - stacked bar chart">
          <div className="dashboard-chart__bars">
            {taskOutcomesByDay.map(day => {
              const completedHeight = (day.completed / maxValue) * 100;
              const failedHeight = (day.failed / maxValue) * 100;
              const cancelledHeight = (day.cancelled / maxValue) * 100;

              return (
                <div key={day.date} className="dashboard-chart__bar-group">
                  <div className="dashboard-chart__bar-stack">
                    <div
                      className="dashboard-chart__bar dashboard-chart__bar--completed"
                      style={{ height: `${completedHeight}%` }}
                      title={`Completed: ${day.completed}`}
                    />
                    <div
                      className="dashboard-chart__bar dashboard-chart__bar--failed"
                      style={{ height: `${failedHeight}%` }}
                      title={`Failed: ${day.failed}`}
                    />
                    <div
                      className="dashboard-chart__bar dashboard-chart__bar--cancelled"
                      style={{ height: `${cancelledHeight}%` }}
                      title={`Cancelled: ${day.cancelled}`}
                    />
                  </div>
                  <span className="dashboard-chart__label">{day.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="dashboard-chart__legend">
            <span className="dashboard-chart__legend-item">
              <span className="dashboard-chart__legend-color dashboard-chart__legend-color--completed" />
              Completed
            </span>
            <span className="dashboard-chart__legend-item">
              <span className="dashboard-chart__legend-color dashboard-chart__legend-color--failed" />
              Failed
            </span>
            <span className="dashboard-chart__legend-item">
              <span className="dashboard-chart__legend-color dashboard-chart__legend-color--cancelled" />
              Cancelled
            </span>
          </div>
        </div>

        {/* Data table toggle */}
        {showChartData && (
          <div className="dashboard-chart__table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Completed</th>
                  <th>Failed</th>
                  <th>Cancelled</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {taskOutcomesByDay.map(day => (
                  <tr key={day.date}>
                    <td className="mono">{day.date}</td>
                    <td>{day.completed}</td>
                    <td>{day.failed}</td>
                    <td>{day.cancelled}</td>
                    <td>{day.completed + day.failed + day.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}