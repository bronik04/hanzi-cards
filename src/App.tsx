import UpdatePrompt from '@/components/UpdatePrompt';
import type { StorageLike } from '@/core/storage';
import { browserStorage, usePersistence } from '@/hooks/usePersistence';
import DoneScreen from '@/screens/DoneScreen';
import ImportScreen from '@/screens/ImportScreen';
import ModeScreen from '@/screens/ModeScreen';
import ResumeScreen from '@/screens/ResumeScreen';
import TrainingScreen from '@/screens/TrainingScreen';
import { AppProvider, useAppDispatch, useAppState } from '@/state/AppContext';
import type { Screen } from '@/state/appReducer';

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

  return (
    <>
      <UpdatePrompt />
      {state.storageFailed && (
        <p className="warning" role="status">
          Прогресс не сохраняется: браузер не разрешает запись.
        </p>
      )}
      {renderScreen(state.screen)}
    </>
  );
}

function renderScreen(screen: Screen) {
  switch (screen) {
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
