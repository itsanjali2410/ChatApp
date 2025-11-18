'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getTickets, getMyTickets, type Ticket } from '../../utils/api';
import { TicketStatus } from '../../types/ticket';
import api from '../../utils/api';

const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-block";
  const statusClasses = {
    [TicketStatus.OPEN]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    [TicketStatus.IN_PROGRESS]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    [TicketStatus.CLOSED]: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Ticket, direction: 'asc' | 'desc' } | null>({ 
    key: 'createdAt', 
    direction: 'desc'
  });
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const myId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  
  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = viewMode === 'all' ? await getTickets() : await getMyTickets();
      setTickets(data || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };
  
  // WebSocket for real-time ticket updates
  const { isConnected } = useWebSocket({
    userId: myId,
    onMessage: (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "ticket_created" || data.type === "ticket_updated" || data.type === "ticket_message_added") {
        const ticket: Ticket = data.ticket;
        
        // Show notification
        notificationService.showNotification(
          data.type === "ticket_created" ? "New Ticket Created" : 
          data.type === "ticket_message_added" ? "New Message on Ticket" : "Ticket Updated",
          {
            body: `${ticket.name} - ${ticket.status}`,
            data: { ticketId: ticket._id || ticket.id, url: `/tickets/${ticket._id || ticket.id}` }
          }
        );
        
        // Reload tickets
        loadTickets();
      }
    }
  });

  useEffect(() => {
    loadTickets();
  }, [viewMode]);

  const sortedAndFilteredTickets = useMemo(() => {
    let sortableTickets = [...tickets];
    
    if (filterStatus !== 'all') {
      sortableTickets = sortableTickets.filter(ticket => ticket.status === filterStatus);
    }

    if (sortConfig !== null) {
      sortableTickets.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Tickets</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track your support tickets</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'all' ? 'my' : 'all')}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {viewMode === 'all' ? 'My Tickets' : 'All Tickets'}
              </button>
              <button
                onClick={() => router.push('/tickets/raise')}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                + Raise New Ticket
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'all')}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value={TicketStatus.OPEN}>Open</option>
                <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
                <option value={TicketStatus.CLOSED}>Closed</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => requestSort('id')}
                    >
                      Case ID {getSortIndicator('id')}
                    </th>
                    <th scope="col" className="px-6 py-3">Name / Subject</th>
                    <th scope="col" className="px-6 py-3">POC Name</th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => requestSort('travelDate')}
                    >
                      Travel Date {getSortIndicator('travelDate')}
                    </th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                        Loading tickets...
                      </td>
                    </tr>
                  ) : sortedAndFilteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                        No tickets found for this filter.
                      </td>
                    </tr>
                  ) : (
                    sortedAndFilteredTickets.map((ticket) => (
                      <tr 
                        key={ticket._id || ticket.id} 
                        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {ticket.id}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{ticket.name}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{ticket.pocName}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                          {new Date(ticket.travelDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => router.push(`/tickets/${ticket._id || ticket.id}`)}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
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
      </div>
    </div>
  );
}

