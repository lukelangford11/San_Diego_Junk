/**
 * Validation utilities for lead submissions
 */

/**
 * Validate US phone number
 * Accepts formats: (555) 555-5555, 555-555-5555, 5555555555, +1-555-555-5555
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Should have 10 digits (US) or 11 digits (with country code)
  return digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly[0] === '1');
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone) {
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    return `+${digitsOnly}`;
  }
  
  return phone; // Return as-is if can't normalize
}

/**
 * Validate ZIP code (5 digits or 5+4 format)
 */
export function isValidZipCode(zipCode) {
  if (!zipCode || typeof zipCode !== 'string') {
    return false;
  }

  // Match 5 digits or 5+4 format
  const zipPattern = /^\d{5}(-\d{4})?$/;
  return zipPattern.test(zipCode.trim());
}

/**
 * Normalize ZIP code to 5 digits
 */
export function normalizeZipCode(zipCode) {
  return zipCode.trim().slice(0, 5);
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.trim());
}

/**
 * Validate photo URLs (must be from Cloudinary)
 */
export function isValidPhotoUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check if it's a valid HTTPS URL
  try {
    const parsed = new URL(url);
    
    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Should be from Cloudinary domain
    // Accept both res.cloudinary.com and custom domains
    return parsed.hostname.includes('cloudinary.com');
  } catch {
    return false;
  }
}

/**
 * Validate photo array (1-6 photos, all valid URLs)
 */
export function validatePhotoUrls(photoUrls) {
  if (!Array.isArray(photoUrls)) {
    return { valid: false, error: 'Photo URLs must be an array' };
  }

  if (photoUrls.length < 1 || photoUrls.length > 6) {
    return { valid: false, error: 'Must provide between 1 and 6 photos' };
  }

  for (const url of photoUrls) {
    if (!isValidPhotoUrl(url)) {
      return { valid: false, error: `Invalid photo URL: ${url}` };
    }
  }

  return { valid: true };
}

/**
 * Validate item types
 */
const VALID_ITEM_TYPES = [
  'furniture',
  'appliances',
  'yard_waste',
  'hot_tub',
  'construction',
  'electronics',
  'other'
];

export function validateItemTypes(itemTypes) {
  if (!Array.isArray(itemTypes)) {
    return { valid: false, error: 'Item types must be an array' };
  }

  // Empty array is valid
  if (itemTypes.length === 0) {
    return { valid: true };
  }

  // Check all types are valid
  for (const type of itemTypes) {
    if (!VALID_ITEM_TYPES.includes(type)) {
      return { valid: false, error: `Invalid item type: ${type}` };
    }
  }

  return { valid: true };
}

/**
 * Check if honeypot field is filled (indicates bot)
 */
export function isHoneypotFilled(honeypotValue) {
  // Honeypot should be empty for legitimate users
  return honeypotValue && honeypotValue.trim().length > 0;
}

/**
 * Validate complete lead submission
 */
export function validateLeadSubmission(data) {
  const errors = [];

  // Required fields
  if (!data.customer_name || data.customer_name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!isValidPhone(data.customer_phone)) {
    errors.push('Valid phone number is required');
  }

  if (!isValidZipCode(data.zip_code)) {
    errors.push('Valid ZIP code is required');
  }

  // Optional email validation
  if (data.customer_email && !isValidEmail(data.customer_email)) {
    errors.push('Invalid email format');
  }

  // Photo validation
  const photoValidation = validatePhotoUrls(data.photo_urls);
  if (!photoValidation.valid) {
    errors.push(photoValidation.error);
  }

  // Item types validation
  const itemTypesValidation = validateItemTypes(data.item_types || []);
  if (!itemTypesValidation.valid) {
    errors.push(itemTypesValidation.error);
  }

  // Honeypot check
  if (isHoneypotFilled(data.honeypot)) {
    errors.push('Bot detected');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .slice(0, 5000); // Max length
}
