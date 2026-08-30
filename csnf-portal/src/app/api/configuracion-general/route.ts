import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

/* =========================================================
   TIPOS
========================================================= */

interface ConfiguracionGeneralPayload {
  nombre_entidad?: unknown;
  sigla?: unknown;
  nit?: unknown;
  direccion?: unknown;
  ciudad?: unknown;
  departamento?: unknown;
  pais?: unknown;
  telefono?: unknown;
  correo_institucional?: unknown;
  sitio_web?: unknown;

  nombre_portal?: unknown;
  version_portal?: unknown;

  idioma?: unknown;
  zona_horaria?: unknown;
  formato_fecha?: unknown;

  logo_principal?: unknown;
  logo_blanco?: unknown;
  favicon?: unknown;

  color_primario?: unknown;
  color_secundario?: unknown;
  color_acento?: unknown;
  color_exito?: unknown;
  color_advertencia?: unknown;
  color_error?: unknown;
  color_info?: unknown;

  tema?: unknown;

  subtitulo_portal?: unknown;
  encabezado_fuente?: unknown;
  encabezado_tamano?: unknown;
  encabezado_estilo?: unknown;
  encabezado_color?: unknown;

  carpeta_raiz_drive?: unknown;
  carpeta_temporal_drive?: unknown;

  permitir_registro?: unknown;
  portal_en_mantenimiento?: unknown;
  activo?: unknown;
}

/* =========================================================
   CAMPOS
========================================================= */

const CAMPOS_CONFIGURACION = [
  "id",

  "nombre_entidad",
  "sigla",
  "nit",
  "direccion",
  "ciudad",
  "departamento",
  "pais",
  "telefono",
  "correo_institucional",
  "sitio_web",

  "nombre_portal",
  "version_portal",

  "idioma",
  "zona_horaria",
  "formato_fecha",

  "logo_principal",
  "logo_blanco",
  "favicon",

  "color_primario",
  "color_secundario",
  "color_acento",
  "color_exito",
  "color_advertencia",
  "color_error",
  "color_info",

  "tema",

  "subtitulo_portal",
  "encabezado_fuente",
  "encabezado_tamano",
  "encabezado_estilo",
  "encabezado_color",

  "carpeta_raiz_drive",
  "carpeta_temporal_drive",

  "permitir_registro",
  "portal_en_mantenimiento",
  "activo",

  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

/* =========================================================
   HELPERS
========================================================= */

function respuesta(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    { status }
  );
}

function normalizarTexto(
  valor: unknown
): string | null {
  if (
    valor === undefined ||
    valor === null
  ) {
    return null;
  }

  const texto =
    String(valor).trim();

  return texto === ""
    ? null
    : texto;
}

function normalizarBooleano(
  valor: unknown,
  valorPorDefecto: boolean
): boolean {
  if (
    valor === undefined ||
    valor === null
  ) {
    return valorPorDefecto;
  }

  if (
    typeof valor === "boolean"
  ) {
    return valor;
  }

  if (
    typeof valor === "string"
  ) {
    const texto =
      valor
        .trim()
        .toLowerCase();

    if (
      [
        "true",
        "1",
        "si",
        "sí",
      ].includes(texto)
    ) {
      return true;
    }

    if (
      [
        "false",
        "0",
        "no",
      ].includes(texto)
    ) {
      return false;
    }
  }

  return Boolean(valor);
}

function esColorHexValido(
  valor: string | null
): boolean {
  if (valor === null) {
    return true;
  }

  return /^#[0-9A-Fa-f]{6}$/.test(
    valor
  );
}

/* =========================================================
   SUPABASE ADMIN
========================================================= */

async function crearClienteAdmin() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* =========================================================
   AUTENTICACIÓN
========================================================= */

async function obtenerUsuarioAutenticado(
  request: NextRequest
) {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    return {
      usuario: null,
      error:
        "La configuración del servidor de Supabase está incompleta.",
    };
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (!authorization) {
    return {
      usuario: null,
      error:
        "No se recibió el encabezado Authorization.",
    };
  }

  const token =
    authorization
      .replace(
        /^Bearer\s+/i,
        ""
      )
      .trim();

  if (!token) {
    return {
      usuario: null,
      error:
        "Token de autenticación vacío.",
    };
  }

  const supabaseAdmin =
    createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (
    error ||
    !data.user
  ) {
    return {
      usuario: null,
      error:
        "Sesión de usuario no válida.",
    };
  }

  return {
    usuario: data.user,
    error: null,
  };
}

/* =========================================================
   CONSTRUCCIÓN DEL PAYLOAD
========================================================= */

