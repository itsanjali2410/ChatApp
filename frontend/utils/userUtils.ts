// Utility functions for user-related operations

import type { User } from '../types/chat';

export const getDisplayName = (user: User): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.username || user.email;
};

export const getInitials = (user: User): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  return (user.username || user.email).substring(0, 2).toUpperCase();
};

