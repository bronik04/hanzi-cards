import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { appReducer, initialState } from '@/state/appReducer';
import type { AppAction, AppState } from '@/state/appReducer';

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<AppAction> | null>(null);

/** `initial` нужен только тестам: он позволяет отрисовать экран с готовой колодой. */
export function AppProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(appReducer, initial ?? initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (state === null) throw new Error('useAppState must be used inside AppProvider');
  return state;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const dispatch = useContext(DispatchContext);
  if (dispatch === null) throw new Error('useAppDispatch must be used inside AppProvider');
  return dispatch;
}
