/* Agent Directory Pattern */
/* Table columns: Agent (id + name), Team, Status, Current task, Utilization %, Last heartbeat, row actions */

import React, { useState, useMemo } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Drawer } from '../components/common/Drawer';
import { agents, teams } from '../data/seed';
import type { Agent, AgentStatus } from '../types/seed';
import './AgentDirectory.css';

interface AgentDirectoryProps {
  onSelectAgent: (agent: Agent) => void;
}

// Status badge mapping
function getStatusBadgeVariant(status: AgentStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'READY':
      return 'success';
    case 'WORKING':
      return 'warning';
    case 'FAILED':
      return 'danger';
    case 'WAITING':
    case 'DORMANT':
    case 'OFFLINE':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function AgentDirectory({ onSelectAgent }: AgentDirectoryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Filter and sort agents
  const filteredAgents = useMemo(() => {
    let result = [...agents];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(a =>
        a.id.toLowerCase().includes(searchLower) ||
        a.name.toLowerCase().includes(searchLower) ||
        a.team.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }

    // Team filter
    if (teamFilter !== 'all') {
      result = result.filter(a => a.team === teamFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a[sortKey as keyof Agent] as string | number;
      let bVal: string | number = b[sortKey as keyof Agent] as string | number;

      if (sortKey === 'lastHeartbeat') {
        aVal = new Date(a.lastHeartbeat).getTime();
        bVal = new Date(b.lastHeartbeat).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [search, statusFilter, teamFilter, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const columns: Column<Agent>[] = [
    {
      key: 'id',
      header: 'Agent',
      render: (row: Agent) => (
        <div>
          <span className="mono">{row.id}</span>
          <div className="agent-name">{row.name}</div>
        </div>
      )
    },
    {
      key: 'team',
      header: 'Team',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Agent) => <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
    },
    {
      key: 'currentTaskId',
      header: 'Current task',
      render: (row: Agent) => row.currentTaskId ? <span className="mono">{row.currentTaskId}</span> : <span className="text-tertiary">—</span>
    },
    {
      key: 'utilizationPct',
      header: 'Utilization',
      sortable: true,
      render: (row: Agent) => (
        <div className="utilization-cell">
          <span className="utilization-value">{row.utilizationPct}%</span>
          <div className="utilization-bar">
            <div className="utilization-bar__fill" style={{ width: `${row.utilizationPct}%` }} />
          </div>
        </div>
      )
    },
    {
      key: 'lastHeartbeat',
      header: 'Last heartbeat',
      sortable: true,
      render: (row: Agent) => {
        const date = row.lastHeartbeat.replace('T', ' ').slice(0, 16);
        return <span className="mono tabular-nums">{date}</span>;
      }
    }
  ];

  // Status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: agents.length };
    agents.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, []);

  // Get team for selected agent
  const selectedTeam = selectedAgent ? teams.find(t => t.name === selectedAgent.team) : null;

  return (
    <div className="agent-directory">
      {/* Filters */}
      <div className="agent-directory__filters">
        <div className="agent-directory__search">
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="agent-directory__filter-group">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="agent-directory__select"
            aria-label="Filter by team"
          >
            <option value="all">All teams</option>
            {teams.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="agent-directory__status-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={statusFilter === 'all'}
          className={`agent-directory__status-tab ${statusFilter === 'all' ? 'agent-directory__status-tab--active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All <span className="agent-directory__status-count">{statusCounts.all}</span>
        </button>
        {['READY', 'WORKING', 'WAITING', 'FAILED', 'DORMANT', 'OFFLINE'].map(status => (
          <button
            key={status}
            role="tab"
            aria-selected={statusFilter === status}
            className={`agent-directory__status-tab ${statusFilter === status ? 'agent-directory__status-tab--active' : ''}`}
            onClick={() => setStatusFilter(status as AgentStatus)}
          >
            {status} <span className="agent-directory__status-count">{statusCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredAgents}
        keyField="id"
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={(row) => {
          setSelectedAgent(row);
          onSelectAgent(row);
        }}
        ariaLabel="Agent directory"
        pagination={{
          page: 1,
          pageSize: 50,
          total: filteredAgents.length,
          onPageChange: () => {}
        }}
      />

      {/* Footer */}
      <div className="agent-directory__footer">
        Showing {filteredAgents.length} of {agents.length} agents
      </div>

      {/* Detail Drawer */}
      <Drawer
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        title={selectedAgent?.name || ''}
        id={selectedAgent?.id || ''}
        subtitle={selectedAgent?.team}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedAgent(null)}>Close</Button>
            <Button variant="danger">Restart agent</Button>
          </>
        }
      >
        {selectedAgent && (
          <div className="agent-drawer">
            <div className="agent-drawer__section">
              <h3 className="agent-drawer__section-title">Status</h3>
              <Badge variant={getStatusBadgeVariant(selectedAgent.status)}>{selectedAgent.status}</Badge>
            </div>

            <div className="agent-drawer__section">
              <h3 className="agent-drawer__section-title">Current task</h3>
              {selectedAgent.currentTaskId ? (
                <span className="mono">{selectedAgent.currentTaskId}</span>
              ) : (
                <span className="text-tertiary">None</span>
              )}
            </div>

            <div className="agent-drawer__section">
              <h3 className="agent-drawer__section-title">Utilization</h3>
              <div className="utilization-cell">
                <span className="utilization-value">{selectedAgent.utilizationPct}%</span>
                <div className="utilization-bar">
                  <div className="utilization-bar__fill" style={{ width: `${selectedAgent.utilizationPct}%` }} />
                </div>
              </div>
            </div>

            <div className="agent-drawer__section">
              <h3 className="agent-drawer__section-title">Last heartbeat</h3>
              <span className="mono tabular-nums">
                {selectedAgent.lastHeartbeat.replace('T', ' ').slice(0, 16)}
              </span>
            </div>

            <div className="agent-drawer__section">
              <h3 className="agent-drawer__section-title">Version</h3>
              <span className="mono">{selectedAgent.version}</span>
            </div>

            {selectedTeam && (
              <div className="agent-drawer__section">
                <h3 className="agent-drawer__section-title">Team</h3>
                <p>{selectedTeam.name}</p>
                <p className="text-tertiary">Lead: {selectedTeam.lead}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}