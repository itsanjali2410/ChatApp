// Custom hook for long press detection

import { useRef, useCallback } from 'react';

export const useLongPress = (
  onLongPress: () => void,
  delay: number = 500
) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef(false);

  const start = useCallback(() => {
    isLongPressing.current = true;
    longPressTimer.current = setTimeout(() => {
      onLongPress();
      isLongPressing.current = false;
    }, delay);
  }, [onLongPress, delay]);

  const stop = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isLongPressing.current = false;
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: stop,
    isLongPressing: isLongPressing.current,
  };
};

