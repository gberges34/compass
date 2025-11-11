import { useEffect, useState } from 'react';

/**
 * Returns true when the document is visible (not hidden).
 * Defaults to true in SSR/test environments where document may be undefined.
 */
export function useDocumentVisibility() {
  const getVisibilityState = () => {
    if (typeof document === 'undefined') {
      return true;
    }
    return !document.hidden;
  };

  const [isVisible, setIsVisible] = useState<boolean>(getVisibilityState);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleChange = () => {
      setIsVisible(getVisibilityState());
    };

    document.addEventListener('visibilitychange', handleChange);
    return () => {
      document.removeEventListener('visibilitychange', handleChange);
    };
  }, []);

  return isVisible;
}
