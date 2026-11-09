import { useRef } from 'react';

// Ref that always holds the latest value - lets stable callbacks read fresh state
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
