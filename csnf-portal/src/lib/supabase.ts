// ============================================================
// CLIENTE SUPABASE - CSNiños y Familia Portal
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { Database } from './database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para el navegador (anon key)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Cliente para el servidor (service role - solo en API routes)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper para obtener el usuario actual desde el servidor
export async function getCurrentUser(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  // Obtener datos adicionales del usuario desde nuestra tabla
  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('*, rol:rols(*), area:areas(*), departamento:departamentos(*)')
    .eq('id', user.id)
    .single();
    
  return usuario;
}

// Helper para verificar permisos
export function tienePermiso(
  usuario: { rol?: { nivel: number; permisos: Record<string, string[]> } } | null,
  recurso: string,
  accion: string
): boolean {
  if (!usuario?.rol) return false;
  
  // Superadmin (nivel 1) tiene todos los permisos
  if (usuario.rol.nivel === 1) return true;
  
  // Verificar permiso específico
  const permisosRecurso = usuario.rol.permisos[recurso];
  if (!permisosRecurso) return false;
  
  return permisosRecurso.includes(accion);
}

// Helper para verificar si es admin o superadmin
export function esAdmin(usuario: { rol?: { nivel: number } } | null): boolean {
  return usuario?.rol?.nivel !== undefined && usuario.rol.nivel <= 2;
}

export function esSuperAdmin(usuario: { rol?: { nivel: number } } | null): boolean {
  return usuario?.rol?.nivel === 1;
}