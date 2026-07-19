// ============================================================
// AUTENTICACIÓN - CSNiños y Familia Portal
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase';
import { Usuario } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

export interface AuthResult {
  success: boolean;
  token?: string;
  usuario?: Usuario;
  error?: string;
  requiere_completar_perfil?: boolean;
  requiere_cambiar_password?: boolean;
}

// --- LOGIN ---
export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    // Buscar usuario por email
    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .select('*, rol:roles(*)')
      .eq('email', email.toLowerCase().trim())
      .eq('activo', true)
      .single();

    if (error || !usuario) {
      return { success: false, error: 'Credenciales inválidas' };
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return { success: false, error: 'Credenciales inválidas' };
    }

    // Actualizar último login
    await supabaseAdmin
      .from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', usuario.id);

    // Generar JWT
    const token = jwt.sign(
      { 
        userId: usuario.id, 
        email: usuario.email,
        rol: usuario.rol?.nombre,
        nivel: usuario.rol?.nivel 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Verificar si debe completar perfil o cambiar password
    const requiereCompletar = !usuario.perfil_completo;
    const requierePassword = !usuario.password_cambiada;

    return {
      success: true,
      token,
      usuario,
      requiere_completar_perfil: requiereCompletar,
      requiere_cambiar_password: requierePassword,
    };
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

// --- VERIFICAR TOKEN ---
export function verifyToken(token: string): { userId: string; email: string; rol: string; nivel: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      rol: string;
      nivel: number;
    };
    return decoded;
  } catch {
    return null;
  }
}

// --- CAMBIAR CONTRASEÑA ---
export async function cambiarPassword(
  userId: string, 
  passwordActual: string, 
  passwordNueva: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener usuario
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Verificar password actual
    const valido = await bcrypt.compare(passwordActual, usuario.password_hash);
    if (!valido) {
      return { success: false, error: 'Contraseña actual incorrecta' };
    }

    // Validar nueva contraseña
    if (passwordNueva.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])/.test(passwordNueva)) {
      return { success: false, error: 'Debe incluir mayúscula, minúscula, número y símbolo' };
    }

    // Hashear y guardar nueva contraseña
    const nuevoHash = await bcrypt.hash(passwordNueva, 12);
    
    const { error } = await supabaseAdmin
      .from('usuarios')
      .update({ 
        password_hash: nuevoHash,
        password_cambiada: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      return { success: false, error: 'Error al actualizar contraseña' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error cambiando password:', error);
    return { success: false, error: 'Error interno' };
  }
}

// --- CREAR USUARIO (solo admin/superadmin) ---
export async function crearUsuario(
  datos: {
    email: string;
    nombres: string;
    apellidos: string;
    tipo_documento: string;
    numero_documento: string;
    rol_id: string;
    area_id: string;
    departamento_id: string;
    cargo: string;
    fecha_vinculacion: string;
    tipo_contrato: string;
  },
  creadoPor: string
): Promise<{ success: boolean; usuario?: any; error?: string; passwordTemporal?: string }> {
  try {
    // Generar contraseña temporal
    const passwordTemporal = generarPasswordTemporal();
    const passwordHash = await bcrypt.hash(passwordTemporal, 12);

    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .insert({
        email: datos.email.toLowerCase().trim(),
        password_hash: passwordHash,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        tipo_documento: datos.tipo_documento,
        numero_documento: datos.numero_documento,
        rol_id: datos.rol_id,
        area_id: datos.area_id,
        departamento_id: datos.departamento_id,
        cargo: datos.cargo,
        fecha_vinculacion: datos.fecha_vinculacion,
        tipo_contrato: datos.tipo_contrato,
        perfil_completo: false,
        password_cambiada: false,
        activo: true,
        created_by: creadoPor,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      usuario,
      passwordTemporal 
    };
  } catch (error) {
    console.error('Error creando usuario:', error);
    return { success: false, error: 'Error interno al crear usuario' };
  }
}

// --- COMPLETAR PERFIL ---
export async function completarPerfil(
  userId: string,
  datos: {
    nombres: string;
    apellidos: string;
    tipo_documento: string;
    numero_documento: string;
    telefono: string;
    direccion: string;
    fecha_nacimiento: string;
    fecha_vinculacion: string;
    cargo: string;
    foto_url?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('usuarios')
      .update({
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        tipo_documento: datos.tipo_documento,
        numero_documento: datos.numero_documento,
        telefono: datos.telefono,
        direccion: datos.direccion,
        fecha_nacimiento: datos.fecha_nacimiento,
        fecha_vinculacion: datos.fecha_vinculacion,
        cargo: datos.cargo,
        foto_url: datos.foto_url,
        perfil_completo: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error completando perfil:', error);
    return { success: false, error: 'Error interno' };
  }
}

// --- UTILIDADES ---
function generarPasswordTemporal(): string {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const simbolos = '@$!%*?&';
  
  let password = '';
  password += mayusculas[Math.floor(Math.random() * mayusculas.length)];
  password += minusculas[Math.floor(Math.random() * minusculas.length)];
  password += numeros[Math.floor(Math.random() * numeros.length)];
  password += simbolos[Math.floor(Math.random() * simbolos.length)];
  
  const todos = mayusculas + minusculas + numeros + simbolos;
  for (let i = 0; i < 8; i++) {
    password += todos[Math.floor(Math.random() * todos.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}