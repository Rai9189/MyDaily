import { describe, it, expect } from 'vitest';
import { parseBcaStatement, cleanDescription } from './bcaStatement';

const header = [
  'MUTASI REKENING',
  'NO. REKENING : 000-0000-000',
  'PERIODE : 09/10/2026 - 12/10/2026',
  'TANGGAL KETERANGAN MUTASI',
];

describe('parseBcaStatement', () => {
  it('parses QRIS rows, uses TGL: as the date, and handles the amount on either line', () => {
    const rows = parseBcaStatement([
      ...header,
      '21/09/2026 TGL: 0921 QR 014 00000.00KATSU BING 48,000.00 DB',
      'TRANSAKSI DEBIT',
      '21/09/2026 TGL: 0920 QRC 014 00000.00IDM INDOMA',
      'TRANSAKSI DEBIT',
      '21,100.00 DB',
      '05/01/2027 TGL: 1231 QR 002 00000.00KANTIN DEK 10,000.00 DB',
      'TRANSAKSI DEBIT',
      '05/01/2027 SALDO AWAL 0.00',
    ]);
    expect(rows).toEqual([
      { date: '2026-09-21', amount: 48000, type: 'expense', description: 'KATSU BING', pending: false },
      { date: '2026-09-20', amount: 21100, type: 'expense', description: 'IDM INDOMA', pending: false },
      { date: '2026-12-31', amount: 10000, type: 'expense', description: 'KANTIN DEK', pending: false },
    ]);
  });

  it('parses PEND rows dated by TGL: or the period end', () => {
    const rows = parseBcaStatement([
      ...header,
      'PEND TGL: 1011 QR 014 00000.00GOLDEN SER 200,000.00 DB',
      'TRANSAKSI DEBIT',
      'PEND TRF RIFKI AFANDI 008 KWSKMRSIALC 800,000.00 CR',
      'SWITCHING CR',
    ]);
    expect(rows).toEqual([
      { date: '2026-10-11', amount: 200000, type: 'expense', description: 'GOLDEN SER',       pending: true },
      { date: '2026-10-12', amount: 800000, type: 'income',  description: 'TRF RIFKI AFANDI', pending: true },
    ]);
  });

  it('builds transfer/card/ATM descriptions and never keeps card, account or reference numbers', () => {
    const rows = parseBcaStatement([
      ...header,
      '25/09/2026 2509/FTSCY/WS95031 850000.00Pelunasan KKL RafiRIFKI 850,000.00 CR',
      'AFANDI',
      'TRSF E-BANKING CR',
      '24/09/2026 2409/FTSCY/WS95031 50000.00MUHAMMAD ADJIE DIW 50,000.00 DB',
      'TRSF E-BANKING DB',
      '29/09/2026 TRF RATNA SARI (STF-PV087 112.215.152 700,000.00 CR',
      'SWITCHING CR',
      '10/10/2026 IDM TT81 SETIABUDI5379412093165164 62,200.00 DB',
      'KARTU DEBIT 10/10',
      '23/09/2026 5379412093165164 150,000.00 DB',
      'TARIKAN ATM 23/09',
      'Bersambung ke Halaman berikutnya',
      'MUTASI REKENING',
      'NO. REKENING : 000-0000-000',
    ]);
    expect(rows.map(r => r.description)).toEqual([
      'Pelunasan KKL RafiRIFKI AFANDI',
      'MUHAMMAD ADJIE DIW',
      'TRF RATNA SARI',
      'IDM TT81 SETIABUDI',
      'TARIKAN ATM 23/09',
    ]);
    expect(rows.every(r => !/\d{8,}|FTSCY/.test(r.description))).toBe(true);
  });

  it('strips 8+ digit numbers in any grouping', () => {
    expect(cleanDescription('TRSF KE 631-0455-120 BUDI')).toBe('TRSF KE BUDI');
    expect(cleanDescription('KARTU 5379 4120 9316 5164')).toBe('KARTU');
    expect(cleanDescription('TOPUP DANA 0812-3456-7890')).toBe('TOPUP DANA');
    expect(cleanDescription('VA 8077 0812 3456 7890')).toBe('VA');
    expect(cleanDescription('IDM TT81 SETIABUDI5379412093165164')).toBe('IDM TT81 SETIABUDI');
    expect(cleanDescription('UNGU LAUND')).toBe('UNGU LAUND');
  });
});
