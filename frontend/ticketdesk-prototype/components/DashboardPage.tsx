
import React, { useState, useMemo } from 'react';
import type { Page, Ticket } from '../types';
import { TicketStatus } from '../types';
import { useTickets } from '../hooks/useTickets';
import { FilterIcon } from './icons';

interface DashboardPageProps {
  navigateTo: (page: Page) => void;
}

const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-block";
  const statusClasses = {
    [TicketStatus.OPEN]: "bg-blue-100 text-blue-800",
    [TicketStatus.IN_PROGRESS]: "bg-yellow-100 text-yellow-800",
    [TicketStatus.CLOSED]: "bg-slate-200 text-slate-800",
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};


const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo }) => {
  const { tickets, loading } = useTickets();
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Ticket, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc'});
  
  const sortedAndFilteredTickets = useMemo(() => {
    let sortableTickets = [...tickets];
    
    if (filterStatus !== 'all') {
      sortableTickets = sortableTickets.filter(ticket => ticket.status === filterStatus);
    }

    if (sortConfig !== null) {
      sortableTickets.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableTickets;
  }, [tickets, sortConfig, filterStatus]);
  
  const requestSort = (key: keyof Ticket) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: keyof Ticket) => {
      if (!sortConfig || sortConfig.key !== key) return '↕';
      return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-brand-text">Ticket Dashboard</h1>
        <div className="flex items-center space-x-2">
            <FilterIcon className="w-5 h-5 text-slate-500" />
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'all')}
                className="bg-brand-card border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            >
                <option value="all">All Statuses</option>
                <option value={TicketStatus.OPEN}>Open</option>
                <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
                <option value={TicketStatus.CLOSED}>Closed</option>
            </select>
        </div>
      </div>

      <div className="bg-brand-card rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('id')}>
                  Case ID {getSortIndicator('id')}
                </th>
                <th scope="col" className="px-6 py-3">
                  Name of POC
                </th>
                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('travelDate')}>
                  Travel Date {getSortIndicator('travelDate')}
                </th>
                <th scope="col" className="px-6 py-3">
                  Status
                </th>
                <th scope="col" className="px-6 py-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                    <td colSpan={5} className="text-center py-10">Loading tickets...</td>
                </tr>
              ) : sortedAndFilteredTickets.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">No tickets found for this filter.</td>
                </tr>
              ) : (
                sortedAndFilteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="bg-brand-card border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-brand-text whitespace-nowrap">{ticket.id}</td>
                    <td className="px-6 py-4">{ticket.pocName}</td>
                    <td className="px-6 py-4">{new Date(ticket.travelDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigateTo({ type: 'details', ticketId: ticket.id })}
                        className="font-medium text-brand-primary hover:text-brand-accent transition-colors"
                      >
                        VIEW
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
