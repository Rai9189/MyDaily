// src/app/lib/trashEvents.ts
type Listener = () => void;
type RestoreListener = (table: string) => void;

const deleteListeners: Listener[] = [];
const restoreListeners: RestoreListener[] = [];

export const trashEvents = {
  // Dipanggil setelah soft delete
  emit: () => deleteListeners.forEach(fn => fn()),
  subscribe: (fn: Listener) => {
    deleteListeners.push(fn);
    return () => {
      const idx = deleteListeners.indexOf(fn);
      if (idx > -1) deleteListeners.splice(idx, 1);
    };
  },

  // Dipanggil setelah restore, dengan nama table yang di-restore
  emitRestore: (table: string) => restoreListeners.forEach(fn => fn(table)),
  subscribeRestore: (fn: RestoreListener) => {
    restoreListeners.push(fn);
    return () => {
      const idx = restoreListeners.indexOf(fn);
      if (idx > -1) restoreListeners.splice(idx, 1);
    };
  },
};