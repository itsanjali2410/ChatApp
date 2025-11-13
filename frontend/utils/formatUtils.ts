// Utility functions for formatting dates, times, and text

export const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      const utcDate = new Date(timestamp + 'Z');
      if (isNaN(utcDate.getTime())) return "Invalid time";
      return utcDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Timestamp formatting error:', error);
    return "Invalid time";
  }
};

export const formatMessageDate = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      const utcDate = new Date(timestamp + 'Z');
      if (isNaN(utcDate.getTime())) return "Invalid date";
      return utcDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Message date formatting error:', error);
    return "Invalid date";
  }
};

const parseFlexibleDate = (input?: string): Date | null => {
  if (!input) return null;

  const direct = new Date(input);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  if (!input.endsWith('Z')) {
    const withZ = new Date(`${input}Z`);
    if (!Number.isNaN(withZ.getTime())) {
      return withZ;
    }
  }

  return null;
};

export const formatLastSeen = (user: { is_online?: boolean; last_seen?: string } | undefined): string => {
  if (!user) return "last seen recently";
  if (user.is_online) return "online";
  const lastSeenRaw = user.last_seen;
  if (!lastSeenRaw) return "last seen recently";

  try {
    const lastSeenDate = parseFlexibleDate(lastSeenRaw);
    if (!lastSeenDate) return "last seen recently";

    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    
    // Handle negative differences (future dates) - shouldn't happen but handle gracefully
    if (diffMs < 0) return "last seen just now";
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Show relative time
    if (diffSecs < 30) return "last seen just now";
    if (diffMins < 1) return "last seen just now";
    if (diffMins < 60) return `last seen ${diffMins}m ago`;
    if (diffHours < 24) return `last seen ${diffHours}h ago`;
    if (diffDays === 1) return "last seen yesterday";
    if (diffDays < 7) return `last seen ${diffDays}d ago`;
    
    // If more than a week ago, show exact date and time
    const dateStr = lastSeenDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = lastSeenDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
    return `last seen ${dateStr} • ${timeStr}`;
  } catch {
    return "last seen recently";
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatSeenTime = (seenAt: string): string | null => {
  try {
    const seenDate = parseFlexibleDate(seenAt);
    if (!seenDate) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - seenDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return seenDate.toLocaleDateString();
  } catch {
    return null;
  }
};

export const formatExactTime = (isoLike: string | undefined): string | null => {
  if (!isoLike) return null;
  try {
    const parsed = parseFlexibleDate(isoLike);
    if (!parsed) return null;
    const d = parsed;
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return null;
  }
};

export const formatSeenFull = (isoLike: string | undefined): string | null => {
  if (!isoLike) return null;
  try {
    const parsed = parseFlexibleDate(isoLike);
    if (!parsed) return null;
    const d = parsed;
    const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
  } catch {
    return null;
  }
};

export const shouldShowDateSeparator = (currentMessage: { timestamp: string }, previousMessage: { timestamp: string } | null): boolean => {
  if (!previousMessage) return true;
  const currentDate = new Date(currentMessage.timestamp);
  const previousDate = new Date(previousMessage.timestamp);
  return currentDate.toDateString() !== previousDate.toDateString();
};

