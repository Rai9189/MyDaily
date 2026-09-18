/**
 * Shared validation utilities for form inputs across CRUD pages
 * Centralized validation logic for consistency and maintainability
 */

/**
 * Validate that a name/title is not empty and within character limit
 * @example validateName("My Item", 100) → { valid: true }
 * @example validateName("", 100) → { valid: false, error: "Name is required" }
 */
export function validateName(value: string, maxLength: number = 100): { valid: boolean; error?: string } {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, error: 'Name is required' };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Name must be ${maxLength} characters or less` };
  }

  return { valid: true };
}

/**
 * Validate that a description/content is within character limit
 * @example validateDescription("", 10000) → { valid: true } (empty allowed)
 * @example validateDescription("x".repeat(10001), 10000) → { valid: false, error: "..." }
 */
export function validateDescription(value: string, maxLength: number = 10000): { valid: boolean; error?: string } {
  if (value.length > maxLength) {
    return { valid: false, error: `Description must be ${maxLength} characters or less` };
  }

  return { valid: true };
}

/**
 * Validate that an amount/number is positive and within limits
 * @example validateAmount(1000, 1000000000) → { valid: true }
 * @example validateAmount(0, 1000000000) → { valid: false, error: "Amount must be greater than 0" }
 */
export function validateAmount(value: number, maxAmount: number = 1_000_000_000): { valid: boolean; error?: string } {
  if (value <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (value > maxAmount) {
    return { valid: false, error: `Amount cannot exceed ${maxAmount.toLocaleString('id-ID')}` };
  }

  return { valid: true };
}

/**
 * Validate that a date is valid and not in the past
 * @example validateDate(new Date()) → { valid: true }
 * @example validateDate(new Date("2020-01-01")) → { valid: false, error: "Date cannot be in the past" }
 */
export function validateDate(value: Date, allowPast: boolean = false): { valid: boolean; error?: string } {
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }

  if (!allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (value < today) {
      return { valid: false, error: 'Date cannot be in the past' };
    }
  }

  return { valid: true };
}

/**
 * Validate that a color is a valid hex color code
 * @example validateColor("#3b82f6") → { valid: true }
 * @example validateColor("red") → { valid: false, error: "Invalid color format" }
 */
export function validateColor(value: string): { valid: boolean; error?: string } {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  if (!hexColorRegex.test(value)) {
    return { valid: false, error: 'Color must be a valid hex code (e.g., #3b82f6)' };
  }

  return { valid: true };
}

/**
 * Validate that a string matches a set of allowed values
 * @example validateEnum("income", ["income", "expense"]) → { valid: true }
 * @example validateEnum("invalid", ["income", "expense"]) → { valid: false, error: "..." }
 */
export function validateEnum<T extends string>(value: T, allowed: T[]): { valid: boolean; error?: string } {
  if (!allowed.includes(value)) {
    return { valid: false, error: `Value must be one of: ${allowed.join(', ')}` };
  }

  return { valid: true };
}
