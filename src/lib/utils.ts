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

export function parseQuestorNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  
  // Se contiver vírgula e ponto, assume formato 1.000,00 ou 1,000.00
  // Se contiver apenas vírgula, assume decimal (pt-BR)
  // Se contiver apenas ponto, assume decimal (en-US)
  
  if (str.includes(',') && !str.includes('.')) {
      return parseFloat(str.replace(',', '.'));
  }
  
  if (str.includes('.') && !str.includes(',')) {
      return parseFloat(str);
  }

  // Se tem ambos, o último é o decimal
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  if (lastComma > lastDot) {
      // 1.000,00 -> remove pontos, troca vírgula por ponto
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  } else {
      // 1,000.00 -> remove vírgulas
      return parseFloat(str.replace(/,/g, ''));
  }
}

export function extractQuestorField(obj: any, keys: string[]): any {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
    // Tenta também uppercase e lowercase
    if (obj[key.toUpperCase()] !== undefined && obj[key.toUpperCase()] !== null && obj[key.toUpperCase()] !== '') {
      return obj[key.toUpperCase()];
    }
    if (obj[key.toLowerCase()] !== undefined && obj[key.toLowerCase()] !== null && obj[key.toLowerCase()] !== '') {
      return obj[key.toLowerCase()];
    }
  }
  return undefined;
}
