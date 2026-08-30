import { createClient } from "@supabase/supabase-js";
import {
  obtenerGoogleDriveDocumentosFolderId,
  obtenerGoogleDriveRepositorioFolderId,
  obtenerGoogleDriveDestinoFolderId,
  subirArchivo,
  eliminarArchivo,
} from "@/lib/google-drive";

/* ============================================================
   SUPABASE ADMIN
============================================================ */

export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

/* ============================================================
   HELPERS GENERALES
============================================================ */

export function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

export function jsonError(error: string, status = 400) {
  return Response.json(
    {
      success: false,
      error,
    },
    {
      status,
    }
  );
}

export function jsonOk(data: Record<string, unknown> = {}) {
  return Response.json({
    success: true,
    ...data,
  });
}

/* ============================================================
   AUTENTICACIÓN
============================================================ */

/* ============================================================
   AUTENTICACIÓN POR BEARER
============================================================ */

export async function getProfileFromBearer(
  request: Request
) {
  const auth =
    request.headers.get("authorization") || "";

  const token =
    auth.startsWith("Bearer ")
      ? auth.slice(7).trim()
      : "";

  // ----------------------------------------------------------
  // TOKEN
  // ----------------------------------------------------------

  if (!token) {
    console.error(
      "[AUTH] No se recibió Authorization Bearer."
    );

    return null;
  }

  const supabase =
    supabaseAdmin();

  // ----------------------------------------------------------
  // VALIDAR TOKEN CONTRA SUPABASE AUTH
  // ----------------------------------------------------------

  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser(token);

  if (authError) {
    console.error(
      "[AUTH] Error validando access_token:",
      authError.message
    );

    return null;
  }

  if (!authData?.user) {
    console.error(
      "[AUTH] Supabase no devolvió usuario para el token."
    );

    return null;
  }

  const authUser =
    authData.user;

  console.info(
    "[AUTH] Usuario Auth validado:",
    authUser.id
  );

  // ----------------------------------------------------------
  // BUSCAR PERFIL EN usuarios
  // ----------------------------------------------------------

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("usuarios")
      .select(
        `
        id,
        auth_user_id,
        nombres,
        apellidos,
        razon_social,
        cargo_id
        `
      )
      .eq(
        "auth_user_id",
        authUser.id
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "[AUTH] Error buscando perfil en usuarios:",
      profileError.message
    );

    return null;
  }

  if (!profile) {
    console.error(
      "[AUTH] El usuario Auth existe pero no tiene perfil asociado en usuarios.",
      {
        auth_user_id: authUser.id,
      }
    );

    return null;
  }

  // ----------------------------------------------------------
  // PERFIL CORRECTO
  // ----------------------------------------------------------

  console.info(
    "[AUTH] Perfil encontrado:",
    profile.id
  );

  return {
    authUser,
    profile,
  };
}

/**
 * Obtiene el perfil directamente por ID.
 *
 * Se utiliza únicamente como compatibilidad con los endpoints
 * antiguos que reciben usuario_id desde el frontend.
 */
