import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AppProvider } from '@/state/AppContext';
import type { AppState } from '@/state/appReducer';

export function renderWithProvider(ui: ReactElement, initial?: AppState): RenderResult {
  return render(<AppProvider initial={initial}>{ui}</AppProvider>);
}
