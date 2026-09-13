import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import { STORAGE_VERSION, loadState, saveState } from '@/core/storage';
import type { StorageLike } from '@/core/storage';
import type { AppAction, AppState } from '@/state/appReducer';

/** localStorage недоступен в некоторых приватных режимах — обращение к нему бросает. */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function usePersistence(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  storage: StorageLike | null,
): void {
  // Ref, а не состояние: StrictMode вызывает эффекты дважды, читать нужно один раз.
  const loadAttempted = useRef(false);

  useEffect(() => {
    if (loadAttempted.current) return;
    loadAttempted.current = true;

    const restored = storage === null ? null : loadState(storage);
    if (restored === null) {
      dispatch({ type: 'hydration-finished' });
      return;
    }
    dispatch({ type: 'restore', stored: restored });
  }, [dispatch, storage]);

  useEffect(() => {
    // Запись до гидратации затёрла бы сохранённое состояние пустым начальным.
    if (!state.hydrated || storage === null) return;

    const saved = saveState(storage, {
      version: STORAGE_VERSION,
      cards: state.cards,
      direction: state.direction,
      session: state.session,
      stats: state.stats,
      startedMode: state.startedMode,
    });
    if (!saved && !state.storageFailed) {
      dispatch({ type: 'storage-failed' });
    }
  }, [
    state.hydrated,
    state.cards,
    state.direction,
    state.session,
    state.stats,
    state.startedMode,
    state.storageFailed,
    dispatch,
    storage,
  ]);
}
