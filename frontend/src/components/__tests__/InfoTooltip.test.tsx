import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import InfoTooltip from '../InfoTooltip';

const setTouchMatchMedia = (isTouch: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: isTouch,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('InfoTooltip (touch mode)', () => {
  beforeEach(() => {
    setTouchMatchMedia(true);
  });

  it('toggles open on tap and closes on outside tap', () => {
    render(
      <div>
        <InfoTooltip ariaLabel="About execution rate" content={<div>Tooltip body</div>} />
        <button type="button">Outside</button>
      </div>
    );

    const trigger = screen.getByRole('button', { name: /about execution rate/i });
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'false');

    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'true');

    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'false');
  });

  it('closes on Escape', () => {
    render(<InfoTooltip ariaLabel="About execution rate" content={<div>Tooltip body</div>} />);
    const trigger = screen.getByRole('button', { name: /about execution rate/i });

    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'false');
  });
});

