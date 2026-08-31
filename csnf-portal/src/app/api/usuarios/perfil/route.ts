import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================
// HELPERS
// ============================================================

function respuesta(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, { status });
}

function obtenerToken(
  request: NextRequest
): string | null {
  const authorization =
    request.headers.get("authorization") || "";

  const match =
    authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

// ============================================================
// OBTENER USUARIO AUTENTICADO
// ============================================================

async function obtenerUsuarioAutenticado(
  request: NextRequest
) {
  const token = obtenerToken(request);

  if (!token) {
    return {
      error: respuesta(
        {
          success: false,
          error: "No se proporcionó token de autenticación.",
        },
        401
      ),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      error: respuesta(
        {
          success: false,
          error: "Sesión inválida o expirada.",
        },
        401
      ),
    };
  }

  const {
    data: usuario,
    error: usuarioError,
  } = await supabaseAdmin
    .from("usuarios")
    .select(`
      id,
      auth_user_id,
      email,
      telefono,
      direccion,
      foto_url
    `)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    console.error(
      "Error consultando usuario autenticado:",
      usuarioError
    );

    return {
      error: respuesta(
        {
          success: false,
          error: "No fue posible consultar el usuario.",
        },
        500
      ),
    };
  }

  if (!usuario) {
    return {
      error: respuesta(
        {
          success: false,
          error:
            "No existe un usuario de portal asociado a la sesión.",
        },
        404
      ),
    };
  }

  return {
    user,
    usuario,
  };
}

// ============================================================
// PATCH /api/usuarios/perfil
//
// Actualiza información editable del perfil.
// ============================================================