function construirPayload(
  body: ConfiguracionGeneralPayload,
  modo:
    | "crear"
    | "actualizar",
  usuarioId: string
) {
  return {
    nombre_entidad:
      normalizarTexto(
        body.nombre_entidad
      ),

    sigla:
      normalizarTexto(
        body.sigla
      ),

    nit:
      normalizarTexto(
        body.nit
      ),

    direccion:
      normalizarTexto(
        body.direccion
      ),

    ciudad:
      normalizarTexto(
        body.ciudad
      ),

    departamento:
      normalizarTexto(
        body.departamento
      ),

    pais:
      normalizarTexto(
        body.pais
      ) ?? "Colombia",

    telefono:
      normalizarTexto(
        body.telefono
      ),

    correo_institucional:
      normalizarTexto(
        body.correo_institucional
      ),

    sitio_web:
      normalizarTexto(
        body.sitio_web
      ),

    nombre_portal:
      normalizarTexto(
        body.nombre_portal
      ),

    version_portal:
      normalizarTexto(
        body.version_portal
      ) ?? "1.0.0",

    idioma:
      normalizarTexto(
        body.idioma
      ) ?? "es-CO",

    zona_horaria:
      normalizarTexto(
        body.zona_horaria
      ) ??
      "America/Bogota",

    formato_fecha:
      normalizarTexto(
        body.formato_fecha
      ) ??
      "DD/MM/YYYY",

    logo_principal:
      normalizarTexto(
        body.logo_principal
      ),

    logo_blanco:
      normalizarTexto(
        body.logo_blanco
      ),

    favicon:
      normalizarTexto(
        body.favicon
      ),

    color_primario:
      normalizarTexto(
        body.color_primario
      ),

    color_secundario:
      normalizarTexto(
        body.color_secundario
      ),

    color_acento:
      normalizarTexto(
        body.color_acento
      ),

    color_exito:
      normalizarTexto(
        body.color_exito
      ),

    color_advertencia:
      normalizarTexto(
        body.color_advertencia
      ),

    color_error:
      normalizarTexto(
        body.color_error
      ),

    color_info:
      normalizarTexto(
        body.color_info
      ),

    tema:
      normalizarTexto(
        body.tema
      ) ?? "sistema",

    subtitulo_portal:
      normalizarTexto(
        body.subtitulo_portal
      ),

    encabezado_fuente:
      normalizarTexto(
        body.encabezado_fuente
      ),

    encabezado_tamano:
      normalizarTexto(
        body.encabezado_tamano
      ),

    encabezado_estilo:
      normalizarTexto(
        body.encabezado_estilo
      ),

    encabezado_color:
      normalizarTexto(
        body.encabezado_color
      ),

    carpeta_raiz_drive:
      normalizarTexto(
        body.carpeta_raiz_drive
      ),

    carpeta_temporal_drive:
      normalizarTexto(
        body.carpeta_temporal_drive
      ),

    permitir_registro:
      normalizarBooleano(
        body.permitir_registro,
        false
      ),

    portal_en_mantenimiento:
      normalizarBooleano(
        body.portal_en_mantenimiento,
        false
      ),

    activo:
      normalizarBooleano(
        body.activo,
        true
      ),

    ...(modo === "crear"
      ? {
          created_by:
            usuarioId,
        }
      : {}),

    updated_by:
      usuarioId,

    updated_at:
      new Date().toISOString(),
  };
}

/* =========================================================
   VALIDACIÓN
========================================================= */

