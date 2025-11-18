import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { Ticket, Note, Message } from '../types';
import { TicketStatus } from '../types';

const generateDummyData = (): Ticket[] => [
  {
    id: 'TKT-001',
    name: 'Corporate Trip Q4',
    pocName: 'Alice Johnson',
    mobile: '123-456-7890',
    destination: 'Paris, France',
    pax: 15,
    infants: 0,
    body: 'We need to arrange a 5-day trip for our executive team. This includes flights, 5-star accommodation, and a conference room booking.',
    status: TicketStatus.OPEN,
    travelDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: [],
    communication: [],
  },
  {
    id: 'TKT-002',
    name: 'Family Vacation',
    pocName: 'Bob Williams',
    mobile: '234-567-8901',
    destination: 'Kyoto, Japan',
    pax: 4,
    infants: 1,
    body: 'Looking for a 10-day family-friendly package to Kyoto during cherry blossom season. Interested in cultural experiences.',
    status: TicketStatus.IN_PROGRESS,
    travelDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: [
      { id: 'N1', author: 'Agent Smith', content: 'Client has a budget of $10,000. Sent initial itinerary.', createdAt: new Date().toISOString() }
    ],
    communication: [
      { id: 'C1', author: 'Bob Williams', content: 'The itinerary looks great! Can we add a tea ceremony experience?', createdAt: new Date().toISOString() }
    ],
  },
  {
    id: 'TKT-003',
    name: 'Annual Sales Conference',
    pocName: 'Charlie Brown',
    mobile: '345-678-9012',
    destination: 'Las Vegas, USA',
    pax: 120,
    infants: 0,
    body: 'Booking for our annual sales conference. Need a large venue, catering, and accommodation for all attendees for 3 nights.',
    status: TicketStatus.CLOSED,
    travelDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    notes: [],
    communication: [],
  },
];

interface TicketsContextType {
  tickets: Ticket[];
  getTicketById: (id: string) => Ticket | undefined;
  addTicket: (newTicket: Omit<Ticket, 'id' | 'createdAt' | 'status' | 'notes' | 'communication' | 'travelDate'> & { travelDate: string }) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  addNoteToTicket: (id: string, noteContent: string) => void;
  addMessageToTicket: (id: string, message: Omit<Message, 'id' | 'createdAt'>) => void;
  loading: boolean;
}

const TicketsContext = createContext<TicketsContextType | undefined>(undefined);

export const TicketsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedTickets = localStorage.getItem('tickets');
      if (storedTickets) {
        setTickets(JSON.parse(storedTickets));
      } else {
        const dummyData = generateDummyData();
        setTickets(dummyData);
        localStorage.setItem('tickets', JSON.stringify(dummyData));
      }
    } catch (error) {
      console.error("Failed to access localStorage:", error);
      setTickets(generateDummyData());
    } finally {
        setLoading(false);
    }
  }, []);

  const saveTickets = (updatedTickets: Ticket[]) => {
    setTickets(updatedTickets);
    try {
      localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  };

  const getTicketById = useCallback((id: string) => {
    return tickets.find(ticket => ticket.id === id);
  }, [tickets]);

  const addTicket = (newTicketData: Omit<Ticket, 'id' | 'createdAt' | 'status' | 'notes' | 'communication' | 'travelDate'> & { travelDate: string }) => {
    const newTicket: Ticket = {
      ...newTicketData,
      id: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      status: TicketStatus.OPEN,
      notes: [],
      communication: [],
    };
    saveTickets([newTicket, ...tickets]);
  };

  const updateTicketStatus = (id: string, status: TicketStatus) => {
    const updatedTickets = tickets.map(ticket => 
      ticket.id === id ? { ...ticket, status } : ticket
    );
    saveTickets(updatedTickets);
  };

  const addNoteToTicket = (id: string, content: string) => {
    const newNote: Note = {
      id: `N-${Date.now()}`,
      author: 'Agent Smith', // Hardcoded for prototype
      content,
      createdAt: new Date().toISOString(),
    };
    const updatedTickets = tickets.map(ticket =>
      ticket.id === id ? { ...ticket, notes: [...ticket.notes, newNote] } : ticket
    );
    saveTickets(updatedTickets);
  };

  const addMessageToTicket = (id: string, message: Omit<Message, 'id' | 'createdAt'>) => {
    const newMessage: Message = {
      ...message,
      id: `C-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updatedTickets = tickets.map(ticket =>
      ticket.id === id ? { ...ticket, communication: [...ticket.communication, newMessage] } : ticket
    );
    saveTickets(updatedTickets);
  };

  // FIX: Replaced JSX with React.createElement to be compatible with a .ts file.
  // The original JSX was causing compilation errors because this file does not have a .tsx extension.
  return React.createElement(TicketsContext.Provider, {
    value: { tickets, getTicketById, addTicket, updateTicketStatus, addNoteToTicket, addMessageToTicket, loading }
  }, children);
};

export const useTickets = (): TicketsContextType => {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketsProvider');
  }
  return context;
};
