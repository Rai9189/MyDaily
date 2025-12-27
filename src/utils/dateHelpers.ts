/**
 * Date Helper Utilities
 * Functions untuk manipulasi dan formatting tanggal
 */

/**
 * Format tanggal ke format Indonesia
 * @param date - Date string atau Date object
 * @param format - Format output (short, long, full)
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'full' = 'long'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    short: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    },
  }[format];
  
  return dateObj.toLocaleDateString('id-ID', options);
}

/**
 * Format tanggal dan waktu ke format Indonesia
 * @param date - Date string atau Date object
 * @returns Formatted datetime string
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format tanggal ke format YYYY-MM-DD (untuk input date)
 * @param date - Date string atau Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Hitung selisih hari dari sekarang
 * @param date - Target date
 * @returns Jumlah hari (positif = masa depan, negatif = masa lalu)
 */
export function getDaysUntil(date: string | Date): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  // Set ke midnight untuk perhitungan hari
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get relative time string (e.g., "2 hari lagi", "kemarin")
 * @param date - Target date
 * @returns Relative time string
 */
export function getRelativeTime(date: string | Date): string {
  const days = getDaysUntil(date);
  
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  if (days === -1) return 'Kemarin';
  if (days > 1) return `${days} hari lagi`;
  if (days < -1) return `${Math.abs(days)} hari yang lalu`;
  
  return formatDate(date, 'short');
}

/**
 * Calculate task status berdasarkan deadline
 * @param deadline - Task deadline
 * @returns Task status
 */
export function calculateTaskStatus(
  deadline: string | Date
): 'Masih Lama' | 'Mendekati' | 'Mendesak' {
  const days = getDaysUntil(deadline);
  
  if (days < 0) return 'Mendesak'; // Sudah lewat
  if (days <= 3) return 'Mendesak'; // 0-3 hari
  if (days <= 7) return 'Mendekati'; // 4-7 hari
  return 'Masih Lama'; // >7 hari
}

/**
 * Check if date is today
 * @param date - Date to check
 * @returns true if date is today
 */
export function isToday(date: string | Date): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is in current week
 * @param date - Date to check
 * @returns true if date is in current week
 */
export function isThisWeek(date: string | Date): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  // Get start of week (Monday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Get end of week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return checkDate >= startOfWeek && checkDate <= endOfWeek;
}

/**
 * Check if date is in current month
 * @param date - Date to check
 * @returns true if date is in current month
 */
export function isThisMonth(date: string | Date): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return (
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is in current year
 * @param date - Date to check
 * @returns true if date is in current year
 */
export function isThisYear(date: string | Date): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return checkDate.getFullYear() === today.getFullYear();
}

/**
 * Get start and end date for a date range
 * @param range - Date range type
 * @returns Object with start and end date
 */
export function getDateRange(
  range: 'today' | 'week' | 'month' | 'year'
): { start: Date; end: Date } {
  const today = new Date();
  let start: Date, end: Date;
  
  switch (range) {
    case 'today':
      start = new Date(today);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    
    case 'week':
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay() + 1); // Monday
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6); // Sunday
      end.setHours(23, 59, 59, 999);
      break;
    
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    
    case 'year':
      start = new Date(today.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    
    default:
      start = new Date(today);
      end = new Date(today);
  }
  
  return { start, end };
}

/**
 * Get month name in Indonesian
 * @param monthIndex - Month index (0-11)
 * @returns Month name
 */
export function getMonthName(monthIndex: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthIndex] || '';
}

/**
 * Get day name in Indonesian
 * @param dayIndex - Day index (0-6, Sunday-Saturday)
 * @returns Day name
 */
export function getDayName(dayIndex: number): string {
  const days = [
    'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
  ];
  return days[dayIndex] || '';
}

/**
 * Parse date string to Date object (handle berbagai format)
 * @param dateString - Date string
 * @returns Date object
 */
export function parseDate(dateString: string): Date {
  // Try parsing ISO format first
  let date = new Date(dateString);
  
  // If invalid, try other formats
  if (isNaN(date.getTime())) {
    // Try dd/mm/yyyy format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      date = new Date(
        parseInt(parts[2]), 
        parseInt(parts[1]) - 1, 
        parseInt(parts[0])
      );
    }
  }
  
  return date;
}