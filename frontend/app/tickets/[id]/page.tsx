'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  getTicket, 
  updateTicket, 
  addTicketNote, 
  addTicketMessage 
} from '../../../utils/api';
import { Ticket, TicketStatus, type TicketMessageCreate } from '../../../types/ticket';

const StatusBadge: React.FC<{ status: TicketStatus; large?: boolean }> = ({ status, large = false }) => {
  const baseClasses = large 
    ? "px-4 py-1.5 text-sm font-bold rounded-lg" 
    : "px-3 py-1 text-xs font-semibold rounded-full";
  const statusClasses = {
    [TicketStatus.OPEN]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    [TicketStatus.IN_PROGRESS]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    [TicketStatus.CLOSED]: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  };
  return <span className={`inline-block ${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
    <p className="text-gray-900 dark:text-gray-100 font-medium">{value}</p>
  </div>
);

export default function TicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTicket(ticketId);
      setTicket(data);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !ticket) return;
    
    try {
      setSubmitting(true);
      const updated = await addTicketNote(ticket._id || ticket.id, newNote);
      setTicket(updated);
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Failed to add note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !ticket) return;
    
    try {
      setSubmitting(true);
      const messageData: TicketMessageCreate = {
        content: newMessage.trim(),
      };
      
      if (attachment) {
        // TODO: Upload file and get URL
        // For now, just use a placeholder
        messageData.attachment = {
          name: attachment.name,
          url: URL.createObjectURL(attachment)
        };
      }
      
      const updated = await addTicketMessage(ticket._id || ticket.id, messageData);
      setTicket(updated);
      setNewMessage('');
      setAttachment(null);
    } catch (error) {
      console.error('Failed to add message:', error);
      alert('Failed to add message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    
    try {
      const updated = await updateTicket(ticket._id || ticket.id, { status: newStatus });
      setTicket(updated);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading ticket...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket not found</h2>
          <button 
            onClick={() => router.push('/tickets')} 
            className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <button
              onClick={() => router.push('/tickets')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
            >
              ← Back to Tickets
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{ticket.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">Case ID: {ticket.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Main Details */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Main Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 text-sm">
                <DetailItem label="POC Name" value={ticket.pocName} />
                <DetailItem label="Mobile" value={ticket.mobile} />
                <DetailItem label="Destination" value={ticket.destination} />
                <DetailItem label="Adults" value={String(ticket.adults ?? ticket.pax ?? 0)} />
                <DetailItem label="Children" value={String(ticket.children ?? 0)} />
                <DetailItem label="Infants" value={String(ticket.infants)} />
                <DetailItem label="Travel Date" value={new Date(ticket.travelDate).toLocaleDateString()} />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1">Request Body:</p>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ticket.body}</p>
              </div>
            </div>
            
            {/* Communication Feed */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Communication Feed</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {ticket.communication.length > 0 ? ticket.communication.map(msg => (
                  <div key={msg.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{msg.author}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{msg.content}</p>
                    {msg.attachment && (
                      <a 
                        href={msg.attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        📎 {msg.attachment.name}
                      </a>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No messages yet.</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Post a new message..."
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <label htmlFor="attachment" className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-full inline-flex items-center gap-2">
                      📎 <span className="text-sm">{attachment ? attachment.name : "Attach File"}</span>
                    </label>
                    <input id="attachment" type="file" onChange={handleFileChange} className="hidden"/>
                  </div>
                  <button 
                    onClick={handleAddMessage}
                    disabled={submitting || (!newMessage.trim() && !attachment)}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Send →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Status & Actions */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Status & Actions</h2>
              <div className="flex items-center gap-4 mb-4">
                <span className="font-medium text-gray-700 dark:text-gray-300">Current Status:</span>
                <StatusBadge status={ticket.status} large />
              </div>
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={TicketStatus.OPEN}>Set to Open</option>
                <option value={TicketStatus.IN_PROGRESS}>Set to In Progress</option>
                <option value={TicketStatus.CLOSED}>Set to Closed</option>
              </select>
            </div>
            
            {/* Internal Notes */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Internal Notes/Logs</h2>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
                {ticket.notes.length > 0 ? ticket.notes.map(note => (
                  <div key={note.id} className="text-xs p-3 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-300 dark:border-yellow-600 rounded-r-lg">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                      {note.author} <span className="font-normal text-yellow-600 dark:text-yellow-400">
                        - {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">{note.content}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No internal notes.</p>
                )}
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal note..."
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button 
                  onClick={handleAddNote}
                  disabled={submitting || !newNote.trim()}
                  className="w-full mt-2 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

