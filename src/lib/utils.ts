import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
    if (!name) return '??';
    const trimmedName = name.trim();
    if (!trimmedName) return '??';

    const parts = trimmedName.split(/\s+/);

    if (parts.length > 1) {
        // First and last name initials
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // Only one name: first two consonants
    const consonants = trimmedName.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g);
    
    if (consonants && consonants.length >= 2) {
        return (consonants[0] + consonants[1]).toUpperCase();
    }
    
    // Fallback if not enough consonants
    if (consonants && consonants.length === 1) {
        return consonants[0].toUpperCase();
    }

    // Fallback to first 2 letters
    return trimmedName.slice(0, 2).toUpperCase();
}
