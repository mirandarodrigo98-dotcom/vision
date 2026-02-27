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

export function isValidCPF(cpf: string) {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) 
    soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
  
  resto = (soma * 10) % 11;
  
  if ((resto === 10) || (resto === 11))  resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10)) ) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) 
    soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
    
  resto = (soma * 10) % 11;
  
  if ((resto === 10) || (resto === 11))  resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11) ) ) return false;
  
  return true;
}
