// Custom hook for double tap detection

import { useRef, useCallback } from 'react';

export const useDoubleTap = (
  onDoubleTap: () => void,
  delay: number = 300
) => {
  const tapCount = useRef(0);
  const lastTap = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < delay) {
      onDoubleTap();
      tapCount.current = 0;
      lastTap.current = 0;
    } else {
      tapCount.current = 1;
      lastTap.current = now;
    }
  }, [onDoubleTap, delay]);

  return handleTap;
};