export async function getProfileById(profileId: string) {
  if (!profileId) {
    return null;
  }

  const supabase = supabaseAdmin();

  const {
    data: profile,
    error,
  } = await supabase
    .from("usuarios")
    .select(
      "id,auth_user_id,nombres,apellidos,razon_social,cargo_id"
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return {
    profile,
  };
}

/* ============================================================
   ROLES
============================================================ */

export async function getUserRoleIds(
  supabase: ReturnType<typeof supabaseAdmin>,
  profileId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("usuarios_asignaciones")
    .select("rol_id")
    .eq("usuario_id", profileId)
    .eq("activo", true);

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(
    new Set(
      (data || [])
        .map((item: any) => item.rol_id)
        .filter(Boolean)
    )
  );
}

/**
 * Convierte UUID o nombres de roles en UUID reales de la tabla roles.
 */
export async function resolveRoleIds(
  supabase: ReturnType<typeof supabaseAdmin>,
  values: unknown[]
) {
  const clean = values
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (!clean.length) {
    return [] as string[];
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;

  const ids = clean.filter((value) =>
    uuidRegex.test(value)
  );

  const names = clean.filter(
    (value) => !ids.includes(value)
  );

  const resolved = new Set<string>();

  ids.forEach((id) => resolved.add(id));

  if (names.length) {
    const {
      data,
      error,
    } = await supabase
      .from("roles")
      .select("id,nombre")
      .eq("activo", true);

    if (error) {
      throw new Error(error.message);
    }

    const wanted = new Set(
      names.map((name) =>
        name.toLowerCase()
      )
    );

    for (const role of data || []) {
      const nombre =
        String(role.nombre || "")
          .trim()
          .toLowerCase();

      if (wanted.has(nombre)) {
        resolved.add(role.id);
      }
    }
  }

  return Array.from(resolved);
}

/* ============================================================
   CÓDIGO DE PUBLICACIÓN
============================================================ */

export async function generarCodigoPublicacion(
  supabase: ReturnType<typeof supabaseAdmin>,
  tipoDocumentoId: string,
  prefijo = "PB"
) {
  const {
    data: tipo,
  } = await supabase
    .from("tipos_documento")
    .select("codigo")
    .eq("id", tipoDocumentoId)
    .maybeSingle();

  const tipoCodigo =
    String(tipo?.codigo || "DOC")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 12) || "DOC";

  const ahora = new Date();

  const anio = ahora.getFullYear();

  const timestamp =
    Date.now().toString(36).toUpperCase();

  const random =
    Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase();

  return `${prefijo}-${tipoCodigo}-${anio}-${timestamp}${random}`.slice(
    0,
    30
  );
}


/* ============================================================
   CÓDIGO DE PUBLICACIÓN MANUAL SECUENCIAL
============================================================ */

/**
 * Genera códigos de publicación manuales con la forma:
 * PB-{TIPO}-{AÑO}-{CONSECUTIVO}
 * Ej.: PB-RES-2026-001
 *
 * Se consulta documentos.codigo_publicacion, no codigo_flujo,
 * porque un documento publicado desde un flujo conserva su FLJ-...
 * en codigo_flujo y utiliza codigo_publicacion para la publicación.
 */
export async function generarCodigoPublicacionManual(
  supabase: ReturnType<typeof supabaseAdmin>,
  tipoDocumentoId: string,
  anio = new Date().getFullYear()
) {
  const { data: tipo, error: tipoError } = await supabase
    .from("tipos_documento")
    .select("id,codigo")
    .eq("id", tipoDocumentoId)
    .maybeSingle();

  if (tipoError) throw new Error(tipoError.message);
  if (!tipo) throw new Error("No se encontró el tipo de documento seleccionado.");

  const tipoCodigo =
    String(tipo.codigo || "DOC")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 12) || "DOC";

  const prefijo = `PB-${tipoCodigo}-${anio}-`;
  const { data, error } = await supabase
    .from("documentos")
    .select("codigo_publicacion")
    .like("codigo_publicacion", `${prefijo}%`)
    .order("codigo_publicacion", { ascending: false });

  if (error) throw new Error(error.message);

  let maximo = 0;
  for (const fila of data || []) {
    const codigo = String(fila.codigo_publicacion || "");
    const match = codigo.match(new RegExp(`^PB-${tipoCodigo}-${anio}-(\\d+)$`, "i"));
    if (match) maximo = Math.max(maximo, Number(match[1]));
  }

  return `${prefijo}${String(maximo + 1).padStart(3, "0")}`;
}

/* ============================================================
   CONSECUTIVO REPOSITORIO
============================================================ */

