// ============================================================
// AUTENTICACIÓN SERVIDOR
// Corporación Social Niños y Familia
// ============================================================

import {
  cookies,
} from "next/headers";

import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import type {
  Usuario,
  } from "@/types";

  // ============================================================
// CREAR CLIENTE SUPABASE (SERVIDOR)
// ============================================================

export async function crearClienteServidor() {

  const cookieStore = await cookies();

  return createServerClient(

    process.env.NEXT_PUBLIC_SUPABASE_URL!,

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,

    {

      cookies: {

        get(name: string) {

          return cookieStore.get(name)?.value;

        },

        set(
          name: string,
          value: string,
          options: CookieOptions
        ) {

          try {

            cookieStore.set({
              name,
              value,
              ...options,
            });

          } catch {

            // Ignorado.
            // En Server Components las cookies son de solo lectura.
          }

        },

        remove(
          name: string,
          options: CookieOptions
        ) {

          try {

            cookieStore.set({
              name,
              value: "",
              ...options,
              maxAge: 0,
            });

          } catch {

            // Ignorado.
          }

        },

      },

    }

  );

}

// ============================================================
// OBTENER SESIÓN DEL SERVIDOR
// ============================================================

export async function obtenerSesionServidor(): Promise<Session | null> {

  const supabase =
    await crearClienteServidor();

  const {

    data: { session },

    error,

  } = await supabase.auth.getSession();

  if (error) {

    console.error(
      "Error obteniendo sesión:",
      error
    );

    return null;

  }

  return session;

}

// ============================================================
// OBTENER USUARIO AUTH
// ============================================================

export async function obtenerUsuarioAuthServidor(): Promise<User | null> {

  const supabase =
    await crearClienteServidor();

  const {

    data: { user },

    error,

  } = await supabase.auth.getUser();

  if (error) {

    console.error(
      "Error obteniendo usuario Auth:",
      error
    );

    return null;

  }

  return user;

}

// ============================================================
// OBTENER USUARIO DEL PORTAL
// ============================================================

export async function obtenerUsuarioPortalServidor(): Promise<Usuario | null> {

  const authUser =
    await obtenerUsuarioAuthServidor();

  if (!authUser) {

    return null;

  }

  const supabase =
    await crearClienteServidor();

  // ==========================================================
  // Usuario
  // ==========================================================

  const {

    data: usuario,

    error: usuarioError,

  } = await supabase

    .from("usuarios")

    .select("*")

    .eq("id", authUser.id)

    .single();

  if (usuarioError || !usuario) {

    console.error(

      "Usuario no encontrado:",

      usuarioError

    );

    return null;

  }

  // ==========================================================
  // Perfil activo
  // ==========================================================

  const {

    data: asignacion,

  } = await supabase

    .from("usuarios_asignaciones")

    .select(`
      *,
      rol:roles(*),
      cargo:cargos(
        *,
        departamento:departamentos(
          *,
          area:areas(*)
        )
      )
    `)

    .eq("usuario_id", usuario.id)

    .eq("activo", true)

    .eq("perfil_predeterminado", true)

    .single();

  // ==========================================================
  // Construcción del objeto Usuario
  // ==========================================================

  return {

    ...usuario,

    email: authUser.email ?? "",

    rol: asignacion?.rol,

    cargo: asignacion?.cargo,

    departamento:
      asignacion?.cargo?.departamento,

    area:
      asignacion?.cargo?.departamento?.area,

  } as Usuario;

}

// ============================================================
// USUARIO AUTENTICADO
// ============================================================

export async function usuarioAutenticado(): Promise<boolean> {

  const session =
    await obtenerSesionServidor();

  return session !== null;

}

// ============================================================
// CERRAR SESIÓN (SERVIDOR)
// ============================================================

export async function cerrarSesionServidor(): Promise<void> {

  const supabase =
    await crearClienteServidor();

  const { error } =
    await supabase.auth.signOut();

  if (error) {

    console.error(
      "Error cerrando sesión:",
      error
    );

  }

}