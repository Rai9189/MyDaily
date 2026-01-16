# MyDaily - Personal Finance & Task Manager PWA

Aplikasi PWA Personal untuk mengelola keuangan (akun bank, e-wallet, cash), transaksi (pengeluaran & pemasukan), tugas dengan deadline & status otomatis, dan notes pribadi dengan lampiran file.

## 🚀 Fitur Utama

### 🔐 Autentikasi & Keamanan
- **Login & Register** - Sistem autentikasi lengkap
- **Forgot Password** - Reset password melalui email
- **PIN Security** - 3 pilihan keamanan:
  - PIN 4 Angka
  - PIN 6 Angka  
  - Password (kombinasi huruf & angka)
- **PIN Lock** - Kunci aplikasi dengan PIN setiap kali dibuka

### 💰 Manajemen Keuangan
- **Akun Keuangan** - Kelola multiple akun (Bank, E-Wallet, Cash)
- **Transaksi** - Catat pemasukan & pengeluaran
- **Kategori** - Kategorisasi transaksi custom
- **Filter Waktu** - Hari ini, Minggu ini, Bulan ini, Tahun ini, Range bebas
- **Attachments** - Lampiran file untuk bukti transaksi

### ✅ Manajemen Tugas
- **Task Management** - Buat dan kelola tugas
- **Auto Status** - Status otomatis berdasarkan deadline:
  - Mendesak (kurang dari 3 hari)
  - Mendekati (3-7 hari)
  - Masih Lama (lebih dari 7 hari)
- **Mark Complete** - Tandai tugas selesai (seperti Google Classroom)
- **Filter Lengkap** - Status, Kategori, Completion, Waktu
- **Sort Options** - Urutkan berdasarkan deadline atau status

### 📝 Notes Pribadi
- **Personal Notes** - Catatan pribadi dengan kategori
- **Pin Notes** - Pin catatan penting
- **Search** - Cari notes berdasarkan judul/konten
- **Attachments** - Lampiran file untuk notes

### 📊 Dashboard & Analytics
- **Total Saldo** - Ringkasan saldo dari semua akun
- **Grafik Transaksi** - Tren pemasukan & pengeluaran
- **Grafik Kategori** - Pie chart pengeluaran per kategori
- **Grafik Tugas** - Bar chart status tugas
- **Tugas Mendesak** - Alert untuk tugas urgent
- **Catatan Terpin** - Quick access ke pinned notes
- **Filter Waktu** - Dynamic date range untuk semua grafik

### 🎨 UI/UX
- **Responsive Design** - Mobile-first dengan desktop support
- **Bottom Navigation** - Mobile (≤768px)
- **Sidebar** - Desktop (>768px)
- **View Modes** - List view & Card view
- **Pagination** - 3, 5, atau 10 items per halaman (card view)
- **Modern Design** - Tailwind CSS & shadcn/ui components
- **Smooth Transitions** - Hover effects & animations

### 🗂️ Kategori Management
- **Custom Categories** - Buat kategori sendiri
- **Color Coding** - Warna custom untuk setiap kategori
- **Multi-type** - Kategori untuk transaksi, tugas, dan notes
- **CRUD Operations** - Create, Read, Update, Delete

## 🛠️ Teknologi

- **React** - UI Framework
- **TypeScript** - Type safety
- **React Router** - Navigation
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Component library
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **date-fns** - Date manipulation
- **Vite** - Build tool

## 📱 PWA Features

- **Offline Support** - Service worker caching
- **Install Prompt** - Add to home screen
- **App Manifest** - PWA configuration
- **Responsive** - Mobile & desktop optimized

## 🎯 Cara Menggunakan

### Login & Setup
1. Buka aplikasi di browser
2. **Login** dengan kredensial atau **Register** akun baru
3. **Setup PIN** - Pilih tipe PIN (4 digit, 6 digit, atau password)
4. Aplikasi siap digunakan!

### Dashboard
- Lihat ringkasan saldo total dari semua akun
- Monitoring grafik transaksi (pemasukan & pengeluaran)
- Pantau status tugas dengan bar chart
- Lihat tugas mendesak yang perlu segera diselesaikan
- Filter data berdasarkan waktu (hari, minggu, bulan, tahun, range bebas)

### Akun Keuangan
1. Klik **Akun** di navigasi
2. Klik **Tambah Akun**
3. Isi nama, tipe (Bank/E-Wallet/Cash), dan saldo awal
4. **Edit** atau **Hapus** akun kapan saja