export async function generarConsecutivoRepositorio(
  supabase: ReturnType<typeof supabaseAdmin>
) {
  const anio = new Date().getFullYear();

  const {
    data,
    error,
  } = await supabase
    .from("documentos_flujos")
    .select(
      "consecutivo_repositorio_privado"
    )
    .not(
      "consecutivo_repositorio_privado",
      "is",
      null
    );

  if (error) {
    throw new Error(error.message);
  }

  let maximo = 0;

  for (const fila of data || []) {
    const valor =
      String(
        fila.consecutivo_repositorio_privado || ""
      );

    const match =
      valor.match(
        /(\d+)$/
      );

    if (match) {
      const numero =
        Number(match[1]);

      if (numero > maximo) {
        maximo = numero;
      }
    }
  }

  return `RP-${anio}-${String(
    maximo + 1
  ).padStart(5, "0")}`;
}

/* ============================================================
   BÓVEDA PRIVADA
============================================================ */

/**
 * La aplicación utiliza el Repositorio como una Bóveda privada.
 *
 * No existe subtipo de repositorio.
 *
 * Si no existe ninguno activo, se crea automáticamente uno llamado
 * "Bóveda Privada".
 *
 * Si existen varios activos, se utiliza el primero por nombre.
 */
export async function obtenerRepositorioPrivado(
  supabase: ReturnType<typeof supabaseAdmin>
) {
  const {
    data,
    error,
  } = await supabase
    .from("repositorios")
    .select(
      "id,nombre,descripcion,activo"
    )
    .eq("activo", true)
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `No fue posible consultar el Repositorio privado: ${error.message}`
    );
  }

  if (data && data.length > 0) {
    return data[0];
  }

  const {
    data: creado,
    error: crearError,
  } = await supabase
    .from("repositorios")
    .insert({
      nombre: "Bóveda Privada",
      descripcion:
        "Repositorio privado de información confidencial.",
      activo: true,
    })
    .select(
      "id,nombre,descripcion,activo"
    )
    .single();

  if (crearError || !creado) {
    throw new Error(
      crearError?.message ||
        "No fue posible crear la Bóveda Privada."
    );
  }

  return creado;
}

/* ============================================================
   GOOGLE DRIVE
============================================================ */

export async function guardarBufferDrive(
  buffer: Buffer,
  nombre: string,
  mimeType: string,
  tipoDocumentoId: string,
  destino: "documentos" | "repositorio" = "documentos"
) {
  const folderId = obtenerGoogleDriveDestinoFolderId(destino);

  return subirArchivo(
    buffer,
    nombre,
    mimeType || "application/octet-stream",
    folderId
  );
}

/**
 * Sube un archivo publicado a la carpeta física del módulo Documentos.
 * Esta función debe utilizarse únicamente cuando el documento ya está
 * siendo publicado, no durante la creación/finalización del flujo.
 */
export async function guardarBufferDriveDocumentos(
  buffer: Buffer,
  nombre: string,
  mimeType: string
) {
  return subirArchivo(
    buffer,
    nombre,
    mimeType || "application/octet-stream",
    obtenerGoogleDriveDocumentosFolderId()
  );
}

/**
 * Sube un archivo publicado a la carpeta física de la Bóveda Privada.
 * Repositorio no tiene subtipos: utiliza una única carpeta raíz.
 */
export async function guardarBufferDriveRepositorio(
  buffer: Buffer,
  nombre: string,
  mimeType: string
) {
  return subirArchivo(
    buffer,
    nombre,
    mimeType || "application/octet-stream",
    obtenerGoogleDriveRepositorioFolderId()
  );
}

/* ============================================================
   ALMACENAMIENTO DOCUMENTAL PRE-PUBLICACIÓN
============================================================ */

/**
 * Guarda la versión definitiva del flujo antes de que el creador
 * seleccione el destino de publicación.
 *
 * IMPORTANTE:
 *
 * Aquí NO se utiliza Google Drive. El archivo todavía pertenece al
 * proceso de aprobación y no debe aparecer físicamente en Documentos
 * ni en la Bóveda Privada antes de que el creador publique.
 *
 * Una vez publicado, /api/flujos/publicar copia el archivo a la carpeta
 * de Drive correspondiente y reemplaza documentos_versiones.drive_url
 * con la URL definitiva de Google Drive.
 */
