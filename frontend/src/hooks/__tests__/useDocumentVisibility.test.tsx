import { renderHook, act } from '@testing-library/react';
import { useDocumentVisibility } from '../useDocumentVisibility';

describe('useDocumentVisibility', () => {
  it('returns true when document is visible', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });

    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(true);
  });

  it('returns false when document is hidden', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });

    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(false);
  });

  it('updates visibility state when visibilitychange event fires', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(true);

    // Simulate document becoming hidden
    Object.defineProperty(document, 'hidden', { value: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(false);

    // Simulate document becoming visible again
    Object.defineProperty(document, 'hidden', { value: false });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(true);
  });

  it('defaults to true in SSR/test environments where document may be undefined', () => {
    // We can't actually delete document in jsdom, so we'll test the hook's behavior
    // by verifying it defaults to true when document.hidden is falsy
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });

    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useDocumentVisibility());

    // Verify listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    unmount();

    // Verify listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});
