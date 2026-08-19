import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecordPreview from './RecordPreview';
import { SeasonModeProvider } from '@/context/SeasonModeContext';

// With no picks locked in the session store, RecordPreview should show the
// honest empty prompt rather than any zeroed-out fake stats.
describe('RecordPreview', () => {
  it('shows an empty-state prompt when the user has made no picks', () => {
    render(
      <SeasonModeProvider>
        <MemoryRouter>
          <RecordPreview />
        </MemoryRouter>
      </SeasonModeProvider>,
    );
    expect(screen.getByText(/haven't made a pick yet/i)).toBeInTheDocument();
  });
});
