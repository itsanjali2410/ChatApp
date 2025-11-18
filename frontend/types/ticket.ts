export enum TicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  CLOSED = 'Closed',
}

export interface Note {
  id: string;
  author: string;
  author_id: string;
  content: string;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  author: string;
  author_id: string;
  content: string;
  attachment?: {
    name: string;
    url: string;
  };
  createdAt: string;
}

export interface Ticket {
  _id?: string;
  id: string;
  name: string;
  pocName: string;
  mobile: string;
  destination: string;
  pax?: number; // For backward compatibility
  adults?: number;
  children?: number;
  infants: number;
  body: string;
  status: TicketStatus;
  travelDate: string;
  createdAt: string;
  updatedAt?: string;
  organization_id: string;
  created_by: string;
  assigned_to?: string;
  pocId?: string; // User ID of the POC
  notes: Note[];
  communication: TicketMessage[];
}

export interface TicketCreate {
  name: string;
  pocName: string;
  mobile: string;
  destination: string;
  pax?: number; // For backward compatibility
  adults?: number;
  children?: number;
  infants: number;
  body: string;
  travelDate: string;
  pocId?: string; // User ID of the POC
}

export interface TicketUpdate {
  status?: TicketStatus;
  assigned_to?: string;
}

