/**
 * PIN Encryption Utilities
 * Menggunakan Web Crypto API untuk hashing PIN
 */

/**
 * Hash PIN menggunakan SHA-256
 * @param pin - PIN yang akan di-hash
 * @returns Hashed PIN dalam format hex string
 */
export async function hashPin(pin: string): Promise<string> {
  // Encode PIN ke Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  
  // Hash menggunakan SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert buffer ke hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Verify PIN dengan hash yang tersimpan
 * @param pin - PIN yang diinput user
 * @param hash - Hash yang tersimpan di database
 * @returns true jika cocok, false jika tidak
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const inputHash = await hashPin(pin);
  return inputHash === hash;
}

/**
 * Validate PIN format
 * @param pin - PIN yang akan divalidasi
 * @param pinType - Tipe PIN (pin4, pin6, password)
 * @returns true jika valid, false jika tidak
 */
export function validatePinFormat(
  pin: string, 
  pinType: 'pin4' | 'pin6' | 'password'
): boolean {
  switch (pinType) {
    case 'pin4':
      // Harus 4 digit angka
      return /^\d{4}$/.test(pin);
    
    case 'pin6':
      // Harus 6 digit angka
      return /^\d{6}$/.test(pin);
    
    case 'password':
      // Minimal 6 karakter
      return pin.length >= 6;
    
    default:
      return false;
  }
}

/**
 * Generate random PIN (untuk testing/demo)
 * @param pinType - Tipe PIN yang akan di-generate
 * @returns Random PIN
 */
export function generateRandomPin(pinType: 'pin4' | 'pin6' | 'password'): string {
  switch (pinType) {
    case 'pin4':
      return Math.floor(1000 + Math.random() * 9000).toString();
    
    case 'pin6':
      return Math.floor(100000 + Math.random() * 900000).toString();
    
    case 'password':
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    
    default:
      return '123456';
  }
}

/**
 * Get PIN strength (untuk password type)
 * @param pin - PIN/Password yang akan dicek
 * @returns Strength level: weak, medium, strong
 */
export function getPinStrength(pin: string): 'weak' | 'medium' | 'strong' {
  if (pin.length < 6) return 'weak';
  
  let strength = 0;
  
  // Check length
  if (pin.length >= 8) strength++;
  if (pin.length >= 12) strength++;
  
  // Check for numbers
  if (/\d/.test(pin)) strength++;
  
  // Check for lowercase
  if (/[a-z]/.test(pin)) strength++;
  
  // Check for uppercase
  if (/[A-Z]/.test(pin)) strength++;
  
  // Check for special characters
  if (/[^a-zA-Z0-9]/.test(pin)) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}

/**
 * Sanitize PIN input (remove non-numeric for PIN types)
 * @param input - Raw input dari user
 * @param pinType - Tipe PIN
 * @returns Sanitized PIN
 */
export function sanitizePinInput(
  input: string, 
  pinType: 'pin4' | 'pin6' | 'password'
): string {
  if (pinType === 'password') {
    // Password: trim whitespace saja
    return input.trim();
  }
  
  // PIN: ambil hanya angka
  return input.replace(/\D/g, '');
}

/**
 * Format PIN untuk display (mask dengan bullet points)
 * @param pin - PIN yang akan di-format
 * @returns Masked PIN (e.g., "••••")
 */
export function maskPin(pin: string): string {
  return '•'.repeat(pin.length);
}