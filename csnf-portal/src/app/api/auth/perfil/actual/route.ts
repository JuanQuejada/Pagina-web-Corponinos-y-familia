// ============================================================
// API - PERFIL ACTUAL
// Portal Corporación Social Niños y Familia
// ============================================================

import { NextRequest } from "next/server";

import {
  obtenerPerfilActivoServidor,
} from "@/lib/auth/server-context";

// ============================================================
// GET
// ============================================================

export async function GET(
  request: NextRequest
) {

  try {

    const contexto =
      await obtenerPerfilActivoServidor(
        request
      );

    if (!contexto) {

      return Response.json(
        {
          success: false,
          error:
            "No existe un perfil activo seleccionado.",
        },
        {
          status: 403,
        }
      );
    }

    return Response.json({

      success: true,

      usuario: {
        id: contexto.usuario.id,
        nombres:
          contexto.usuario.nombres,
        apellidos:
          contexto.usuario.apellidos,
        razon_social:
          contexto.usuario.razon_social,
        email:
          contexto.usuario.email ??
          contexto.authUser.email ??
          null,
      },

      perfil: {

        id:
          contexto.asignacion.id,

        cargo:
          contexto.cargo
            ? {
                id:
                  contexto.cargo.id,

                nombre:
                  contexto.cargo.nombre,

                codigo:
                  contexto.cargo.codigo,
              }
            : null,

        rol:
          contexto.rol
            ? {
                id:
                  contexto.rol.id,

                nombre:
                  contexto.rol.nombre,

                codigo:
                  contexto.rol.codigo,

                nivel:
                  contexto.rol.nivel,
              }
            : null,

      },

    });

  } catch (error: any) {

    console.error(
      "Error API perfil actual:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error?.message ??
          "No fue posible obtener el perfil activo.",
      },
      {
        status: 500,
      }
    );
  }
}