import { downloadText } from '@/lib/download';

const MOCK_URL = 'blob:http://localhost/mock-url';

// Захвачены до первого beforeEach: с ними сверяется восстановление ниже.
const ORIGINAL_CREATE_OBJECT_URL = URL.createObjectURL;
const ORIGINAL_REVOKE_OBJECT_URL = URL.revokeObjectURL;

describe('downloadText', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // vi.stubGlobal, а не прямое присваивание: прямое присваивание меняет
    // URL насовсем, и все последующие тесты в процессе работают с моком.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => MOCK_URL),
      revokeObjectURL: vi.fn(),
    });
    // Настоящий клик по ссылке пытается перейти по blob-адресу: jsdom не умеет
    // скачивать файлы и шумит в консоль «Not implemented: navigation».
    // Подменяем click, чтобы проверять саму функцию, а не поведение jsdom.
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
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

// Отдельный describe, а не тест внутри downloadText: свой afterEach должен
// успеть отработать первым, иначе следующий beforeEach просто подменит
// глобал заново, и проверка ничего не покажет.
describe('после файла', () => {
  it('URL.createObjectURL и revokeObjectURL возвращаются к исходным, а не остаются моком', () => {
    expect(URL.createObjectURL).toBe(ORIGINAL_CREATE_OBJECT_URL);
    expect(URL.revokeObjectURL).toBe(ORIGINAL_REVOKE_OBJECT_URL);
  });
});
