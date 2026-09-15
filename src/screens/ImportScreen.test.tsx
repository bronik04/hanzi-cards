import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportScreen from '@/screens/ImportScreen';
import { renderWithProvider } from '@/test/render';
import { useActiveDeck } from '@/state/AppContext';

const TABLE = '你好\tni3 hao3\tпривет\n谢谢\txie4xie5\tспасибо';

async function paste(text: string) {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Таблица со словами'));
  await user.paste(text);
  return user;
}

/** Показывает ImportScreen рядом с именем только что созданной колоды: так
 *  видно, какое имя реально дошло до состояния приложения, а не только то,
 *  что осталось в поле ввода. */
function ImportWithProbe() {
  const deck = useActiveDeck();
  return (
    <>
      <ImportScreen />
      <p data-testid="active-deck-name">{deck?.name ?? 'none'}</p>
    </>
  );
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

  // Пустая библиотека — это свежий браузер или браузер после чистки: выход
  // отсюда единственный способ добраться до «Загрузить из файла».
  it('выход в библиотеку есть и при пустой библиотеке', () => {
    renderWithProvider(<ImportScreen />);
    expect(screen.getByRole('button', { name: 'В библиотеку' })).toBeInTheDocument();
  });

  it('подставляет имя-подсказку', () => {
    renderWithProvider(<ImportScreen />);
    const field = screen.getByLabelText('Название колоды');
    expect((field as HTMLInputElement).value.startsWith('Колода от')).toBe(true);
  });

  it('имя файла становится подсказкой', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);

    const file = new File(['你好\tni3 hao3\tпривет'], 'Юнит 5.tsv', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('Файл с таблицей'), file);

    expect(await screen.findByDisplayValue('Юнит 5')).toBeInTheDocument();
  });

  it('файл с именем из одного расширения не затирает подсказку', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);

    const field = screen.getByLabelText('Название колоды');
    const before = (field as HTMLInputElement).value;

    const file = new File(['你好\tni3 hao3\tпривет'], '.tsv', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('Файл с таблицей'), file);

    // Ждём обработки файла: превью появляется из того же reader.onload,
    // что и (несостоявшееся) обновление имени.
    await screen.findByText('你好');
    expect(field).toHaveValue(before);
  });

  it('введённое имя не затирается подсказкой из файла', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);

    const field = screen.getByLabelText('Название колоды');
    await user.clear(field);
    await user.type(field, 'Моё имя');

    const file = new File(['你好\tni3 hao3\tпривет'], 'Юнит 5.tsv', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('Файл с таблицей'), file);

    expect(field).toHaveValue('Моё имя');
  });

  // Спека: «Подсказка подставляется заранее: имя файла без расширения, если
  // колоду грузят файлом, иначе дата. Поле можно очистить — тогда используется
  // подсказка». Подсказка — та, что уже подставлена, а не заново вычисленная дата.
  it('очистка поля после загрузки файла даёт колоду с именем файла', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportWithProbe />);

    const file = new File(['你好\tni3 hao3\tпривет'], 'юнит-3.tsv', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('Файл с таблицей'), file);
    await screen.findByDisplayValue('юнит-3');

    await user.clear(screen.getByLabelText('Название колоды'));
    await user.click(screen.getByRole('button', { name: 'Создать колоду' }));

    expect(screen.getByTestId('active-deck-name')).toHaveTextContent('юнит-3');
  });

  it('очистка поля без файла даёт колоду с именем-датой', async () => {
    renderWithProvider(<ImportWithProbe />);
    await paste(TABLE);

    const field = screen.getByLabelText('Название колоды');
    const hint = (field as HTMLInputElement).value;
    const user = userEvent.setup();
    await user.clear(field);
    await user.click(screen.getByRole('button', { name: 'Создать колоду' }));

    expect(screen.getByTestId('active-deck-name')).toHaveTextContent(hint);
  });
});
