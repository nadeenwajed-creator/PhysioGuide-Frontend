import { useEffect, useState } from 'react';

// Recount visible cards when the container or sidebar changes size
export default function useVisibleItems(ref, minimum, maximum) {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setCount(Math.max(1, Math.min(maximum, Math.floor((entry.contentRect.width + 14) / minimum))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, minimum, maximum]);
  return count;
}
