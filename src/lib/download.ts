/**
 * Сохранение текста в файл. Живёт вне core: там нет доступа к DOM, и это
 * правило проверяется линтером.
 */
export function downloadText(fileName: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  // Без отзыва ссылка держит содержимое файла в памяти до перезагрузки вкладки.
  // Отзыв — не сразу: Chromium начинает скачивание синхронно с click() и
  // прощает немедленный отзыв, но Firefox и Safari в этот момент его отменяли.
  // Таймер откладывает отзыв до следующего тика, когда браузер уже забрал файл.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
