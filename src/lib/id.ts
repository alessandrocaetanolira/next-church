export function generateId() {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (typeof randomUuid === 'function') {
    return randomUuid.call(globalThis.crypto);
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
