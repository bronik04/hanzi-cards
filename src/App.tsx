import UpdatePrompt from '@/components/UpdatePrompt';
import type { StorageLike } from '@/core/storage';
import { browserStorage, usePersistence } from '@/hooks/usePersistence';
import DoneScreen from '@/screens/DoneScreen';
import ImportScreen from '@/screens/ImportScreen';
import LibraryScreen from '@/screens/LibraryScreen';
import ModeScreen from '@/screens/ModeScreen';
import ResumeScreen from '@/screens/ResumeScreen';
import TrainingScreen from '@/screens/TrainingScreen';
import { AppProvider, useAppDispatch, useAppState } from '@/state/AppContext';
import type { AppState, Screen } from '@/state/appReducer';

/** `storage` переопределяют только тесты; приложение берёт localStorage. */
export default function App({ storage = browserStorage() }: { storage?: StorageLike | null }) {
  return (
    <AppProvider>
      <Screens storage={storage} />
    </AppProvider>
  );
}

function Screens({ storage }: { storage: StorageLike | null }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  usePersistence(state, dispatch, storage);

  // Пока хранилище не прочитано, показывать нечего: иначе на мгновение
  // мелькнёт экран импорта поверх сохранённой сессии.
  if (!state.hydrated) return null;
  const warning = warningText(state);

  return (
    <>
      <UpdatePrompt />
      {warning !== null && (
        <p className="warning" role="status">
          {warning}
        </p>
      )}
      {renderScreen(state.screen)}
    </>
  );
}

/** Оба предупреждения делят один слот, и вместе они не возникают: при
 *  нечитаемом хранилище запись не делается, а значит и отказать ей негде. */
function warningText(state: AppState): string | null {
  if (state.storageUnreadable) {
    return 'Сохранённую библиотеку не удалось прочитать: она осталась в браузере нетронутой, но новые изменения не сохраняются. Откройте библиотеку и загрузите её из файла.';
  }
  if (state.storageFailed) {
    return 'Прогресс не сохраняется: браузер не разрешает запись. Сохраните библиотеку в файл, чтобы не потерять колоды.';
  }
  return null;
}

function renderScreen(screen: Screen) {
  switch (screen) {
    case 'library':
      return <LibraryScreen />;
    case 'resume':
      return <ResumeScreen />;
    case 'import':
      return <ImportScreen />;
    case 'mode':
      return <ModeScreen />;
    case 'training':
      return <TrainingScreen />;
    case 'done':
      return <DoneScreen />;
  }
}