export async function PATCH(
  request: NextRequest
) {
  try {
    const autenticado =
      await obtenerUsuarioAutenticado(request);

    if (autenticado.error) {
      return autenticado.error;
    }

    const { usuario } = autenticado;

    const body =
      await request.json().catch(() => ({}));

    const telefono =
      body.telefono == null
        ? null
        : String(body.telefono).trim();

    const direccion =
      body.direccion == null
        ? null
        : String(body.direccion).trim();

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("usuarios")
      .update({
        telefono,
        direccion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario.id)
      .select(`
        id,
        email,
        telefono,
        direccion,
        foto_url
      `)
      .single();

    if (error) {
      console.error(
        "Error actualizando perfil:",
        error
      );

      return respuesta(
        {
          success: false,
          error:
            "No fue posible actualizar el perfil.",
          detalle: error.message,
        },
        500
      );
    }

    return respuesta({
      success: true,
      usuario: data,
    });
  } catch (error: any) {
    console.error(
      "PATCH /api/usuarios/perfil:",
      error
    );

    return respuesta(
      {
        success: false,
        error:
          error?.message ||
          "Error interno del servidor.",
      },
      500
    );
  }
}

// ============================================================
// POST /api/usuarios/perfil/foto
//
// Recibe multipart/form-data con:
//
//   foto: File
//
// La subida se realiza con SERVICE ROLE para evitar depender
// de una política RLS del bucket desde el navegador.
// ============================================================

export async function POST(
  request: NextRequest
) {
  try {
    const autenticado =
      await obtenerUsuarioAutenticado(request);

    if (autenticado.error) {
      return autenticado.error;
    }

    const { usuario } = autenticado;

    const formData =
      await request.formData();

    const archivo =
      formData.get("foto");

    if (!(archivo instanceof File)) {
      return respuesta(
        {
          success: false,
          error:
            "No se recibió una imagen válida.",
        },
        400
      );
    }

    // ----------------------------------------------------------
    // VALIDACIONES
    // ----------------------------------------------------------

    const MAX_SIZE_BYTES =
      300 * 1024;

    if (archivo.size > MAX_SIZE_BYTES) {
      return respuesta(
        {
          success: false,
          error:
            "La imagen no puede superar los 300 KB.",
        },
        400
      );
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      return respuesta(
        {
          success: false,
          error:
            "Formato de imagen no permitido. Use JPG, PNG o WEBP.",
        },
        400
      );
    }

    // ----------------------------------------------------------
    // EXTENSIÓN
    // ----------------------------------------------------------

    const extension =
      archivo.type === "image/png"
        ? "png"
        : archivo.type === "image/webp"
        ? "webp"
        : "jpg";

    // ----------------------------------------------------------
    // NOMBRE ÚNICO
    // ----------------------------------------------------------

    const nombreArchivo =
      `avatar_${usuario.id}_${Date.now()}.${extension}`;

    const rutaArchivo =
      `usuarios/${usuario.id}/${nombreArchivo}`;

    // ----------------------------------------------------------
    // CONVERTIR FILE A BUFFER
    // ----------------------------------------------------------

    const arrayBuffer =
      await archivo.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    // ----------------------------------------------------------
    // SUBIR AL STORAGE
    // ----------------------------------------------------------

    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from("avatars")
      .upload(
        rutaArchivo,
        buffer,
        {
          contentType: archivo.type,
          upsert: false,
          cacheControl: "3600",
        }
      );

    if (uploadError) {
      console.error(
        "Error subiendo fotografía al Storage:",
        uploadError
      );

      return respuesta(
        {
          success: false,
          error:
            "No fue posible subir la fotografía.",
          detalle: uploadError.message,
        },
        500
      );
    }

    // ----------------------------------------------------------
    // OBTENER URL PÚBLICA
    // ----------------------------------------------------------

    const {
      data: publicUrlData,
    } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(rutaArchivo);

    const fotoUrl =
      publicUrlData.publicUrl;

    // ----------------------------------------------------------
    // ACTUALIZAR USUARIO
    // ----------------------------------------------------------

    const {
      data: usuarioActualizado,
      error: updateError,
    } = await supabaseAdmin
      .from("usuarios")
      .update({
        foto_url: fotoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario.id)
      .select(`
        id,
        email,
        telefono,
        direccion,
        foto_url
      `)
      .single();

    if (updateError) {
      console.error(
        "Error actualizando foto_url:",
        updateError
      );

      // --------------------------------------------------------
      // ROLLBACK DEL ARCHIVO
      // --------------------------------------------------------

      await supabaseAdmin.storage
        .from("avatars")
        .remove([rutaArchivo])
        .catch(() => undefined);

      return respuesta(
        {
          success: false,
          error:
            "La imagen fue subida, pero no fue posible actualizar el perfil.",
          detalle: updateError.message,
        },
        500
      );
    }

    return respuesta({
      success: true,
      message:
        "Fotografía de perfil actualizada correctamente.",
      usuario: usuarioActualizado,
      foto_url: fotoUrl,
    });
  } catch (error: any) {
    console.error(
      "POST /api/usuarios/perfil:",
      error
    );

    return respuesta(
      {
        success: false,
        error:
          error?.message ||
          "Error interno del servidor.",
      },
      500
    );
  }
}

// ============================================================
// DELETE /api/usuarios/perfil/foto
//
// Elimina la referencia de la fotografía.
// ============================================================

export async function DELETE(
  request: NextRequest
) {
  try {
    const autenticado =
      await obtenerUsuarioAutenticado(request);

    if (autenticado.error) {
      return autenticado.error;
    }

    const { usuario } = autenticado;

    const {
      error,
    } = await supabaseAdmin
      .from("usuarios")
      .update({
        foto_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario.id);

    if (error) {
      console.error(
        "Error eliminando fotografía:",
        error
      );

      return respuesta(
        {
          success: false,
          error:
            "No fue posible eliminar la fotografía.",
          detalle: error.message,
        },
        500
      );
    }

    return respuesta({
      success: true,
      message:
        "Fotografía eliminada correctamente.",
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/usuarios/perfil:",
      error
    );

    return respuesta(
      {
        success: false,
        error:
          error?.message ||
          "Error interno del servidor.",
      },
      500
    );
  }
}