function validarConfiguracion(
  payload: Record<
    string,
    unknown
  >
): string | null {
  if (
    !payload.nombre_entidad ||
    String(
      payload.nombre_entidad
    ).trim() === ""
  ) {
    return (
      "El nombre de la entidad es obligatorio."
    );
  }

  if (
    !payload.nombre_portal ||
    String(
      payload.nombre_portal
    ).trim() === ""
  ) {
    return (
      "El nombre del portal es obligatorio."
    );
  }

  const colores = [
    "color_primario",
    "color_secundario",
    "color_acento",
    "color_exito",
    "color_advertencia",
    "color_error",
    "color_info",
    "encabezado_color",
  ];

  for (
    const campo of colores
  ) {
    const valor =
      payload[campo];

    if (
      valor !== null &&
      valor !== undefined &&
      !esColorHexValido(
        String(valor)
      )
    ) {
      return (
        `El campo ${campo} debe contener un color HEX válido con formato #RRGGBB.`
      );
    }
  }

  const tema =
    payload.tema;

  if (
    tema !== null &&
    tema !== undefined &&
    ![
      "claro",
      "oscuro",
      "sistema",
    ].includes(
      String(tema)
    )
  ) {
    return (
      "El tema debe ser 'claro', 'oscuro' o 'sistema'."
    );
  }

  return null;
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const {
      usuario,
      error: errorAuth,
    } =
      await obtenerUsuarioAutenticado(
        request
      );

    if (!usuario) {
      return respuesta(
        {
          ok: false,
          error:
            errorAuth ??
            "No autenticado.",
        },
        401
      );
    }

    const supabaseAdmin =
      await crearClienteAdmin();

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "configuracion_general"
        )
        .select(
          CAMPOS_CONFIGURACION
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "Error GET /api/configuracion-general:",
        error
      );

      return respuesta(
        {
          ok: false,
          error:
            "No fue posible obtener la configuración general.",
          detalle:
            error.message,
        },
        500
      );
    }

    return respuesta({
      ok: true,
      existe: Boolean(data),
      configuracion:
        data ?? null,
    });
  } catch (error) {
    console.error(
      "Error inesperado GET configuracion-general:",
      error
    );

    return respuesta(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno al obtener la configuración general.",
      },
      500
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const {
      usuario,
      error: errorAuth,
    } =
      await obtenerUsuarioAutenticado(
        request
      );

    if (!usuario) {
      return respuesta(
        {
          ok: false,
          error:
            errorAuth ??
            "No autenticado.",
        },
        401
      );
    }

    let body:
      ConfiguracionGeneralPayload;

    try {
      body =
        (await request.json()) as ConfiguracionGeneralPayload;
    } catch {
      return respuesta(
        {
          ok: false,
          error:
            "El cuerpo de la solicitud no es JSON válido.",
        },
        400
      );
    }

    const supabaseAdmin =
      await crearClienteAdmin();

    const {
      data: existente,
      error: errorBusqueda,
    } =
      await supabaseAdmin
        .from(
          "configuracion_general"
        )
        .select("id")
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(1)
        .maybeSingle();

    if (errorBusqueda) {
      console.error(
        "Error verificando configuración existente:",
        errorBusqueda
      );

      return respuesta(
        {
          ok: false,
          error:
            "No fue posible verificar la configuración existente.",
          detalle:
            errorBusqueda.message,
        },
        500
      );
    }

    if (existente) {
      return respuesta(
        {
          ok: false,
          error:
            "La configuración general ya existe. Utilice PUT para actualizarla.",
          id:
            existente.id,
        },
        409
      );
    }

    const payload =
      construirPayload(
        body,
        "crear",
        usuario.id
      );

    const errorValidacion =
      validarConfiguracion(
        payload
      );

    if (errorValidacion) {
      return respuesta(
        {
          ok: false,
          error:
            errorValidacion,
        },
        400
      );
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "configuracion_general"
        )
        .insert(payload)
        .select(
          CAMPOS_CONFIGURACION
        )
        .single();

    if (error) {
      console.error(
        "Error POST /api/configuracion-general:",
        error
      );

      return respuesta(
        {
          ok: false,
          error:
            "No fue posible crear la configuración general.",
          detalle:
            error.message,
        },
        500
      );
    }

    return respuesta(
      {
        ok: true,
        mensaje:
          "Configuración general creada correctamente.",
        configuracion:
          data,
      },
      201
    );
  } catch (error) {
    console.error(
      "Error inesperado POST configuracion-general:",
      error
    );

    return respuesta(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno al crear la configuración general.",
      },
      500
    );
  }
}

/* =========================================================
   PUT
========================================================= */

export async function PUT(
  request: NextRequest
) {
  try {
    const {
      usuario,
      error: errorAuth,
    } =
      await obtenerUsuarioAutenticado(
        request
      );

    if (!usuario) {
      return respuesta(
        {
          ok: false,
          error:
            errorAuth ??
            "No autenticado.",
        },
        401
      );
    }

    let body:
      ConfiguracionGeneralPayload;

    try {
      body =
        (await request.json()) as ConfiguracionGeneralPayload;
    } catch {
      return respuesta(
        {
          ok: false,
          error:
            "El cuerpo de la solicitud no es JSON válido.",
        },
        400
      );
    }

    const supabaseAdmin =
      await crearClienteAdmin();

    const {
      data: existente,
      error: errorBusqueda,
    } =
      await supabaseAdmin
        .from(
          "configuracion_general"
        )
        .select("id")
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(1)
        .maybeSingle();

    if (errorBusqueda) {
      console.error(
        "Error buscando configuración:",
        errorBusqueda
      );

      return respuesta(
        {
          ok: false,
          error:
            "No fue posible localizar la configuración general.",
          detalle:
            errorBusqueda.message,
        },
        500
      );
    }

    if (!existente) {
      return respuesta(
        {
          ok: false,
          error:
            "No existe una configuración general. Utilice POST para crearla.",
        },
        404
      );
    }

    const payload =
      construirPayload(
        body,
        "actualizar",
        usuario.id
      );

    const errorValidacion =
      validarConfiguracion(
        payload
      );

    if (errorValidacion) {
      return respuesta(
        {
          ok: false,
          error:
            errorValidacion,
        },
        400
      );
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "configuracion_general"
        )
        .update(payload)
        .eq(
          "id",
          existente.id
        )
        .select(
          CAMPOS_CONFIGURACION
        )
        .single();

    if (error) {
      console.error(
        "Error PUT /api/configuracion-general:",
        error
      );

      return respuesta(
        {
          ok: false,
          error:
            "No fue posible actualizar la configuración general.",
          detalle:
            error.message,
        },
        500
      );
    }

    return respuesta({
      ok: true,
      mensaje:
        "Configuración general actualizada correctamente.",
      configuracion:
        data,
    });
  } catch (error) {
    console.error(
      "Error inesperado PUT configuracion-general:",
      error
    );

    return respuesta(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno al actualizar la configuración general.",
      },
      500
    );
  }
}