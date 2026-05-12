
import { useEffect, useRef } from 'react';

export function useInterval(callback: () => void, delay: number | null) {
  // Initialize with undefined to satisfy the requirement for an initial argument in strict environments
  const savedCallback = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current?.(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
