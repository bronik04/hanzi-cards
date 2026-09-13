let counter = 0;

/**
 * Идентификатор карточки. `crypto.randomUUID` доступен во всех целевых браузерах
 * и в Node 20, запасной вариант нужен только для нестандартных окружений.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  counter += 1;
  return `card-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 10)}`;
}
