import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import { STORAGE_VERSION, loadState, saveState } from '@/core/storage';
import type { LoadOutcome, StorageLike } from '@/core/storage';
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

    const outcome: LoadOutcome =
      storage === null ? { status: 'empty' } : loadState(storage, new Date());
    if (outcome.status === 'restored') {
      dispatch({ type: 'restore', stored: outcome.state });
      return;
    }
    if (outcome.status === 'unreadable') {
      dispatch({ type: 'storage-unreadable' });
      return;
    }
    dispatch({ type: 'hydration-finished' });
  }, [dispatch, storage]);

  useEffect(() => {
    // Запись до гидратации затёрла бы сохранённую библиотеку пустой начальной.
    // Нечитаемое значение затёрла бы точно так же — с той разницей, что его
    // ещё можно разобрать руками, пока оно цело.
    if (!state.hydrated || storage === null || state.storageUnreadable) return;

    const saved = saveState(storage, {
      version: STORAGE_VERSION,
      decks: state.decks,
      activeDeckId: state.activeDeckId,
    });
    if (!saved && !state.storageFailed) {
      dispatch({ type: 'storage-failed' });
    }
  }, [
    state.hydrated,
    state.decks,
    state.activeDeckId,
    state.storageFailed,
    state.storageUnreadable,
    dispatch,
    storage,
  ]);
}
