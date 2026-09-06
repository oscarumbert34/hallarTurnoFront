const CHUNK_LOAD_RELOAD_KEY = 'turnero.chunkLoadReloaded';

export function recoverFromChunkLoadError(error: unknown): boolean {
  if (!isChunkLoadError(error) || typeof window === 'undefined') {
    return false;
  }

  try {
    if (window.sessionStorage.getItem(CHUNK_LOAD_RELOAD_KEY)) {
      return false;
    }

    window.sessionStorage.setItem(CHUNK_LOAD_RELOAD_KEY, 'true');
  } catch {
    return false;
  }

  window.location.reload();
  return true;
}

export function clearChunkLoadRecoveryFlag(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(CHUNK_LOAD_RELOAD_KEY);
  } catch {
    return;
  }
}

function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String((error as { message?: unknown } | null)?.message ?? '');

  return /failed to fetch dynamically imported module|loading chunk [\w-]+ failed|importing a module script failed/i.test(
    message,
  );
}