### Transaksi
1. Klik **Transaksi** di navigasi
2. Klik **Tambah Transaksi**
3. Pilih tipe (Masuk/Keluar), akun, kategori, nominal, tanggal
4. Tambah deskripsi dan attachment (opsional)
5. **Filter** transaksi berdasarkan waktu, akun, tipe, kategori
6. **Sort** berdasarkan tanggal atau nominal
7. Switch antara **List View** (scroll) atau **Card View** (pagination)

### Tugas
1. Klik **Tugas** di navigasi
2. Klik **Tambah Tugas**
3. Isi judul, deskripsi, deadline, kategori
4. Status akan otomatis diupdate berdasarkan deadline
5. Klik tugas untuk membuka detail dan **Mark Complete**
6. **Filter** berdasarkan waktu, status, kategori, completion
7. **Sort** berdasarkan deadline atau status

### Notes
1. Klik **Notes** di navigasi
2. Klik **Tambah Note**
3. Isi judul, konten, kategori
4. **Pin** note penting agar mudah diakses
5. Tambah attachment (opsional)
6. **Search** untuk mencari notes
7. **Filter** berdasarkan kategori

### Kategori
1. Klik **Profile** → **Kelola Kategori**
2. Klik **Tambah Kategori**
3. Pilih nama, tipe (Transaksi/Tugas/Note), warna
4. **Edit** atau **Hapus** kategori

### Profile & Settings
1. Klik **Profile** di navigasi
2. Update foto profil dan informasi personal
3. **Ubah Password** untuk keamanan akun
4. **Ubah PIN** untuk mengupdate PIN keamanan
5. **Kelola Kategori** untuk customize kategori
6. **Logout** untuk keluar dari aplikasi

## 🔒 Keamanan

- PIN/Password disimpan di localStorage (dalam produksi harus di-hash)
- Session management dengan localStorage
- Auto-lock saat aplikasi dibuka ulang
- Bisa logout dari mana saja (Sidebar desktop / Profile mobile)

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#3B82F6, #1D4ED8)
- **Success**: Green (#10B981)
- **Warning**: Orange/Yellow (#F59E0b, #FBBF24)
- **Danger**: Red (#EF4444)
- **Secondary**: Gray shades

### Typography
- Base: 16px
- Headings: text-3xl (Dashboard), text-2xl, text-xl
- Body: text-base, text-sm, text-xs

### Spacing
- Container: space-y-6
- Cards: gap-4, p-4
- Sections: mb-4, mt-2

## 📦 Struktur Data

### User
```typescript
{
  id: string;
  name: string;
  email: string;
  pinType: 'pin4' | 'pin6' | 'password';
  pin: string;
}
```

### Account
```typescript
{
  id: string;
  name: string;
  type: 'Bank' | 'E-Wallet' | 'Cash';
  balance: number;
}
```

### Transaction
```typescript
{
  id: string;
  accountId: string;
  amount: number;
  type: 'Masuk' | 'Keluar';
  date: string;
  categoryId: string;
  description?: string;
  attachments?: string[];
}
```

### Task
```typescript
{
  id: string;
  title: string;
  description?: string;
  deadline: string;
  status: 'Mendesak' | 'Mendekati' | 'Masih Lama';
  categoryId: string;
  completed: boolean;
  attachments?: string[];
}
```

### Note
```typescript
{
  id: string;
  title: string;
  content: string;
  timestamp: string;
  categoryId: string;
  pinned: boolean;
  attachments?: string[];
}
```

### Category
```typescript
{
  id: string;
  name: string;
  type: 'transaction' | 'task' | 'note';
  color: string;
}
```

## 🚧 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📝 Notes

- Data saat ini menggunakan dummy data statis di `/src/app/data/dummyData.ts`
- Untuk produksi, integrate dengan backend API dan database
- localStorage hanya untuk demo, gunakan secure storage di produksi
- Service worker sudah ready untuk PWA deployment

## 🎯 Future Enhancements

- [ ] Backend integration dengan API
- [ ] Real database (PostgreSQL/MongoDB)
- [ ] File upload untuk attachments
- [ ] Export data (CSV, PDF)
- [ ] Budget planning & alerts
- [ ] Recurring transactions
- [ ] Multi-currency support
- [ ] Dark mode
- [ ] Notification system
- [ ] Data backup & restore

## 📄 License

Personal use only. Not for commercial distribution.

---

**MyDaily** - Kelola hidupmu dengan mudah! 🚀
