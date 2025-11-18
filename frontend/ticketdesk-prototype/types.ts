
export enum TicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  CLOSED = 'Closed',
}

export interface Note {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Message {
  id: string;
  author: string;
  content: string;
  attachment?: {
    name: string;
    url: string;
  };
  createdAt: string;
}

export interface Ticket {
  id: string;
  pocName: string;
  name: string;
  mobile: string;
  destination: string;
  pax: number;
  infants: number;
  body: string;
  status: TicketStatus;
  travelDate: string;
  createdAt: string;
  notes: Note[];
  communication: Message[];
}

export type Page = 
  | { type: 'dashboard' } 
  | { type: 'raise' } 
  | { type: 'details'; ticketId: string };
