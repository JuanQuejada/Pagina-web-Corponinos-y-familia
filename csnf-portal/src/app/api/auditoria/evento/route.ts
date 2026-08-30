import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@supabase/supabase-js";

/* ============================================================
   SUPABASE ADMIN
   ============================================================ */

const supabaseAdmin =
  createClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL!,
    process.env
      .SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken:
          false,
        persistSession: false,
      },
    }
  );

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */

async function obtenerUsuario(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) ||
    request.headers.get(
      "Authorization"
    );

  if (!authorization) {
    return null;
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  if (!match) {
    return null;
  }

  const token = match[1];

  const {
    data: { user },
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (error || !user) {
    return null;
  }

  return user;
}

/* ============================================================
   POST
   ============================================================ */

export async function POST(
  request: NextRequest
) {
  try {
    /* ----------------------------------------------------------
       AUTENTICACIÓN
    ---------------------------------------------------------- */

    const usuario =
      await obtenerUsuario(
        request
      );

    if (!usuario) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    /* ----------------------------------------------------------
       BODY
    ---------------------------------------------------------- */

    const body =
      await request
        .json()
        .catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El cuerpo de la solicitud no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const accion =
      String(
        body.accion || ""
      )
        .trim()
        .toUpperCase();

    const entidad =
      body.entidad
        ? String(
            body.entidad
          ).trim()
        : null;

    const entidadId =
      body.entidad_id
        ? String(
            body.entidad_id
          ).trim()
        : null;

    const detalles =
      body.detalles &&
      typeof body.detalles ===
        "object"
        ? body.detalles
        : {};

    if (!accion) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La acción es obligatoria.",
        },
        {
          status: 400,
        }
      );
    }

    if (accion.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La acción no puede superar 100 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    /* ----------------------------------------------------------
       INFORMACIÓN DEL REQUEST
    ---------------------------------------------------------- */

    const forwardedFor =
      request.headers.get(
        "x-forwarded-for"
      );

    const realIp =
      request.headers.get(
        "x-real-ip"
      );

    const ip =
      forwardedFor
        ?.split(",")[0]
        ?.trim() ||
      realIp ||
      null;

    const userAgent =
      request.headers.get(
        "user-agent"
      ) || null;

    /* ----------------------------------------------------------
       REGISTRO
    ---------------------------------------------------------- */

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("auditoria")
        .insert({
          usuario_id:
            usuario.id,

          accion,

          entidad,

          entidad_id:
            entidadId,

          detalles: {
            ...detalles,

            origen:
              "aplicacion",

            endpoint:
              "/api/auditoria/evento",
          },

          ip_address:
            ip,

          user_agent:
            userAgent,

          created_at:
            new Date().toISOString(),
        })
        .select(
          `
            id,
            usuario_id,
            accion,
            entidad,
            entidad_id,
            detalles,
            ip_address,
            user_agent,
            created_at
          `
        )
        .single();

    if (error) {
      console.error(
        "Error registrando evento de auditoría:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "No fue posible registrar el evento de auditoría.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "Error inesperado registrando auditoría:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Error interno del servidor.",
      },
      {
        status: 500,
      }
    );
  }
}