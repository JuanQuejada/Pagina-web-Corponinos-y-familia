// ============================================================
// SESSION
// Portal Corporación Social Niños y Familia
// Gestión de la sesión del Portal
// ============================================================

import type {
    Session,
  } from "@supabase/supabase-js";
  
  import type {
    ApiResponse,
    SesionPortal,
  } from "@/types";
  
  import {
    obtenerSesion,
  } from "@/lib/auth/auth-client";
  
  import {
    obtenerUsuarioPortal,
  } from "@/lib/auth/profile";
  
  // ============================================================
  // RESPUESTAS
  // ============================================================
  
  export interface SessionPortalResponse
    extends ApiResponse<SesionPortal | null> {}
  
  // ============================================================
  // OBTENER SESIÓN DEL PORTAL
  // ============================================================
  
  export async function obtenerSesionPortal():
  Promise<SessionPortalResponse> {
  
    try {
  
      //----------------------------------------------------------
      // Sesión de Supabase
      //----------------------------------------------------------
  
      const sesion =
        await obtenerSesion();
  
      if (
        !sesion.success ||
        !sesion.data
      ) {
  
        return {
  
          success: true,
  
          data: null,
  
        };
  
      }
  
      //----------------------------------------------------------
      // Usuario del Portal
      //----------------------------------------------------------
  
      const usuario =
        await obtenerUsuarioPortal();
  
      if (!usuario) {
  
        return {
  
          success: false,
  
          error:
            "No fue posible construir el usuario del Portal.",
  
        };
  
      }
  
      //----------------------------------------------------------
      // Construcción de la sesión
      //----------------------------------------------------------
  
      const sesionPortal: SesionPortal = {
  
        usuario,
  
        accessToken:
          sesion.data.access_token,
  
        refreshToken:
          sesion.data.refresh_token,
  
        expiresAt:
          sesion.data.expires_at,
  
      };
  
      return {
  
        success: true,
  
        data: sesionPortal,
  
      };
  
    } catch (error) {
  
      console.error(
        "Error obteniendo la sesión del Portal:",
        error
      );
  
      return {
  
        success: false,
  
        error:
          "No fue posible obtener la sesión del Portal.",
  
      };
  
    }
  
  }

  // ============================================================
  // VALIDAR SI EXISTE UNA SESIÓN ACTIVA
  // ============================================================
  
  export async function haySesionActiva():
  Promise<boolean> {
  
    const resultado =
      await obtenerSesionPortal();
  
    return (
      resultado.success &&
      resultado.data !== null
    );
  
  }

  // ============================================================
// REFRESCAR SESIÓN
// ============================================================

import {
    refreshSession,
    logout,
  } from "@/lib/auth/auth-client";
  
  // ============================================================
  
  export async function refrescarSesion():
  Promise<boolean> {
  
    const resultado =
      await refreshSession();
  
    return resultado.success;
  
  }
  
  // ============================================================
  // CERRAR SESIÓN
  // ============================================================
  
  export async function cerrarSesion():
  Promise<boolean> {
  
    const resultado =
      await logout();
  
    return resultado.success;
  
  }

  // ============================================================
// REQUIERE AUTENTICACIÓN
// ============================================================

export async function requiereAutenticacion():
Promise<boolean> {

  return await haySesionActiva();

}

// ============================================================
// EXPORTACIONES
// ============================================================

export type {
  Session,
};