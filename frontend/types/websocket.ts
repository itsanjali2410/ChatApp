export type TypingPayload = {
  type: 'typing';
  chat_id: string;
  is_typing: boolean;
};

export type MarkReadPayload = {
  type: 'mark_read';
  chat_id: string;
};

export type MarkDeliveredPayload = {
  type: 'mark_delivered';
  chat_id: string;
};

export type JoinChatPayload = {
  type: 'join_chat';
  chat_id: string;
};

export type GenericPayload = {
  type: string;
  [key: string]: unknown;
};

export type WebSocketSendMessagePayload =
  | TypingPayload
  | MarkReadPayload
  | MarkDeliveredPayload
  | JoinChatPayload
  | GenericPayload;

export type WebSocketSendMessage = (payload: WebSocketSendMessagePayload) => void;

