// src/lib/trashEvents.ts
type Listener = () => void;
type RestoreListener = (table: string) => void;

const deleteListeners: Listener[] = [];
const restoreListeners: RestoreListener[] = [];
const transactionCreatedListeners: Listener[] = []; // ✅ untuk notify setelah balance adjustment

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

  // ✅ Dipanggil setelah transaksi penyesuaian dibuat dari AccountContext
  emitTransactionCreated: () => transactionCreatedListeners.forEach(fn => fn()),
  subscribeTransactionCreated: (fn: Listener) => {
    transactionCreatedListeners.push(fn);
    return () => {
      const idx = transactionCreatedListeners.indexOf(fn);
      if (idx > -1) transactionCreatedListeners.splice(idx, 1);
    };
  },
};