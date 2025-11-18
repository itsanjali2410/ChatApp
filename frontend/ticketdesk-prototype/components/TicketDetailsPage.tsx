
import React, { useState } from 'react';
import type { Page } from '../types';
import { TicketStatus } from '../types';
import { useTickets } from '../hooks/useTickets';
import { SendIcon, PaperclipIcon, MessageSquareIcon, FileTextIcon } from './icons';

interface TicketDetailsPageProps {
  ticketId: string;
  navigateTo: (page: Page) => void;
}

const TicketDetailsPage: React.FC<TicketDetailsPageProps> = ({ ticketId, navigateTo }) => {
  const { getTicketById, updateTicketStatus, addNoteToTicket, addMessageToTicket } = useTickets();
  const ticket = getTicketById(ticketId);
  
  const [newNote, setNewNote] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  if (!ticket) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Ticket not found</h2>
        <button onClick={() => navigateTo({ type: 'dashboard' })} className="mt-4 text-brand-primary hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteToTicket(ticketId, newNote);
      setNewNote('');
    }
  };

  const handleAddMessage = () => {
    if (newMessage.trim() || attachment) {
      const message = {
        author: ticket.pocName, // Simulating user message
        content: newMessage,
        attachment: attachment ? { name: attachment.name, url: URL.createObjectURL(attachment) } : undefined
      };
      addMessageToTicket(ticketId, message);
      setNewMessage('');
      setAttachment(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };
  
  const StatusBadge: React.FC<{ status: TicketStatus, large?: boolean }> = ({ status, large = false }) => {
      const baseClasses = large ? "px-4 py-1.5 text-sm font-bold rounded-lg" : "px-3 py-1 text-xs font-semibold rounded-full";
      const statusClasses = {
        [TicketStatus.OPEN]: "bg-blue-100 text-blue-800",
        [TicketStatus.IN_PROGRESS]: "bg-yellow-100 text-yellow-800",
        [TicketStatus.CLOSED]: "bg-slate-200 text-slate-800",
      };
      return <span className={`inline-block ${baseClasses} ${statusClasses[status]}`}>{status}</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-brand-text">{ticket.name}</h1>
          <p className="text-slate-500">Case ID: {ticket.id}</p>
        </div>
        <button onClick={() => navigateTo({ type: 'dashboard' })} className="text-sm text-brand-primary hover:underline">
            &larr; Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Section A: Main Details */}
          <div className="bg-brand-card p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Main Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 text-sm">
                <DetailItem label="POC Name" value={ticket.pocName} />
                <DetailItem label="Mobile" value={ticket.mobile} />
                <DetailItem label="Destination" value={ticket.destination} />
                <DetailItem label="Pax" value={String(ticket.pax)} />
                <DetailItem label="Infants" value={String(ticket.infants)} />
                <DetailItem label="Travel Date" value={new Date(ticket.travelDate).toLocaleDateString()} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="font-semibold text-slate-600 mb-1">Request Body:</p>
                <p className="text-slate-800 whitespace-pre-wrap">{ticket.body}</p>
            </div>
          </div>
          
          {/* Section C: Communication Feed */}
          <div className="bg-brand-card p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><MessageSquareIcon className="w-5 h-5"/>Communication Feed</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {ticket.communication.length > 0 ? ticket.communication.map(msg => (
                <div key={msg.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-sm text-brand-text">{msg.author}</p>
                    <p className="text-xs text-slate-400">{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-slate-700">{msg.content}</p>
                  {msg.attachment && (
                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-brand-primary hover:underline">
                      <PaperclipIcon className="w-4 h-4"/>{msg.attachment.name}
                    </a>
                  )}
                </div>
              )) : <p className="text-sm text-slate-400 text-center py-4">No messages yet.</p>}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Post a new message..."
                rows={3}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-accent focus:border-transparent transition"
              />
              <div className="flex justify-between items-center mt-2">
                <div>
                  <label htmlFor="attachment" className="cursor-pointer text-slate-500 hover:text-brand-primary transition-colors p-2 rounded-full inline-flex items-center gap-2">
                    <PaperclipIcon className="w-5 h-5"/>
                    <span className="text-sm">{attachment ? attachment.name : "Attach File"}</span>
                  </label>
                  <input id="attachment" type="file" onChange={handleFileChange} className="hidden"/>
                </div>
                <button onClick={handleAddMessage} className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-accent transition-all duration-200 transform hover:scale-105">
                  Send <SendIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Section B: Status & Actions */}
          <div className="bg-brand-card p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Status & Actions</h2>
            <div className="flex items-center gap-4 mb-4">
                <span className="font-medium">Current Status:</span> <StatusBadge status={ticket.status} large/>
            </div>
            <select
              value={ticket.status}
              onChange={(e) => updateTicketStatus(ticketId, e.target.value as TicketStatus)}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            >
              <option value={TicketStatus.OPEN}>Set to Open</option>
              <option value={TicketStatus.IN_PROGRESS}>Set to In Progress</option>
              <option value={TicketStatus.CLOSED}>Set to Closed</option>
            </select>
          </div>
          
          <div className="bg-brand-card p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><FileTextIcon className="w-5 h-5" />Internal Notes/Logs</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
              {ticket.notes.length > 0 ? ticket.notes.map(note => (
                <div key={note.id} className="text-xs p-3 bg-yellow-50 border-l-4 border-yellow-300 rounded-r-lg">
                  <p className="font-semibold text-yellow-800">{note.author} <span className="font-normal text-yellow-600">- {new Date(note.createdAt).toLocaleString()}</span></p>
                  <p className="text-yellow-700 mt-1">{note.content}</p>
                </div>
              )) : <p className="text-sm text-slate-400 text-center py-4">No internal notes.</p>}
            </div>
            <div className="pt-4 border-t border-slate-200">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal note..."
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-accent focus:border-transparent transition"
                />
                <button onClick={handleAddNote} className="w-full mt-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-slate-700 transition-all duration-200 transform hover:scale-105">
                    Add Note
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem: React.FC<{label: string, value: string}> = ({ label, value }) => (
    <div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-brand-text font-medium">{value}</p>
    </div>
);

export default TicketDetailsPage;
