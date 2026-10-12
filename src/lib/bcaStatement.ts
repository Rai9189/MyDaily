// src/lib/bcaStatement.ts
// Parses BCA "Mutasi Rekening" PDFs (myBCA export) entirely in the browser.
// Header data (account number, holder name) is never extracted, and card/account/reference
// numbers are stripped from descriptions so they never reach the database.

export interface ParsedStatementRow {
  date: string;                  // YYYY-MM-DD — actual transaction date (TGL:) when present
  amount: number;
  type: 'income' | 'expense';    // CR → income, DB → expense
  description: string;
  pending: boolean;              // "PEND" rows: not yet booked by BCA
}

const ROW_START = /^(?:(\d{2})\/(\d{2})\/(\d{4})|PEND)\s+/;
const PERIOD    = /PERIODE\s*:\s*\d{2}\/\d{2}\/\d{4}\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/;
const AMOUNT    = /([\d,]+\.\d{2})\s+(DB|CR)\b/;
const TGL       = /TGL:\s*(\d{2})(\d{2})/;               // MMDD
const GLUED     = /\d+\.\d{2}(?=[A-Za-z])(.*)$/;          // "00000.00KFC", "50000.00KEISHA…" (QRIS / m-BCA transfer)
// Line naming the transaction kind; description lines come before it
const KIND      = /^(TRSF E-BANKING|TRANSAKSI DEBIT|SWITCHING|TARIKAN ATM|KARTU DEBIT|BI-FAST|BIAYA|KR OTOMATIS|DB OTOMATIS|SETORAN|BUNGA|PAJAK)/;

const pad = (n: number) => String(n).padStart(2, '0');

/** Removes identifiers that must not be stored, plus bank noise. */
export function cleanDescription(s: string): string {
  return s
    .replace(TGL, ' ')
    .replace(/\b\d{4}\/[A-Z0-9]+\/[A-Z0-9]+\b/g, ' ')    // m-BCA reference: 2409/FTSCY/WS95031
    // card / account / phone / VA numbers: 8+ digits, even glued to text or grouped by spaces/dashes
    .replace(/\d(?:[ -]?\d){7,}/g, ' ')
    .replace(/^\s*QRC?\s+\d{3}\b/, ' ')                   // QRIS acquirer code
    .replace(/\s*\(.*$/, '')                              // "(STF-PV087 112.215.152" interbank suffix
    .replace(/^(\s*TRF\b.*?)\s+\d{3}\s+[A-Z0-9]+\s*$/, '$1') // "TRF NAME 008 KWSKMRSIALC" → bank code + ref
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDate(booked: { day: number; month: number; year: number }, text: string): string {
  const tgl = text.match(TGL);
  if (tgl) {
    const tMonth = Number(tgl[1]);
    const tDay   = Number(tgl[2]);
    if (tMonth >= 1 && tMonth <= 12 && tDay >= 1 && tDay <= 31) {
      // Paid in December, booked in January → previous year
      const tYear = tMonth === 12 && booked.month === 1 ? booked.year - 1 : booked.year;
      return `${tYear}-${pad(tMonth)}-${pad(tDay)}`;
    }
  }
  return `${booked.year}-${pad(booked.month)}-${pad(booked.day)}`;
}

/** Parses the statement's text lines into transaction rows. Rows without a DB/CR amount are skipped. */
export function parseBcaStatement(lines: string[]): ParsedStatementRow[] {
  // PEND rows have no booking date; fall back to the end of the statement period, then today
  const period = lines.join('\n').match(PERIOD);
  const today = new Date();
  const periodEnd = period
    ? { day: +period[1], month: +period[2], year: +period[3] }
    : { day: today.getDate(), month: today.getMonth() + 1, year: today.getFullYear() };

  const chunks: { booked: typeof periodEnd; pending: boolean; lines: string[] }[] = [];
  for (const line of lines) {
    const m = line.match(ROW_START);
    if (m) {
      chunks.push({
        booked: m[1] ? { day: +m[1], month: +m[2], year: +m[3] } : periodEnd,
        pending: !m[1],
        lines: [line.slice(m[0].length)],
      });
    } else if (chunks.length) {
      chunks[chunks.length - 1].lines.push(line);
    }
  }

  const rows: ParsedStatementRow[] = [];
  for (const c of chunks) {
    const text = c.lines.join('\n');
    const amt = text.match(AMOUNT);
    if (!amt) continue;
    const lines = text.replace(amt[0], ' ').split('\n').map(l => l.trim());

    // Lines between the first line and the kind line hold names/notes (e.g. sender name).
    // Anything after the kind line is page header/footer noise. Unknown layout → first line only.
    const kindIdx = lines.findIndex((l, i) => i > 0 && KIND.test(l));
    const first = lines[0].match(GLUED)?.[1] ?? lines[0];
    const extra = kindIdx > 0 ? lines.slice(1, kindIdx) : [];
    const description =
      cleanDescription([first, ...extra].join(' ')) ||
      (kindIdx > 0 ? cleanDescription(lines[kindIdx]) : '');

    rows.push({
      date: resolveDate(c.booked, lines[0]),
      amount: Number(amt[1].replace(/,/g, '')),
      type: amt[2] === 'CR' ? 'income' : 'expense',
      description,
      pending: c.pending,
    });
  }
  return rows;
}

/** Reads a PDF into text lines (items grouped by vertical position, left to right). */
export async function readPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  // Worker is bundled with the app (Vite ?url), so nothing is fetched from a CDN
  pdfjs.GlobalWorkerOptions.workerSrc =
    (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const { items } = await (await doc.getPage(p)).getTextContent();
    const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
    for (const it of items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const [x, y] = [it.transform[4], it.transform[5]];
      let row = rows.find(r => Math.abs(r.y - y) < 3);
      if (!row) rows.push(row = { y, parts: [] });
      row.parts.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) lines.push(r.parts.sort((a, b) => a.x - b.x).map(p => p.s).join(' '));
  }
  await task.destroy();
  return lines;
}
