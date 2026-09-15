import { downloadText } from '@/lib/download';

const MOCK_URL = 'blob:http://localhost/mock-url';

describe('downloadText', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => MOCK_URL);
    URL.revokeObjectURL = vi.fn();
    // Настоящий клик по ссылке пытается перейти по blob-адресу: jsdom не умеет
    // скачивать файлы и шумит в консоль «Not implemented: navigation».
    // Подменяем click, чтобы проверять саму функцию, а не поведение jsdom.
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('создаёт ссылку с именем файла и адресом блоба, кликает и убирает её из документа', () => {
    const appendSpy = vi.spyOn(document.body, 'append');

    downloadText('колода.tsv', 'привет', 'text/tab-separated-values');

    const link = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.download).toBe('колода.tsv');
    expect(link.href).toBe(MOCK_URL);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(link.isConnected).toBe(false);
  });

  // Chromium начинает скачивание синхронно и прощает немедленный отзыв, но
  // Firefox и Safari в этот момент его отменяли: ссылка должна пережить клик.
  it('отзывает URL блоба не сразу, а по таймеру', () => {
    vi.useFakeTimers();
    try {
      downloadText('колода.tsv', 'привет', 'text/tab-separated-values');

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(MOCK_URL);
    } finally {
      vi.useRealTimers();
    }
  });
});
