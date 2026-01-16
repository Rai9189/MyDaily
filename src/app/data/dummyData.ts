import { Account, Transaction, Task, Note, Category, User } from '../types';

export const dummyUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  pinType: 'numeric',
  pin: '1234', // In real app, this would be hashed
};

export const dummyCategories: Category[] = [
  // Transaction categories
  { id: 'tc1', name: 'Gaji', type: 'transaction', color: '#10b981' },
  { id: 'tc2', name: 'Sewa', type: 'transaction', color: '#ef4444' },
  { id: 'tc3', name: 'Transportasi', type: 'transaction', color: '#f59e0b' },
  { id: 'tc4', name: 'Belanja', type: 'transaction', color: '#8b5cf6' },
  { id: 'tc5', name: 'Top Up', type: 'transaction', color: '#06b6d4' },
  
  // Task categories
  { id: 'tk1', name: 'Tagihan', type: 'task', color: '#ef4444' },
  { id: 'tk2', name: 'Administrasi', type: 'task', color: '#f59e0b' },
  { id: 'tk3', name: 'Kesehatan', type: 'task', color: '#10b981' },
  { id: 'tk4', name: 'Pekerjaan', type: 'task', color: '#3b82f6' },
  
  // Note categories
  { id: 'nt1', name: 'Penting', type: 'note', color: '#ef4444' },
  { id: 'nt2', name: 'Belanja', type: 'note', color: '#10b981' },
  { id: 'nt3', name: 'Rencana', type: 'note', color: '#3b82f6' },
  { id: 'nt4', name: 'Resep', type: 'note', color: '#f59e0b' },
];

export const dummyAccounts: Account[] = [
  { id: '1', name: 'BCA Utama', type: 'Bank', balance: 15500000 },
  { id: '2', name: 'Mandiri Tabungan', type: 'Bank', balance: 8750000 },
  { id: '3', name: 'GoPay', type: 'E-Wallet', balance: 450000 },
  { id: '4', name: 'OVO', type: 'E-Wallet', balance: 275000 },
  { id: '5', name: 'Kas Tunai', type: 'Cash', balance: 1200000 },
];

export const dummyTransactions: Transaction[] = [
  {
    id: '1',
    accountId: '1',
    amount: 5000000,
    type: 'Masuk',
    date: '2025-12-10',
    categoryId: 'tc1',
    description: 'Gaji bulan Desember',
  },
  {
    id: '2',
    accountId: '1',
    amount: 1500000,
    type: 'Keluar',
    date: '2025-12-12',
    categoryId: 'tc2',
    description: 'Sewa rumah',
    attachments: [
      { id: 'a1', name: 'bukti_transfer.jpg', type: 'image', url: '#' },
    ],
  },
  {
    id: '3',
    accountId: '3',
    amount: 200000,
    type: 'Masuk',
    date: '2025-12-13',
    categoryId: 'tc5',
  },
  {
    id: '4',
    accountId: '3',
    amount: 85000,
    type: 'Keluar',
    date: '2025-12-13',
    categoryId: 'tc3',
    description: 'Grab & GoRide',
  },
  {
    id: '5',
    accountId: '2',
    amount: 750000,
    type: 'Keluar',
    date: '2025-12-11',
    categoryId: 'tc4',
    description: 'Groceries',
  },
  {
    id: '6',
    accountId: '1',
    amount: 300000,
    type: 'Keluar',
    date: '2025-12-08',
    categoryId: 'tc3',
    description: 'Bensin & Tol',
  },
  {
    id: '7',
    accountId: '3',
    amount: 150000,
    type: 'Keluar',
    date: '2025-12-07',
    categoryId: 'tc4',
    description: 'Makan siang',
  },
];

export const dummyTasks: Task[] = [
  {
    id: '1',
    title: 'Bayar tagihan listrik',
    deadline: '2025-12-15',
    status: 'Mendesak',
    completed: false,
    categoryId: 'tk1',
    description: 'Bayar melalui mobile banking',
  },
  {
    id: '2',
    title: 'Perpanjang STNK',
    deadline: '2025-12-20',
    status: 'Mendekati',
    completed: false,
    categoryId: 'tk2',
    description: 'Kunjungi Samsat terdekat',
  },
  {
    id: '3',
    title: 'Laporan bulanan',
    deadline: '2026-01-05',
    status: 'Masih Lama',
    completed: false,
    categoryId: 'tk4',
  },
  {
    id: '4',
    title: 'Cek kesehatan tahunan',
    deadline: '2025-12-28',
    status: 'Mendekati',
    completed: false,
    categoryId: 'tk3',
  },
  {
    id: '5',
    title: 'Bayar asuransi',
    deadline: '2025-12-14',
    status: 'Mendesak',
    completed: false,
    categoryId: 'tk1',
  },
];

export const dummyNotes: Note[] = [
  {
    id: '1',
    title: 'Catatan Penting',
    content: 'Jangan lupa backup data setiap akhir bulan. Pastikan semua file tersimpan di cloud storage.',
    timestamp: '2025-12-13T10:30:00',
    pinned: true,
    categoryId: 'nt1',
  },
  {
    id: '2',
    title: 'Daftar Belanja',
    content: '- Beras 5kg\n- Minyak goreng 2L\n- Telur 1kg\n- Sayuran\n- Buah-buahan',
    timestamp: '2025-12-12T15:20:00',
    pinned: false,
    categoryId: 'nt2',
  },
  {
    id: '3',
    title: 'Rencana Liburan',
    content: 'Destinasi: Bali\nTanggal: 20-25 Januari 2026\nBudget: Rp 10.000.000\nAkomodasi: Hotel di Seminyak',
    timestamp: '2025-12-11T09:15:00',
    pinned: true,
    categoryId: 'nt3',
    attachments: [
      { id: 'n1', name: 'itinerary.pdf', type: 'pdf', url: '#' },
    ],
  },
  {
    id: '4',
    title: 'Resep Masakan',
    content: 'Nasi Goreng Spesial:\n1. Tumis bumbu\n2. Masukkan nasi\n3. Tambahkan kecap\n4. Aduk rata',
    timestamp: '2025-12-10T18:45:00',
    pinned: false,
    categoryId: 'nt4',
  },
];
