// ============================================================
// AUTH CLIENT
// Portal Corporación Social Niños y Familia
// Cliente oficial de autenticación
// ============================================================

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

import type {
  ApiResponse,
} from "@/types";

import databaseRepository from "@/lib/database/repositories";

// ============================================================
// RESPUESTAS
// ============================================================

export interface SessionResponse
  extends ApiResponse<Session | null> {}

export interface AuthUserResponse
  extends ApiResponse<User | null> {}

// ============================================================
// LOGIN
// ============================================================

export async function login(
  email: string,
  password: string
): Promise<ApiResponse<Session>> {

  try {

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.session) {

      return {
        success: false,
        error:
          error?.message ??
          "No fue posible iniciar sesión.",
      };

    }

    //----------------------------------------------------------
    // Validar que exista usuario del Portal
    //----------------------------------------------------------

    const {
      data: usuarioPortal,
      error: usuarioError,
    } =
    await databaseRepository.obtenerUsuarioPorAuthId(
      data.user.id
    );
    
    console.log("Usuario Portal:", usuarioPortal);
    console.log("Error Portal:", usuarioError);

    if (usuarioError || !usuarioPortal) {

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "El usuario autenticado no existe en el Portal.",
      };

    }

    return {
      success: true,
      data: data.session,
      message:
        "Autenticación correcta.",
    };

  } catch (error) {

    console.error(
      "Error iniciando sesión:",
      error
    );

    return {
      success: false,
      error:
        "Ocurrió un error inesperado.",
    };

  }

}

// ============================================================
// OBTENER SESIÓN
// ============================================================

export async function obtenerSesion():
Promise<SessionResponse> {

  try {

    const {
      data,
      error,
    } =
      await supabase.auth.getSession();

    if (error) {

      return {
        success: false,
        error: error.message,
      };

    }

    return {
      success: true,
      data: data.session,
    };

  } catch (error) {

    console.error(
      "Error obteniendo sesión:",
      error
    );

    return {
      success: false,
      error:
        "No fue posible obtener la sesión.",
    };

  }

}

// ============================================================
// OBTENER USUARIO AUTH
// ============================================================

export async function obtenerUsuarioAuth():
Promise<AuthUserResponse> {

  try {

    const {
      data,
      error,
    } =
      await supabase.auth.getUser();

    if (error) {

      return {
        success: false,
        error: error.message,
      };

    }

    return {
      success: true,
      data: data.user,
    };

  } catch (error) {

    console.error(
      "Error obteniendo usuario Auth:",
      error
    );

    return {
      success: false,
      error:
        "No fue posible obtener el usuario autenticado.",
    };

  }

}

// ============================================================
// REFRESCAR SESIÓN
// ============================================================

export async function refreshSession():
Promise<SessionResponse> {

  try {

    const {
      data,
      error,
    } =
      await supabase.auth.refreshSession();

    if (error) {

      return {
        success: false,
        error: error.message,
      };

    }

    return {
      success: true,
      data: data.session,
    };

  } catch (error) {

    console.error(
      "Error refrescando sesión:",
      error
    );

    return {
      success: false,
      error:
        "No fue posible refrescar la sesión.",
    };

  }

}

// ============================================================
// CERRAR SESIÓN
// ============================================================

export async function logout():
Promise<ApiResponse> {

  try {

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {

      return {
        success: false,
        error: error.message,
      };

    }

    return {
      success: true,
      message:
        "Sesión cerrada correctamente.",
    };

  } catch (error) {

    console.error(
      "Error cerrando sesión:",
      error
    );

    return {
      success: false,
      error:
        "No fue posible cerrar la sesión.",
    };

  }

}

// ============================================================
// RECUPERAR CONTRASEÑA
// ============================================================

export async function recuperarPassword(
  email: string
): Promise<ApiResponse> {

  try {

    const {
      error,
    } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${window.location.origin}/cambiar-password`,
        }
      );

    if (error) {

      return {
        success: false,
        error: error.message,
      };

    }

    return {
      success: true,
      message:
        "Si el correo existe recibirá un enlace para restablecer la contraseña.",
    };

  } catch (error) {

    console.error(
      "Error recuperando contraseña:",
      error
    );

    return {
      success: false,
      error:
        "No fue posible enviar el correo de recuperación.",
    };

  }

}

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================

export async function cambiarPassword(
  nuevaPassword: string
): Promise<ApiResponse> {

  try {

    const {
      error,
    } =
      await supabase.auth.updateUser({

        password: nuevaPassword,

      });

    if (error) {

      return {
        success: false,
        error: error.message,
      };

    }

    return {
      success: true,
      message:
        "La contraseña fue actualizada correctamente.",
    };

  } catch (error) {

    console.error(
      "Error cambiando contraseña:",
      error
    );

    return {
      success: false,
      error:
        "No fue posible cambiar la contraseña.",
    };

  }

}