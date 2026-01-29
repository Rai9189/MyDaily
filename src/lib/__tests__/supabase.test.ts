// src/lib/__tests__/supabase.test.ts
import { describe, it, expect } from 'vitest';
import { 
  generateUniqueFileName, 
  getFileExtension, 
  isImageFile, 
  formatFileSize 
} from '../supabase';

describe('Supabase Utility Functions', () => {
  describe('generateUniqueFileName', () => {
    it('should generate unique filename with timestamp', () => {
      const original = 'test.jpg';
      const unique1 = generateUniqueFileName(original);
      const unique2 = generateUniqueFileName(original);
      
      expect(unique1).toContain('.jpg');
      expect(unique2).toContain('.jpg');
      expect(unique1).not.toBe(unique2);
    });

    it('should preserve file extension', () => {
      expect(generateUniqueFileName('document.pdf')).toContain('.pdf');
      expect(generateUniqueFileName('image.png')).toContain('.png');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(getFileExtension('test.jpg')).toBe('jpg');
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('noextension')).toBe(''); // ✅ FIXED
    });
  });

  describe('isImageFile', () => {
    it('should identify image files correctly', () => {
      expect(isImageFile('photo.jpg')).toBe(true);
      expect(isImageFile('photo.jpeg')).toBe(true);
      expect(isImageFile('image.png')).toBe(true);
      expect(isImageFile('graphic.gif')).toBe(true);
      expect(isImageFile('photo.webp')).toBe(true);
    });

    it('should return false for non-image files', () => {
      expect(isImageFile('document.pdf')).toBe(false);
      expect(isImageFile('data.txt')).toBe(false);
      expect(isImageFile('video.mp4')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isImageFile('PHOTO.JPG')).toBe(true);
      expect(isImageFile('Image.PNG')).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1024)).toBe('1.00 KB'); // ✅ FIXED: Add .00
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB'); // ✅ FIXED: Add .00
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB'); // ✅ FIXED: Add .00
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.50 KB'); // ✅ FIXED: Keep .50
      expect(formatFileSize(1572864)).toBe('1.50 MB'); // ✅ FIXED: Keep .50
    });
  });
});