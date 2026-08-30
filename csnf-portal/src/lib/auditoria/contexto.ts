// ============================================================
// CONTEXTO DE AUDITORÍA
// Portal Corporación Social Niños y Familia
// ============================================================

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// OBTENER IP
// ============================================================

export function obtenerIpRequest(
  request: NextRequest
): string | null {

  const forwarded =
    request.headers.get("x-forwarded-for");

  if (forwarded) {

    return (
      forwarded
        .split(",")[0]
        ?.trim() || null
    );
  }

  return (
    request.headers.get("x-real-ip") ||
    null
  );
}


// ============================================================
// OBTENER USER AGENT
// ============================================================

export function obtenerUserAgentRequest(
  request: NextRequest
): string | null {

  return request.headers.get(
    "user-agent"
  );
}


// ============================================================
// OBTENER USUARIO AUTENTICADO
// ============================================================
//
// Esta función utiliza la sesión/cookie del usuario.
// NO recibe usuario_id desde el navegador.
// ============================================================

export async function obtenerUsuarioAutenticadoRequest(
  request: NextRequest
): Promise<string | null> {

  try {

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return null;
    }

    const token =
      authorization.replace(
        /^Bearer\s+/i,
        ""
      ).trim();

    if (!token) {
      return null;
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (error || !data.user) {
      return null;
    }

    return data.user.id;

  } catch (error) {

    console.error(
      "Error obteniendo usuario de auditoría:",
      error
    );

    return null;
  }
}


// ============================================================
// PREPARAR CONTEXTO
// ============================================================
//
// NOTA:
// Esta función devuelve los datos que deben utilizar las APIs.
// La operación de base de datos deberá ejecutarse con el
// usuario identificado.
// ============================================================

export async function obtenerContextoAuditoria(
  request: NextRequest
) {

  const usuarioId =
    await obtenerUsuarioAutenticadoRequest(
      request
    );

  return {

    usuarioId,

    ipAddress:
      obtenerIpRequest(request),

    userAgent:
      obtenerUserAgentRequest(request),

  };

}