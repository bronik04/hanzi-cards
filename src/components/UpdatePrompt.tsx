import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-prompt" role="status">
      <span>Доступна новая версия</span>
      <button type="button" className="btn" onClick={() => void updateServiceWorker(true)}>
        Обновить
      </button>
    </div>
  );
}
