import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdatePrompt from '@/components/UpdatePrompt';

const updateServiceWorker = vi.fn();
let needRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

describe('UpdatePrompt', () => {
  beforeEach(() => {
    needRefresh = false;
    updateServiceWorker.mockClear();
  });

  it('молчит, пока новой версии нет', () => {
    render(<UpdatePrompt />);
    expect(screen.queryByText('Доступна новая версия')).not.toBeInTheDocument();
  });

  it('предлагает обновиться, когда версия готова', async () => {
    needRefresh = true;
    const user = userEvent.setup();
    render(<UpdatePrompt />);

    expect(screen.getByText('Доступна новая версия')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Обновить' }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