export async function guardarBufferDocumento(
  buffer: Buffer,
  nombre: string,
  mimeType: string,
  _tipoDocumentoId: string,
  documentoId: string
) {
  const supabase = supabaseAdmin();

  const safeName =
    nombre
      .replace(/[^\w.\-]+/g, "_")
      .replace(/^_+|_+$/g, "") ||
    "documento";

  const storagePath =
    `documentos/${documentoId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(storagePath, buffer, {
      contentType: mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `No fue posible guardar el documento en Storage: ${uploadError.message}`
    );
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("documentos")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signedError || !signed?.signedUrl) {
    throw new Error(
      signedError?.message ||
        "No fue posible generar la URL temporal del documento."
    );
  }

  return {
    provider: "supabase_storage" as const,
    id: storagePath,
    url: signed.signedUrl,
    webViewLink: null,
    webContentLink: null,
    storagePath,
  };
}

/* ============================================================
   DRIVE FILE ID
============================================================ */

export function extraerDriveFileId(
  value: string
) {
  const text =
    String(value || "").trim();

  const match =
    text.match(
      /[-\w]{20,}/
    );

  return match?.[0] || text;
}

/* ============================================================
   AUDITORÍA
============================================================ */

export async function registrarDocumentoAuditoria(
  args: {
    documentoId: string;
    flujoId?: string | null;
    versionId?: string | null;
    usuarioId: string;
    accion: string;
    descripcion?: string | null;
    request?: Request;
  }
) {
  const supabase =
    supabaseAdmin();

  const ip =
    args.request
      ?.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    null;

  const userAgent =
    args.request
      ?.headers
      .get("user-agent") ||
    null;

  const {
    error,
  } = await supabase
    .from("documentos_auditoria")
    .insert({
      documento_id:
        args.documentoId,
      flujo_id:
        args.flujoId ||
        null,
      version_id:
        args.versionId ||
        null,
      usuario_id:
        args.usuarioId,
      accion:
        args.accion,
      descripcion:
        args.descripcion ||
        null,
      ip_address:
        ip,
      user_agent:
        userAgent,
    });

  if (error) {
    console.error(
      "Error registrando auditoría:",
      error
    );
  }
}

/* ============================================================
   ELIMINAR DRIVE SEGURO
============================================================ */

export async function eliminarDriveSeguro(
  fileId?: string | null
) {
  if (!fileId) {
    return;
  }

  try {
    await eliminarArchivo(
      fileId
    );
  } catch (error) {
    console.error(
      "No se pudo eliminar el archivo huérfano de Drive:",
      error
    );
  }
}

/* ============================================================
   DOCUMENTO COMPLETO
============================================================ */

export async function obtenerDocumentoCompleto(
  id: string
) {
  const supabase =
    supabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("documentos")
    .select(`
      id,
      codigo_flujo,
      codigo_publicacion,
      titulo,
      descripcion,
      fecha_documento,
      observaciones,
      palabras_clave,
      tipo_documento_id,
      estado_documento_id,
      requiere_flujo,
      requiere_publicacion,
      creador_id,
      created_by,
      updated_by,
      created_at,
      updated_at,
      estado,
      visibilidad,
      publicado_en,
      publicado_por,

      tipos_documento(
        id,
        nombre,
        codigo
      ),

      documentos_versiones(
        id,
        documento_id,
        numero_version,
        es_version_actual,
        nombre_archivo,
        mime_type,
        tamano_bytes,
        drive_url,
        usuario_carga_id,
        created_at
      ),

      documentos_destinatarios(
        id,
        area_id,
        departamento_id,
        cargo_id,
        rol_id,
        acceso_toda_entidad
      ),

      documentos_publicaciones(
        id,
        codigo_publicacion,
        fecha_inicio,
        fecha_fin,
        publicada,
        publicada_por,
        fecha_publicacion,
        retirada_por,
        fecha_retiro,
        motivo_retiro,
        observaciones
      ),

      repositorios_documentos(
        id,
        repositorio_id,
        repositorios(
          id,
          nombre,
          descripcion,
          activo
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(
      "Documento no encontrado."
    );
  }

  return data;
}