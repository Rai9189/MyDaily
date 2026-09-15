// src/lib/draftStorage.ts
// Persists unsaved "new" form data (transaction/task/note) to localStorage so it
// survives an accidental page refresh or tab close before the user hits Save.

type DraftType = 'transaction' | 'task' | 'note';

function getKey(userId: string, type: DraftType): string {
  return `mydaily_draft_${type}_${userId}`;
}

export function getDraft<T>(userId: string | undefined, type: DraftType): T | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getKey(userId, type));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveDraft<T>(userId: string | undefined, type: DraftType, data: T): void {
  if (!userId) return;
  try {
    localStorage.setItem(getKey(userId, type), JSON.stringify(data));
  } catch {
    // localStorage not available (e.g. strict private mode) — draft simply won't persist
  }
}

export function clearDraft(userId: string | undefined, type: DraftType): void {
  if (!userId) return;
  try {
    localStorage.removeItem(getKey(userId, type));
  } catch {
    // localStorage not available
  }
}
