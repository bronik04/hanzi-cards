import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportScreen from '@/screens/ImportScreen';
import { renderWithProvider } from '@/test/render';

const TABLE = '你好\tni3 hao3\tпривет\n谢谢\txie4xie5\tспасибо';

async function paste(text: string) {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Таблица со словами'));
  await user.paste(text);
  return user;
}

describe('ImportScreen', () => {
  it('кнопка создания колоды выключена на пустом вводе', () => {
    renderWithProvider(<ImportScreen />);
    expect(screen.getByRole('button', { name: 'Создать колоду' })).toBeDisabled();
  });

  it('показывает превью разобранных карточек', async () => {
    renderWithProvider(<ImportScreen />);
    await paste(TABLE);
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText('nǐ hǎo')).toBeInTheDocument();
    expect(screen.getByText('привет')).toBeInTheDocument();
  });

  it('сообщает о числе добавленных карточек', async () => {
    renderWithProvider(<ImportScreen />);
    await paste(TABLE);
    expect(screen.getByText('Добавлено 2 карточки')).toBeInTheDocument();
  });

  it('сообщает о пропущенных строках', async () => {
    renderWithProvider(<ImportScreen />);
    await paste('你好,привет\nмусор');
    expect(screen.getByText('Добавлено 1 карточка, пропущена 1 строка')).toBeInTheDocument();
  });

  it('показывает не больше пяти строк превью', async () => {
    renderWithProvider(<ImportScreen />);
    await paste(Array.from({ length: 9 }, (_, i) => `字${i},слово${i}`).join('\n'));
    expect(screen.getAllByTestId('preview-row')).toHaveLength(5);
    expect(screen.getByText('…и ещё 4')).toBeInTheDocument();
  });

  it('переключатель колонок меняет разбор', async () => {
    renderWithProvider(<ImportScreen />);
    const user = await paste('你好,hello,greeting');
    expect(screen.getByText('hello')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Иероглиф + перевод'));
    expect(screen.getByText('hello, greeting')).toBeInTheDocument();
  });

  it('кнопка отмены скрыта, пока колоды нет', () => {
    renderWithProvider(<ImportScreen />);
    expect(screen.queryByRole('button', { name: 'Отменить' })).not.toBeInTheDocument();
  });
});
