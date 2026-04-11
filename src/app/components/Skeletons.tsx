// src/app/components/Skeletons.tsx
// Koleksi loading skeleton untuk semua halaman utama.
// Gunakan animate-pulse + bg-muted agar otomatis mengikuti tema light/dark.

/* ─── Primitive ─── */
function Bone({ className = '' }: { className?: string }) {
  return <div className={`bg-muted rounded-md ${className}`} />;
}

/* ─────────────────────────────────────────
   LIST PAGE SKELETON
   Dipakai oleh: Tasks, Notes, Transactions
───────────────────────────────────────── */
export function ListPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-40" />
        <Bone className="h-9 w-28 rounded-lg" />
      </div>
      {/* Search + filter row */}
      <div className="flex gap-2">
        <Bone className="h-10 flex-1 rounded-lg" />
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
      {/* Show + view toggle row */}
      <div className="flex items-center gap-3">
        <Bone className="h-4 w-12" />
        <Bone className="h-8 w-36 rounded-lg" />
        <Bone className="h-8 w-16 rounded-lg ml-auto" />
      </div>
      {/* Table / card body */}
      <div className="rounded-xl border-2 border-muted bg-white dark:bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-muted">
          <Bone className="h-3 w-3 rounded-full" />
          <Bone className="h-3 w-24" />
          <Bone className="h-3 w-20 ml-auto" />
          <Bone className="h-3 w-16" />
          <Bone className="h-3 w-16" />
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-muted last:border-0">
            <Bone className="h-2.5 w-2.5 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-48" />
              <Bone className="h-3 w-32" />
            </div>
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-3 w-20" />
            <Bone className="h-6 w-16 rounded-full" />
            <div className="flex gap-1 ml-2">
              <Bone className="h-7 w-7 rounded-md" />
              <Bone className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   DETAIL PAGE SKELETON
   Dipakai oleh: TaskDetail, NoteDetail, TransactionDetail
───────────────────────────────────────── */
export function DetailPageSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4 pb-6 animate-pulse">
      {/* Header / back button */}
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-28" />
        <Bone className="h-6 w-20 rounded-full" />
      </div>

      {/* Main card */}
      <div className="rounded-xl border-2 border-muted bg-white dark:bg-card p-4 space-y-4">
        {/* Two-column row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="space-y-1.5">
              <Bone className="h-3.5 w-20" />
              <Bone className="h-10 rounded-md" />
            </div>
          ))}
        </div>

        {/* Extra fields */}
        {Array.from({ length: fields - 2 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Bone className="h-3.5 w-24" />
            <Bone className={`rounded-md ${i === fields - 3 ? 'h-28' : 'h-10'}`} />
          </div>
        ))}

        {/* Footer timestamps */}
        <div className="flex justify-between">
          <Bone className="h-3 w-36" />
          <Bone className="h-3 w-40" />
        </div>
      </div>

      {/* Attachment card */}
      <div className="rounded-xl border-2 border-muted bg-white dark:bg-card p-4 space-y-3">
        <Bone className="h-4 w-24" />
        <Bone className="h-10 rounded-md" />
        <Bone className="h-3 w-52" />
        <Bone className="h-12 rounded-lg" />
      </div>

      {/* Action button */}
      <Bone className="h-10 rounded-md" />
    </div>
  );
}

/* ─────────────────────────────────────────
   DASHBOARD SKELETON
───────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div className="space-y-3 pb-6 animate-pulse">
      {/* Filter row */}
      <div className="flex gap-2">
        <Bone className="h-8 w-32 rounded-lg" />
        <Bone className="h-8 w-36 rounded-lg" />
      </div>

      {/* Balance card */}
      <Bone className="h-20 rounded-xl" />

      {/* Income + Expense */}
      <div className="grid grid-cols-2 gap-3">
        <Bone className="h-20 rounded-xl" />
        <Bone className="h-20 rounded-xl" />
      </div>

      {/* Chart + Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-muted bg-white dark:bg-card p-4 space-y-3">
          <div className="flex justify-between">
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-16" />
          </div>
          <Bone className="h-8 rounded-lg" />
          <Bone className="h-40 rounded-lg" />
          {[1, 2, 3].map(i => <Bone key={i} className="h-8 rounded-lg" />)}
        </div>
        <div className="rounded-xl border-2 border-muted bg-white dark:bg-card p-4 space-y-3">
          <div className="flex justify-between">
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-16" />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map(i => <Bone key={i} className="h-16 rounded-lg" />)}
          </div>
          <div className="flex items-center gap-2">
            <Bone className="h-px flex-1" />
            <Bone className="h-3 w-16" />
            <Bone className="h-px flex-1" />
          </div>
          {[1, 2, 3, 4].map(i => <Bone key={i} className="h-10 rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   NOTE DETAIL SKELETON (sudah spesifik)
───────────────────────────────────────── */
export function NoteDetailSkeleton() {
  return (
    <div className="space-y-4 pb-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-28" />
        <Bone className="h-6 w-16 rounded-full" />
      </div>
      <div className="rounded-xl border-2 border-muted bg-white dark:bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Bone className="h-3.5 w-16" />
            <Bone className="h-10 rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Bone className="h-3.5 w-20" />
            <Bone className="h-10 rounded-md" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Bone className="h-3.5 w-16" />
          <Bone className="h-40 rounded-md" />
        </div>
        <div className="flex justify-between">
          <Bone className="h-3 w-36" />
          <Bone className="h-3 w-40" />
        </div>
      </div>
      <div className="rounded-xl border-2 border-muted bg-white dark:bg-card p-4 space-y-3">
        <Bone className="h-4 w-24" />
        <Bone className="h-10 rounded-md" />
        <Bone className="h-3 w-48" />
      </div>
      <Bone className="h-10 rounded-md" />
    </div>
  );
}