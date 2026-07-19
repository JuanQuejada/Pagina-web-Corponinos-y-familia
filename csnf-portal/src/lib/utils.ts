// ============================================================
// UTILIDADES - CSNiños y Familia Portal
// ============================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- CLASES CSS ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- FECHAS ---
export function formatearFecha(fecha: string | Date): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatearFechaCorta(fecha: string | Date): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatearHora(fecha: string | Date): string {
  const d = new Date(fecha);
  return d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatearFechaHora(fecha: string | Date): string {
  const d = new Date(fecha);
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function tiempoRelativo(fecha: string | Date): string {
  const ahora = new Date();
  const d = new Date(fecha);
  const diffMs = ahora.getTime() - d.getTime();
  const diffSeg = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSeg / 60);
  const diffHoras = Math.floor(diffMin / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffSeg < 60) return 'Hace unos segundos';
  if (diffMin < 60) return `Hace ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
  if (diffHoras < 24) return `Hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias} días`;
  if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semana${Math.floor(diffDias / 7) > 1 ? 's' : ''}`;
  
  return formatearFechaCorta(fecha);
}

// --- ARCHIVOS ---
export function formatearTamanio(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function obtenerExtension(nombreArchivo: string): string {
  return nombreArchivo.split('.').pop()?.toLowerCase() || '';
}

export function obtenerIconoPorExtension(extension: string): string {
  const iconos: Record<string, string> = {
    pdf: 'pdf',
    doc: 'doc',
    docx: 'doc',
    xls: 'xls',
    xlsx: 'xls',
    jpg: 'img',
    jpeg: 'img',
    png: 'img',
    gif: 'img',
    zip: 'zip',
    rar: 'zip',
  };
  return iconos[extension] || 'file';
}

// --- VALIDACIÓN ---
export function esEmailValido(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

export function esPasswordSegura(password: string): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];
  
  if (password.length < 8) errores.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errores.push('Al menos 1 mayúscula');
  if (!/[a-z]/.test(password)) errores.push('Al menos 1 minúscula');
  if (!/\\d/.test(password)) errores.push('Al menos 1 número');
  if (!/[@$!%*?&]/.test(password)) errores.push('Al menos 1 símbolo (@$!%*?&)');
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

// --- INICIALES ---
export function obtenerIniciales(nombres?: string | null, apellidos?: string | null): string {
  if (!nombres && !apellidos) return '?';
  
  const n = (nombres || '').trim();
  const a = (apellidos || '').trim();
  
  const inicialN = n.charAt(0).toUpperCase();
  const inicialA = a.charAt(0).toUpperCase();
  
  return inicialN + inicialA;
}

// --- COLORES ALEATORIOS PARA AVATARES ---
export function obtenerColorAvatar(userId: string): string {
  const colores = [
    'linear-gradient(135deg, #1B6B6B, #2A9D8F)',
    'linear-gradient(135deg, #E76F51, #F4A261)',
    'linear-gradient(135deg, #2A9D8F, #34D399)',
    'linear-gradient(135deg, #E9C46A, #F4D35E)',
    'linear-gradient(135deg, #264653, #2A9D8F)',
    'linear-gradient(135deg, #8B5CF6, #A78BFA)',
    'linear-gradient(135deg, #EC4899, #F472B6)',
    'linear-gradient(135deg, #3B82F6, #60A5FA)',
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colores[Math.abs(hash) % colores.length];
}

// --- DEBOUNCE ---
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// --- LOCAL STORAGE ---
export const storage = {
  get: (key: string): any => {
    if (typeof window === "undefined") return null;
  
    const item = localStorage.getItem(key);
  
    if (!item) return null;
  
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  },
  
  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  },
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};
