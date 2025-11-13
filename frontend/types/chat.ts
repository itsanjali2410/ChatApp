// Shared types for chat functionality

export type User = {
  _id: string;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  is_online?: boolean;
  is_typing?: boolean;
  current_chat_id?: string;
  role?: string;
  last_seen?: string;
};

export type Chat = {
  id: string;
  type: string;
  participants: string[];
  organization_id: string;
  group_name?: string;
  group_description?: string;
  group_avatar?: string;
  created_by?: string;
  admins?: string[];
  created_at?: string;
};

export type FileAttachment = {
  file_id: string;
  filename: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  size: number;
};

export type ReplyTo = {
  message_id: string;
  message_text: string;
  sender_id: string;
  sender_name: string;
};

export type SeenByUser = {
  user_id: string;
  username: string;
  seen_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  message_type: string;
  attachment?: FileAttachment;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read' | 'error';
  seen_at?: string;
  seenBy?: SeenByUser[];
  reply_to?: ReplyTo;
  reactions?: Array<{ emoji: string; users: string[] }>;
  edited?: boolean;
  edited_at?: string;
};

