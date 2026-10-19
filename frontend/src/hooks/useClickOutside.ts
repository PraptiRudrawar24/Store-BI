import { useEffect, type RefObject } from 'react';

/**
 * Custom hook to detect clicks outside of a specified element.
 * Useful for dropdowns, modals, and dynamic animated toolbars.
 *
 * @param ref - React ref of the element to monitor
 * @param handler - Callback function invoked on outside click or touch
 */
export default function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      const el = ref?.current;

      // Do nothing if clicking ref's element or descendant elements
      if (!el || !target || el.contains(target)) {
        return;
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
