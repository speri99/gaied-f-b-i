import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from "libphonenumber-js"

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhoneNumber(phoneNumber: string, country: CountryCode = "US", partial = false): string | null {
  try {
    // If the string is empty or we're in partial mode and it's too short, don't validate
    if (!phoneNumber || (partial && phoneNumber.length < 4)) {
      return null;
    }

    // Parse with the specified country code
    const parsedNumber = parsePhoneNumber(phoneNumber, country)
    
    // If we're in partial mode, don't validate fully
    if (partial) {
      return null;
    }
    
    // If the number is valid, return it in E.164 format without the + prefix
    if (parsedNumber && isValidPhoneNumber(parsedNumber.number)) {
      return parsedNumber.format("E.164").substring(1) // Remove the + prefix
    }
    
    return null
  } catch (error) {
    // Don't log errors during partial validation
    if (!partial) {
      console.error("Error normalizing phone number:", error)
    }
    return null
  }
}

export function generateBase62Id(length: number = 4): string {
  let result = '';
  const timestamp = Date.now();
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * BASE62_CHARS.length);
    result += BASE62_CHARS[randomIndex];
  }
  return result;
}

export function generateCaseId(tenantId: string): string {
  const base62Id = generateBase62Id(4);
  return `${tenantId}-${base62Id}`;
}

export function parseBase62Id(fullId: string): { tenantId: string; base62Id: string } {
  // Find the last 4 characters that match our lowercase alphanumeric pattern
  const base62Match = fullId.match(/[0-9a-z]{4}$/);
  if (!base62Match) {
    throw new Error('Invalid case ID format');
  }
  
  const base62Id = base62Match[0];
  const tenantId = fullId.slice(0, -5); // Remove the base62Id and the hyphen before it
  
  return { tenantId, base62Id };
}

export function displayCaseId(fullId: string): string {
  const { base62Id } = parseBase62Id(fullId);
  return base62Id;
}
