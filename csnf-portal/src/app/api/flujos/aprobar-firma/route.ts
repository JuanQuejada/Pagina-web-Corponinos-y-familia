import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/*
 * ============================================================
 * POST /api/flujos/aprobar-firma
 *
 * Soporta:
 *
 *   - FormData
 *   - aprobar
 *   - rechazar
 *   - firmante actual
 *   - habilitación del siguiente firmante
 *   - último firmante
 *   - creación del documento definitivo
 *   - creación de documentos_versiones
 *   - asociación de versión a los firmantes
 *   - finalización del flujo
 *   - notificaciones
 *
 * IMPORTANTE:
 *
 * El esquema real de Supabase indica que:
 *
 * documentos_versiones:
 *   NO tiene created_by
 *   NO tiene updated_by
 *   NO tiene storage_path
 *
 * Sí tiene:
 *   drive_url NOT NULL
 *
 * Por tanto se utiliza el storage_path de flujos_versiones
 * como valor de drive_url para conservar la referencia
 * al archivo original.
 * ============================================================
 */

/*
 * ============================================================
 * TIPOS FLEXIBLES
 *
 * Se evita el problema de:
 *
 *   Property 'id' does not exist on type 'never'
 *
 * que estaba produciendo el cliente Supabase tipado.
 * ============================================================
 */

type AnyRecord = Record<string, any>;

const ESTADO_FIRMANTE_PENDIENTE = "PEN";
const ESTADO_FIRMANTE_HABILITADO = "HAB";
const ESTADO_FIRMANTE_APROBADO = "APR";
const ESTADO_FLUJO_FINALIZADO = "20f8a732-9779-465f-af15-b4f62cd3745f";

/*
 * Códigos posibles de rechazo.
 *
 * Se intentará localizar RECH.
 * Si no existe, se mantiene solamente el estado textual
 * del flujo y las fechas/motivos correspondientes.
 */
const ESTADO_FIRMANTE_RECHAZADO = "RECH";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function jsonError(
  error: string,
  status = 400,
  extra: AnyRecord = {}
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...extra,
    },
    { status }
  );
}

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function normalizarTexto(valor: unknown): string {
  return texto(valor).toLowerCase();
}

function normalizarAccion(valor: unknown): "aprobar" | "rechazar" {
  const accion = normalizarTexto(valor);

  if (
    accion === "rechazar" ||
    accion === "rechazo" ||
    accion === "rechazada" ||
    accion === "rechazado"
  ) {
    return "rechazar";
  }

  return "aprobar";
}

/*
 * Obtiene un campo de FormData sin depender de si llega como
 * string, File o null.
 */
function getFormDataString(
  formData: FormData,
  key: string
): string {
  const value = formData.get(key);

  if (value instanceof File) {
    return "";
  }

  return texto(value);
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(request: Request) {
  try {
    /*
     * ========================================================
     * 1. LEER FORMDATA
     * ========================================================
     *
     * El page.tsx actual hace:
     *
     * const formData = new FormData();
     *
     * Por tanto NO debemos ejecutar request.json().
     */

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch (error) {
      console.error(
        "Error leyendo FormData:",
        error
      );

      return jsonError(
        "El cuerpo de la solicitud no contiene un FormData válido.",
        400
      );
    }

    const flujoId =
      getFormDataString(formData, "flujo_id");

    const firmanteId =
      getFormDataString(formData, "firmante_id");

    const usuarioId =
      getFormDataString(formData, "usuario_id");

    const accion =
      normalizarAccion(
        getFormDataString(formData, "accion")
      );

    /*
     * El frontend actual utiliza "observacion".
     *
     * También aceptamos "observaciones" para compatibilidad
     * con versiones anteriores del endpoint.
     */

    const observacion =
      getFormDataString(
        formData,
        "observacion"
      ) ||
      getFormDataString(
        formData,
        "observaciones"
      );

    /*
     * Puede venir:
     *
     * archivo_firmado
     *
     * Actualmente el esquema proporcionado no tiene una columna
     * específica para guardar este archivo en documentos_firmantes.
     *
     * Lo detectamos para mantener compatibilidad con el frontend.
     */

    const archivoFirmado =
      formData.get("archivo_firmado");

    if (
      archivoFirmado &&
      archivoFirmado instanceof File &&
      archivoFirmado.size > 0
    ) {
      console.log(
        "Archivo firmado recibido:",
        {
          name: archivoFirmado.name,
          type: archivoFirmado.type,
          size: archivoFirmado.size,
        }
      );
    }

    /*
     * ========================================================
     * 2. VALIDACIONES BÁSICAS
     * ========================================================
     */

    if (!flujoId) {
      return jsonError(
        "Falta el parámetro flujo_id."
      );
    }

    if (!firmanteId) {
      return jsonError(
        "Falta el parámetro firmante_id."
      );
    }

    if (!usuarioId) {
      return jsonError(
        "Falta el parámetro usuario_id."
      );
    }

    if (
      accion === "rechazar" &&
      !observacion
    ) {
      return jsonError(
        "Debes indicar una observación para rechazar el flujo."
      );
    }

    /*
     * ========================================================
     * ARCHIVO DE APROBACIÓN / NUEVA VERSIÓN DEL FLUJO
     * ========================================================
     *
     * Si el firmante carga un archivo firmado/modificado, ese
     * archivo se convierte en la nueva versión actual del flujo.
     * Si no carga archivo, se conserva la versión actual existente.
     *
     * Esto permite exactamente estas reglas:
     *
     *   1. Nadie carga archivo -> se publica la versión original.
     *   2. Un firmante carga una versión -> pasa a ser la actual.
     *   3. Otro firmante carga otra -> esa última pasa a ser la actual.
     *   4. El último firmante puede cargar una versión -> esa es la que
     *      termina convertida en documentos_versiones.
     */

    /*
     * ========================================================
     * 3. SUPABASE
     * ========================================================
     */

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return jsonError(
        "No están configuradas las variables de entorno de Supabase.",
        500
      );
    }

    /*
     * Usamos any deliberadamente en este endpoint.
     *
     * El proyecto está produciendo errores de inferencia
     * como:
     *
     *   Property 'id' does not exist on type 'never'
     *
     * y:
     *
     *   SupabaseClient<unknown ...>
     *
     * No estamos cambiando el esquema de la base de datos.
     */

    const supabase: any =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const ahora =
      new Date().toISOString();

    /*
     * ========================================================
     * 4. VERIFICAR USUARIO
     * ========================================================
     */

    const {
      data: usuario,
      error: usuarioError,
    } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", usuarioId)
      .maybeSingle();

    if (usuarioError) {
      console.error(
        "Error verificando usuario:",
        usuarioError
      );

      return jsonError(
        "No fue posible verificar el usuario.",
        500
      );
    }

    if (!usuario) {
      return jsonError(
        "El usuario que intenta procesar la firma no existe.",
        400
      );
    }

    /*
     * ========================================================
     * 5. OBTENER FLUJO
     * ========================================================
     */

    const {
      data: flujo,
      error: flujoError,
    } = await supabase
      .from("documentos_flujos")
      .select(`
        id,
        documento_id,
        numero_flujo,
        estado_flujo_id,
        iniciado_por,
        fecha_inicio,
        fecha_fin,
        motivo_rechazo,
        observaciones,
        created_by,
        updated_by,
        created_at,
        updated_at,
        estado,
        destino_final,
        consecutivo_repositorio_privado,
        fecha_limite,
        proposito,
        titulo,
        descripcion,
        tipo_documento_id,
        repositorio_id
      `)
      .eq("id", flujoId)
      .maybeSingle();

    if (flujoError) {
      console.error(
        "Error consultando flujo:",
        flujoError
      );

      return jsonError(
        `No fue posible consultar el flujo: ${flujoError.message}`,
        500
      );
    }

    if (!flujo) {
      return jsonError(
        "El flujo especificado no existe.",
        404
      );
    }

    /*
     * ========================================================
     * 6. VERIFICAR ESTADO DEL FLUJO
     * ========================================================
     */

    const estadoFlujo =
      normalizarTexto(flujo.estado);

    /*
     * Si se está intentando procesar un flujo ya rechazado,
     * no se permite continuar.
     */

    if (
      estadoFlujo.includes("rechaz")
    ) {
      return jsonError(
        "El flujo fue rechazado y no puede continuar.",
        409,
        {
          flujo_id: flujo.id,
          estado: flujo.estado,
        }
      );
    }

    /*
     * Si ya está finalizado:
     *
     * no se debe intentar registrar nuevamente la firma.
     */

    if (
      estadoFlujo === "finalizado" ||
      estadoFlujo === "aprobado" ||
      estadoFlujo === "publicado"
    ) {
      return jsonError(
        "El flujo ya fue finalizado y no tiene firmas pendientes.",
        409,
        {
          flujo_id: flujo.id,
          estado: flujo.estado,
          documento_id: flujo.documento_id,
        }
      );
    }

    /*
     * ========================================================
     * 7. OBTENER FIRMANTE
     * ========================================================
     *
     * IMPORTANTE:
     *
     * El esquema real tiene:
     *
     * fecha_aprobacion
     *
     * y NO fecha_firma.
     */

    const {
      data: firmante,
      error: firmanteError,
    } = await supabase
      .from("documentos_firmantes")
      .select(`
        id,
        flujo_id,
        orden,
        usuario_id,
        estado_firmante_id,
        fecha_habilitacion,
        fecha_descarga,
        fecha_carga,
        fecha_aprobacion,
        fecha_rechazo,
        motivo_rechazo,
        version_documento_id,
        observaciones,
        created_by,
        updated_by,
        created_at,
        updated_at
      `)
      .eq("id", firmanteId)
      .eq("flujo_id", flujoId)
      .maybeSingle();

    if (firmanteError) {
      console.error(
        "ERROR CONSULTANDO FIRMANTE",
        {
          message: firmanteError.message,
          details: firmanteError.details,
          hint: firmanteError.hint,
          code: firmanteError.code,
          flujo_id: flujoId,
          firmante_id: firmanteId,
        }
      );

      return jsonError(
        `No fue posible consultar el firmante: ${firmanteError.message}`,
        500,
        {
          flujo_id: flujoId,
          firmante_id: firmanteId,
        }
      );
    }

    if (!firmante) {
      return jsonError(
        "El firmante no existe o no pertenece al flujo indicado.",
        404,
        {
          flujo_id: flujoId,
          firmante_id: firmanteId,
        }
      );
    }

    /*
     * ========================================================
     * 8. VERIFICAR USUARIO DEL FIRMANTE
     * ========================================================
     */

    if (
      String(firmante.usuario_id) !==
      String(usuarioId)
    ) {
      return jsonError(
        "El usuario actual no corresponde al firmante que intenta procesar.",
        403,
        {
          firmante_id: firmante.id,
          firmante_usuario_id:
            firmante.usuario_id,
          usuario_id: usuarioId,
        }
      );
    }

    /*
     * ========================================================
     * 9. OBTENER ESTADOS DE FIRMANTE
     * ========================================================
     */

    const {
      data: estadosFirmante,
      error: estadosFirmanteError,
    } = await supabase
      .from("estados_firmante_documento")
      .select(`
        id,
        codigo,
        nombre,
        descripcion,
        orden,
        activo,
        editable
      `)
      .eq("activo", true);

    if (estadosFirmanteError) {
      console.error(
        "Error obteniendo estados de firmante:",
        estadosFirmanteError
      );

      return jsonError(
        `No fue posible consultar los estados de firmante: ${estadosFirmanteError.message}`,
        500
      );
    }

    const estadoPendiente =
      estadosFirmante?.find(
        (estado: AnyRecord) =>
          estado.codigo ===
          ESTADO_FIRMANTE_PENDIENTE
      );

    const estadoHabilitado =
      estadosFirmante?.find(
        (estado: AnyRecord) =>
          estado.codigo ===
          ESTADO_FIRMANTE_HABILITADO
      );

    const estadoAprobado =
      estadosFirmante?.find(
        (estado: AnyRecord) =>
          estado.codigo ===
          ESTADO_FIRMANTE_APROBADO
      );

    // El estado RECH solo es necesario cuando la acción solicitada
    // es rechazar. Para aprobar no debe bloquearse el flujo por la
    // ausencia de ese estado en el catálogo.
    const estadoRechazado =
      accion === "rechazar"
        ? estadosFirmante?.find(
            (estado: AnyRecord) =>
              estado.codigo ===
              ESTADO_FIRMANTE_RECHAZADO
          )
        : null;

    if (!estadoPendiente) {
      return jsonError(
        `No se encontró el estado de firmante ${ESTADO_FIRMANTE_PENDIENTE}.`,
        500
      );
    }

    if (!estadoHabilitado) {
      return jsonError(
        `No se encontró el estado de firmante ${ESTADO_FIRMANTE_HABILITADO}.`,
        500
      );
    }

    if (!estadoAprobado) {
      return jsonError(
        `No se encontró el estado de firmante ${ESTADO_FIRMANTE_APROBADO}.`,
        500
      );
    }

    if (accion === "rechazar" && !estadoRechazado) {
      return jsonError(
        `No se encontró el estado de firmante ${ESTADO_FIRMANTE_RECHAZADO}.`,
        500
      );
    }

    /*
     * ========================================================
     * 10. RECHAZAR
     * ========================================================
     */

    if (accion === "rechazar") {
      /*
       * El firmante debe estar habilitado.
       */

      if (
        String(firmante.estado_firmante_id) !==
        String(estadoHabilitado.id)
      ) {
        /*
         * Si ya está aprobado, devolvemos 409.
         */

        if (
          String(firmante.estado_firmante_id) ===
          String(estadoAprobado.id)
        ) {
          return jsonError(
            "Este firmante ya aprobó el flujo anteriormente.",
            409,
            {
              firmante_id: firmante.id,
              flujo_id: flujo.id,
            }
          );
        }

        return jsonError(
          "El firmante todavía no está habilitado para rechazar este flujo.",
          409,
          {
            firmante_id: firmante.id,
            orden: firmante.orden,
            estado_firmante_id:
              firmante.estado_firmante_id,
          }
        );
      }

      /*
       * Actualizamos firmante.
       *
       * Esquema real:
       *   fecha_rechazo
       *   motivo_rechazo
       */

      const {
        data: firmanteRechazado,
        error: firmanteRechazadoError,
      } = await supabase
        .from("documentos_firmantes")
        .update({
          estado_firmante_id:
            estadoRechazado.id,

          fecha_rechazo:
            ahora,

          motivo_rechazo:
            observacion,

          observaciones:
            observacion,

          updated_at:
            ahora,

          updated_by:
            usuarioId,
        })
        .eq("id", firmante.id)
        .eq(
          "estado_firmante_id",
          estadoHabilitado.id
        )
        .select(`
          id,
          flujo_id,
          orden,
          usuario_id,
          estado_firmante_id,
          fecha_rechazo,
          motivo_rechazo,
          observaciones
        `)
        .maybeSingle();

      if (firmanteRechazadoError) {
        console.error(
          "Error rechazando firmante:",
          firmanteRechazadoError
        );

        return jsonError(
          `No fue posible registrar el rechazo: ${firmanteRechazadoError.message}`,
          500
        );
      }

      if (!firmanteRechazado) {
        return jsonError(
          "El firmante ya fue procesado o dejó de estar habilitado.",
          409
        );
      }

      /*
       * Actualizamos el flujo.
       */

      const {
        data: flujoRechazado,
        error: flujoRechazadoError,
      } = await supabase
        .from("documentos_flujos")
        .update({
          estado:
            "Rechazado",

          motivo_rechazo:
            observacion,

          observaciones:
            observacion,

          fecha_fin:
            ahora,

          updated_at:
            ahora,

          updated_by:
            usuarioId,
        })
        .eq("id", flujo.id)
        .select(`
          id,
          numero_flujo,
          documento_id,
          estado,
          fecha_inicio,
          fecha_fin,
          motivo_rechazo,
          observaciones
        `)
        .maybeSingle();

      if (flujoRechazadoError) {
        console.error(
          "Error actualizando flujo rechazado:",
          flujoRechazadoError
        );

        return jsonError(
          `El rechazo del firmante fue registrado, pero no fue posible actualizar el flujo: ${flujoRechazadoError.message}`,
          500,
          {
            firma_registrada: true,
            flujo_id: flujo.id,
          }
        );
      }

      /*
       * Notificar al creador.
       */

      const {
        error: notificacionCreadorError,
      } = await supabase
        .from("notificaciones")
        .insert({
          usuario_id:
            flujo.iniciado_por,

          tipo:
            "INFO",

          titulo:
            "Flujo rechazado",

          mensaje:
            `El flujo "${flujo.numero_flujo}" fue rechazado por el firmante ${firmante.orden}. Motivo: ${observacion}`,

          entidad_tipo:
            "documentos_flujos",

          entidad_id:
            flujo.id,

          url:
            "/principal/mis-documentos",

          leida:
            false,
        });

      if (notificacionCreadorError) {
        console.error(
          "Error notificando rechazo:",
          notificacionCreadorError
        );
      }

      /*
       * Respuesta.
       */

      return NextResponse.json(
        {
          success: true,

          accion:
            "rechazar",

          rechazado:
            true,

          ultimo_firmante:
            false,

          message:
            "El flujo fue rechazado correctamente.",

          flujo:
            flujoRechazado ?? {
              id: flujo.id,
              numero_flujo:
                flujo.numero_flujo,
              estado:
                "Rechazado",
              fecha_fin:
                ahora,
            },

          firma: {
            id:
              firmanteRechazado.id,

            orden:
              firmanteRechazado.orden,

            estado:
              estadoRechazado.nombre ||
              "Rechazado",

            fecha_rechazo:
              ahora,

            motivo_rechazo:
              observacion,
          },
        },
        { status: 200 }
      );
    }

    /*
     * ========================================================
     * 11. APROBAR
     * ========================================================
     */

    /*
     * Si ya está aprobado, no intentamos volver a aprobar.
     *
     * Esto explica el 409 que viste anteriormente.
     *
     * Ese 409 es correcto si realmente ya se procesó la firma.
     */

    if (
      String(firmante.estado_firmante_id) ===
      String(estadoAprobado.id)
    ) {
      return jsonError(
        "Este firmante ya aprobó el flujo anteriormente.",
        409,
        {
          firmante_id: firmante.id,
          flujo_id: flujo.id,
          fecha_aprobacion:
            firmante.fecha_aprobacion,
        }
      );
    }

    /*
     * El firmante debe estar habilitado.
     */

    if (
      String(firmante.estado_firmante_id) !==
      String(estadoHabilitado.id)
    ) {
      return jsonError(
        "El firmante todavía no está habilitado para aprobar este flujo.",
        409,
        {
          firmante_id:
            firmante.id,

          orden:
            firmante.orden,

          estado_firmante_id:
            firmante.estado_firmante_id,
        }
      );
    }

    /*
     * ========================================================
     * 12. OBTENER TODOS LOS FIRMANTES
     * ========================================================
     */

    const {
      data: todosFirmantes,
      error: todosFirmantesError,
    } = await supabase
      .from("documentos_firmantes")
      .select(`
        id,
        flujo_id,
        orden,
        usuario_id,
        estado_firmante_id,
        fecha_habilitacion,
        fecha_descarga,
        fecha_carga,
        fecha_aprobacion,
        fecha_rechazo,
        motivo_rechazo,
        version_documento_id,
        observaciones,
        created_by,
        updated_by,
        created_at,
        updated_at
      `)
      .eq("flujo_id", flujo.id)
      .order("orden", {
        ascending: true,
      });

    if (todosFirmantesError) {
      console.error(
        "Error obteniendo firmantes:",
        todosFirmantesError
      );

      return jsonError(
        `No fue posible obtener los firmantes del flujo: ${todosFirmantesError.message}`,
        500
      );
    }

    if (
      !todosFirmantes ||
      todosFirmantes.length === 0
    ) {
      return jsonError(
        "El flujo no tiene firmantes registrados.",
        409
      );
    }

    /*
     * ========================================================
     * 13. REGISTRAR NUEVA VERSIÓN SI EL FIRMANTE CARGÓ ARCHIVO
     * ========================================================
     */

    let versionSeleccionada: AnyRecord | null = null;

    if (
      accion === "aprobar" &&
      archivoFirmado instanceof File &&
      archivoFirmado.size > 0
    ) {
      const buffer = Buffer.from(
        await archivoFirmado.arrayBuffer()
      );

      const safeFileName = archivoFirmado.name
        .replace(/\s+/g, "_")
        .replace(/[^\w.\-]/g, "_");

      const fileName =
        `${Date.now()}_${crypto.randomUUID()}_${safeFileName}`;

      const storagePath =
        `flujos/firmados/${flujo.id}/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("documentos")
          .upload(storagePath, buffer, {
            contentType:
              archivoFirmado.type ||
              "application/octet-stream",
            upsert: false,
          });

      if (uploadError) {
        return jsonError(
          `No fue posible almacenar el archivo firmado: ${uploadError.message}`,
          500
        );
      }

      const {
        data: ultimaVersion,
        error: ultimaVersionError,
      } = await supabase
        .from("flujos_versiones")
        .select("numero_version")
        .eq("flujo_id", flujo.id)
        .order("numero_version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimaVersionError) {
        await supabase.storage
          .from("documentos")
          .remove([storagePath]);

        return jsonError(
          `No fue posible determinar la siguiente versión del flujo: ${ultimaVersionError.message}`,
          500
        );
      }

      const siguienteNumero =
        Number(ultimaVersion?.numero_version || 0) + 1;

      const { error: desactivarVersionError } =
        await supabase
          .from("flujos_versiones")
          .update({ es_version_actual: false })
          .eq("flujo_id", flujo.id)
          .eq("es_version_actual", true);

      if (desactivarVersionError) {
        await supabase.storage
          .from("documentos")
          .remove([storagePath]);

        return jsonError(
          `No fue posible actualizar la versión anterior del flujo: ${desactivarVersionError.message}`,
          500
        );
      }

      const {
        data: nuevaVersionFlujo,
        error: nuevaVersionError,
      } = await supabase
        .from("flujos_versiones")
        .insert({
          flujo_id: flujo.id,
          numero_version: siguienteNumero,
          es_version_actual: true,
          nombre_archivo: archivoFirmado.name,
          mime_type:
            archivoFirmado.type ||
            "application/octet-stream",
          tamano_bytes: archivoFirmado.size,
          storage_path: storagePath,
          usuario_carga_id: usuarioId,
        })
        .select(`
          id,
          flujo_id,
          numero_version,
          es_version_actual,
          nombre_archivo,
          mime_type,
          tamano_bytes,
          storage_path,
          usuario_carga_id,
          created_at
        `)
        .single();

      if (nuevaVersionError || !nuevaVersionFlujo) {
        await supabase.storage
          .from("documentos")
          .remove([storagePath]);

        return jsonError(
          `No fue posible registrar la nueva versión del archivo: ${nuevaVersionError?.message || "sin resultado"}`,
          500
        );
      }

      versionSeleccionada = nuevaVersionFlujo;
    }

    /*
     * ========================================================
     * 14. DETERMINAR ÚLTIMO FIRMANTE
     * ========================================================
     */

    const ultimoFirmante =
      todosFirmantes[
        todosFirmantes.length - 1
      ];

    const esUltimoFirmante =
      String(firmante.id) ===
      String(ultimoFirmante.id);

    /*
     * ========================================================
     * 14. REGISTRAR APROBACIÓN
     * ========================================================
     */

    const {
      data: firmaAprobada,
      error: aprobarFirmaError,
    } = await supabase
      .from("documentos_firmantes")
      .update({
        estado_firmante_id:
          estadoAprobado.id,

        fecha_aprobacion:
          ahora,

        observaciones:
          observacion || null,

        updated_at:
          ahora,

        updated_by:
          usuarioId,
      })
      .eq("id", firmante.id)
      .eq(
        "estado_firmante_id",
        estadoHabilitado.id
      )
      .select(`
        id,
        flujo_id,
        orden,
        usuario_id,
        estado_firmante_id,
        fecha_habilitacion,
        fecha_aprobacion,
        version_documento_id,
        observaciones
      `)
      .maybeSingle();

    if (aprobarFirmaError) {
      console.error(
        "Error aprobando firma:",
        aprobarFirmaError
      );

      return jsonError(
        `No fue posible registrar la aprobación: ${aprobarFirmaError.message}`,
        500
      );
    }

    if (!firmaAprobada) {
      return jsonError(
        "La firma ya fue procesada o dejó de estar habilitada.",
        409,
        {
          firmante_id:
            firmante.id,

          flujo_id:
            flujo.id,
        }
      );
    }

    /*
     * ========================================================
     * 15. NO ES ÚLTIMO FIRMANTE
     * ========================================================
     */

    if (!esUltimoFirmante) {
      const siguienteFirmante =
        todosFirmantes.find(
          (f: AnyRecord) =>
            Number(f.orden) ===
            Number(firmante.orden) + 1
        );

      if (!siguienteFirmante) {
        return jsonError(
          "La firma fue registrada, pero no fue posible localizar al siguiente firmante.",
          500,
          {
            firma_registrada:
              true,

            flujo_id:
              flujo.id,

            firmante_id:
              firmante.id,
          }
        );
      }

      /*
       * Habilitar siguiente firmante.
       */

      const {
        data: siguienteActualizado,
        error: siguienteUpdateError,
      } = await supabase
        .from("documentos_firmantes")
        .update({
          estado_firmante_id:
            estadoHabilitado.id,

          fecha_habilitacion:
            ahora,

          updated_at:
            ahora,

          updated_by:
            usuarioId,
        })
        .eq(
          "id",
          siguienteFirmante.id
        )
        .eq(
          "estado_firmante_id",
          estadoPendiente.id
        )
        .select(`
          id,
          flujo_id,
          orden,
          usuario_id,
          estado_firmante_id,
          fecha_habilitacion
        `)
        .maybeSingle();

      if (siguienteUpdateError) {
        console.error(
          "Error habilitando siguiente firmante:",
          siguienteUpdateError
        );

        return jsonError(
          `La firma fue registrada, pero no fue posible habilitar al siguiente firmante: ${siguienteUpdateError.message}`,
          500,
          {
            firma_registrada:
              true,

            flujo_id:
              flujo.id,

            firmante_id:
              firmante.id,
          }
        );
      }

      if (!siguienteActualizado) {
        return jsonError(
          "La firma fue registrada, pero el siguiente firmante ya no se encuentra pendiente.",
          409,
          {
            firma_registrada:
              true,

            flujo_id:
              flujo.id,

            firmante_id:
              firmante.id,
          }
        );
      }

      /*
       * Notificar siguiente firmante.
       */

      const {
        error: notificacionSiguienteError,
      } = await supabase
        .from("notificaciones")
        .insert({
          usuario_id:
            siguienteFirmante.usuario_id,

          tipo:
            "APROBACION_PENDIENTE",

          titulo:
            "Documento pendiente de firma",

          mensaje:
            `El firmante anterior aprobó el flujo "${flujo.titulo || flujo.numero_flujo}". Ahora te corresponde revisar y aprobar.`,

          entidad_tipo:
            "documentos_flujos",

          entidad_id:
            flujo.id,

          url:
            "/principal/flujo-aprobaciones",

          leida:
            false,
        });

      if (notificacionSiguienteError) {
        console.error(
          "Error notificando siguiente firmante:",
          notificacionSiguienteError
        );
      }

      /*
       * Notificar creador.
       */

      const {
        error: notificacionCreadorError,
      } = await supabase
        .from("notificaciones")
        .insert({
          usuario_id:
            flujo.iniciado_por,

          tipo:
            "INFO",

          titulo:
            "Firma aprobada",

          mensaje:
            `El firmante ${firmante.orden} de ${todosFirmantes.length} aprobó el flujo "${flujo.numero_flujo}".`,

          entidad_tipo:
            "documentos_flujos",

          entidad_id:
            flujo.id,

          url:
            "/principal/mis-documentos",

          leida:
            false,
        });

      if (notificacionCreadorError) {
        console.error(
          "Error notificando creador:",
          notificacionCreadorError
        );
      }

      /*
       * ======================================================
       * RESPUESTA NO ÚLTIMO
       * ======================================================
       */

      return NextResponse.json(
        {
          success:
            true,

          accion:
            "aprobar",

          ultimo_firmante:
            false,

          documento_creado:
            false,

          message:
            "Firma aprobada correctamente. El siguiente firmante ha sido habilitado.",

          flujo: {
            id:
              flujo.id,

            numero_flujo:
              flujo.numero_flujo,

            estado:
              flujo.estado,

            documento_id:
              flujo.documento_id ?? null,
          },

          firma: {
            id:
              firmaAprobada.id,

            orden:
              firmaAprobada.orden,

            estado:
              estadoAprobado.nombre,

            fecha_aprobacion:
              ahora,
          },

          siguiente_firmante: {
            id:
              siguienteActualizado.id,

            usuario_id:
              siguienteActualizado.usuario_id,

            orden:
              siguienteActualizado.orden,

            estado:
              estadoHabilitado.nombre,

            fecha_habilitacion:
              ahora,
          },

          progreso: {
            aprobados:
              Number(firmante.orden),

            total:
              todosFirmantes.length,

            pendientes:
              todosFirmantes.length -
              Number(firmante.orden),
          },
        },
        { status: 200 }
      );
    }

    /*
     * ========================================================
     * 16. ÚLTIMO FIRMANTE
     * ========================================================
     *
     * A partir de aquí debemos:
     *
     * 1. Obtener versión actual del flujo.
     * 2. Crear documentos.
     * 3. Crear documentos_versiones.
     * 4. Asociar versión a firmantes.
     * 5. Actualizar documentos_flujos.
     * 6. Dejar flujo FINALIZADO.
     */

    /*
     * Protección adicional:
     *
     * Si ya existe documento, el flujo ya fue finalizado.
     */

    if (flujo.documento_id) {
      return NextResponse.json(
        {
          success:
            true,

          accion:
            "aprobar",

          ultimo_firmante:
            true,

          documento_creado:
            true,

          alreadyCompleted:
            true,

          message:
            "El último firmante ya fue procesado y el documento definitivo ya existe.",

          flujo: {
            id:
              flujo.id,

            numero_flujo:
              flujo.numero_flujo,

            estado:
              flujo.estado,

            documento_id:
              flujo.documento_id,
          },
        },
        { status: 200 }
      );
    }

    /*
     * ========================================================
     * 17. OBTENER VERSIÓN ACTUAL DEL FLUJO
     * ========================================================
     */

    const {
      data: flujoVersionConsultada,
      error: flujoVersionError,
    } = await supabase
      .from("flujos_versiones")
      .select(`
        id,
        flujo_id,
        numero_version,
        es_version_actual,
        nombre_archivo,
        mime_type,
        tamano_bytes,
        storage_path,
        usuario_carga_id,
        created_at
      `)
      .eq(
        "flujo_id",
        flujo.id
      )
      .eq(
        "es_version_actual",
        true
      )
      .maybeSingle();

    const flujoVersion =
      versionSeleccionada ||
      flujoVersionConsultada;

    if (flujoVersionError) {
      console.error(
        "Error obteniendo versión del flujo:",
        flujoVersionError
      );

      return jsonError(
        `No fue posible obtener la versión actual del flujo: ${flujoVersionError.message}`,
        500
      );
    }

    if (!flujoVersion) {
      return jsonError(
        "El flujo no tiene una versión actual del archivo.",
        409
      );
    }

    /*
     * ========================================================
     * 18. CREAR DOCUMENTO DEFINITIVO
     * ========================================================
     */

    const {
      data: nuevoDocumento,
      error: documentoInsertError,
    } = await supabase
      .from("documentos")
      .insert({
        codigo_flujo:
          flujo.numero_flujo,

        codigo_publicacion:
          null,

        titulo:
          flujo.titulo,

        descripcion:
          flujo.descripcion,

        fecha_documento:
          ahora.substring(0, 10),

        observaciones:
          observacion ||
          flujo.observaciones ||
          null,

        palabras_clave:
          null,

        tipo_documento_id:
          flujo.tipo_documento_id,

        estado_documento_id:
          null,

        requiere_flujo:
          true,

        requiere_publicacion:
          true,

        creador_id:
          flujo.iniciado_por,

        created_by:
          flujo.iniciado_por,

        updated_by:
          usuarioId,

        created_at:
          ahora,

        updated_at:
          ahora,

        estado:
          "Aprobado",

        visibilidad:
          "privado",

        publicado_en:
          null,

        publicado_por:
          null,
      })
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
        publicado_por
      `)
      .single();

    if (
      documentoInsertError ||
      !nuevoDocumento
    ) {
      console.error(
        "Error creando documento definitivo:",
        documentoInsertError
      );

      /*
       * La firma ya quedó registrada.
       *
       * Informamos claramente que el problema ocurrió
       * al crear el documento.
       */

      return jsonError(
        `No fue posible crear el documento definitivo: ${
          documentoInsertError?.message ||
          "sin resultado"
        }`,
        500,
        {
          firma_registrada:
            true,

          ultimo_firmante:
            true,

          flujo_id:
            flujo.id,
        }
      );
    }

    /*
     * ========================================================
     * 19. CREAR DOCUMENTOS_VERSIONES
     * ========================================================
     *
     * ESQUEMA REAL:
     *
     * id
     * documento_id
     * numero_version
     * es_version_actual
     * nombre_archivo
     * mime_type
     * tamano_bytes
     * drive_url       <-- NOT NULL
     * usuario_carga_id
     * created_at
     *
     * NO:
     * created_by
     * updated_by
     * storage_path
     */

    /*
     * drive_url es NOT NULL.
     *
     * El único dato disponible en el esquema del flujo
     * para referenciar el archivo es:
     *
     * flujos_versiones.storage_path
     *
     * Por tanto lo usamos aquí.
     */

    const driveUrl =
      texto(flujoVersion.storage_path);

    if (!driveUrl) {
      /*
       * Si no tenemos referencia al archivo, eliminamos
       * el documento recién creado.
       */

      await supabase
        .from("documentos")
        .delete()
        .eq(
          "id",
          nuevoDocumento.id
        );

      return jsonError(
        "No fue posible crear la versión definitiva del documento porque la versión del flujo no tiene storage_path.",
        500,
        {
          firma_registrada:
            true,

          documento_creado:
            false,

          flujo_id:
            flujo.id,
        }
      );
    }

    const {
      data: nuevaVersionDocumento,
      error:
        nuevaVersionDocumentoError,
    } = await supabase
      .from("documentos_versiones")
      .insert({
        documento_id:
          nuevoDocumento.id,

        numero_version:
          flujoVersion.numero_version,

        es_version_actual:
          true,

        nombre_archivo:
          flujoVersion.nombre_archivo,

        mime_type:
          flujoVersion.mime_type,

        tamano_bytes:
          flujoVersion.tamano_bytes,

        drive_url:
          driveUrl,

        usuario_carga_id:
          flujoVersion.usuario_carga_id,

        created_at:
          ahora,
      })
      .select(`
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
      `)
      .single();

    if (
      nuevaVersionDocumentoError ||
      !nuevaVersionDocumento
    ) {
      console.error(
        "Error creando versión definitiva:",
        nuevaVersionDocumentoError
      );

      /*
       * Limpieza del documento creado.
       */

      await supabase
        .from("documentos")
        .delete()
        .eq(
          "id",
          nuevoDocumento.id
        );

      return jsonError(
        `No fue posible crear la versión definitiva del documento: ${
          nuevaVersionDocumentoError?.message ||
          "sin resultado"
        }`,
        500,
        {
          firma_registrada:
            true,

          ultimo_firmante:
            true,

          flujo_id:
            flujo.id,
        }
      );
    }

    /*
     * ========================================================
     * 20. ASOCIAR VERSIÓN A TODOS LOS FIRMANTES
     * ========================================================
     */

    const {
      error:
        firmantesVersionError,
    } = await supabase
      .from("documentos_firmantes")
      .update({
        version_documento_id:
          nuevaVersionDocumento.id,

        updated_at:
          ahora,

        updated_by:
          usuarioId,
      })
      .eq(
        "flujo_id",
        flujo.id
      );

    if (firmantesVersionError) {
      console.error(
        "Error asociando versión a firmantes:",
        firmantesVersionError
      );

      /*
       * Limpieza.
       */

      await supabase
        .from("documentos_versiones")
        .delete()
        .eq(
          "id",
          nuevaVersionDocumento.id
        );

      await supabase
        .from("documentos")
        .delete()
        .eq(
          "id",
          nuevoDocumento.id
        );

      return jsonError(
        `No fue posible asociar la versión definitiva a los firmantes: ${firmantesVersionError.message}`,
        500,
        {
          firma_registrada:
            true,

          flujo_id:
            flujo.id,
        }
      );
    }

    /*
     * ========================================================
     * 21. FINALIZAR FLUJO
     * ========================================================
     *
     * ESTA PARTE ES FUNDAMENTAL PARA EL PROBLEMA DE TU
     * CAPTURA.
     *
     * El flujo estaba mostrando:
     *
     *   Firmante: Aprobado
     *   Flujo: EN CURSO
     *
     * porque la aprobación se registraba antes de finalizar
     * el flujo y posteriormente fallaba la creación del
     * documento.
     *
     * Ahora solamente llegamos aquí después de crear
     * correctamente documento + versión + asociación.
     */

    const {
      data: flujoActualizado,
      error:
        flujoDocumentoUpdateError,
    } = await supabase
      .from("documentos_flujos")
      .update({
        documento_id:
          nuevoDocumento.id,

        estado_flujo_id:
          ESTADO_FLUJO_FINALIZADO,

        estado:
          "Finalizado",

        fecha_fin:
          ahora,

        updated_at:
          ahora,

        updated_by:
          usuarioId,
      })
      .eq(
        "id",
        flujo.id
      )
      .is(
        "documento_id",
        null
      )
      .select(`
        id,
        documento_id,
        numero_flujo,
        estado,
        fecha_inicio,
        fecha_fin,
        motivo_rechazo,
        observaciones
      `)
      .maybeSingle();

    if (flujoDocumentoUpdateError) {
      console.error(
        "Error finalizando flujo:",
        flujoDocumentoUpdateError
      );

      /*
       * Intentamos limpiar los registros creados.
       */

      await supabase
        .from("documentos_firmantes")
        .update({
          version_documento_id:
            null,
        })
        .eq(
          "flujo_id",
          flujo.id
        );

      await supabase
        .from("documentos_versiones")
        .delete()
        .eq(
          "id",
          nuevaVersionDocumento.id
        );

      await supabase
        .from("documentos")
        .delete()
        .eq(
          "id",
          nuevoDocumento.id
        );

      return jsonError(
        `No fue posible finalizar el flujo: ${flujoDocumentoUpdateError.message}`,
        500,
        {
          firma_registrada:
            true,

          documento_creado:
            true,

          version_creada:
            true,

          flujo_id:
            flujo.id,
        }
      );
    }

    /*
     * Si no regresó fila significa que otro proceso
     * pudo haber finalizado simultáneamente.
     */

    if (!flujoActualizado) {
      /*
       * En este caso NO eliminamos automáticamente el
       * documento, porque podría pertenecer a la otra
       * ejecución que ganó la carrera.
       */

      return jsonError(
        "El flujo fue procesado simultáneamente por otra solicitud.",
        409,
        {
          flujo_id:
            flujo.id,

          documento_id:
            nuevoDocumento.id,

          firma_registrada:
            true,
        }
      );
    }

    /*
     * ========================================================
     * 22. NOTIFICAR CREADOR
     * ========================================================
     */

    const {
      error:
        creadorFinalizadoError,
    } = await supabase
      .from("notificaciones")
      .insert({
        usuario_id:
          flujo.iniciado_por,

        tipo:
          "INFO",

        titulo:
          "Flujo de aprobación finalizado",

        mensaje:
          `Todos los firmantes aprobaron el documento "${flujo.titulo || flujo.numero_flujo}". El documento definitivo fue creado correctamente y está listo para publicación.`,

        entidad_tipo:
          "documentos_flujos",

        entidad_id:
          flujo.id,

        url:
          "/principal/mis-documentos",

        leida:
          false,
      });

    if (creadorFinalizadoError) {
      console.error(
        "Error notificando finalización al creador:",
        creadorFinalizadoError
      );
    }

    /*
     * ========================================================
     * 23. NOTIFICAR ÚLTIMO FIRMANTE
     * ========================================================
     */

    const {
      error:
        ultimoFirmanteNotificacionError,
    } = await supabase
      .from("notificaciones")
      .insert({
        usuario_id:
          usuarioId,

        tipo:
          "INFO",

        titulo:
          "Firma registrada correctamente",

        mensaje:
          `Tu aprobación fue registrada correctamente. El flujo "${flujo.numero_flujo}" ha sido finalizado.`,

        entidad_tipo:
          "documentos_flujos",

        entidad_id:
          flujo.id,

        url:
          "/principal/flujo-aprobaciones",

        leida:
          false,
      });

    if (
      ultimoFirmanteNotificacionError
    ) {
      console.error(
        "Error notificando al último firmante:",
        ultimoFirmanteNotificacionError
      );
    }

    /*
     * ========================================================
     * 24. RESPUESTA FINAL
     * ========================================================
     */

    return NextResponse.json(
      {
        success:
          true,

        accion:
          "aprobar",

        ultimo_firmante:
          true,

        documento_creado:
          true,

        message:
          "Firma aprobada correctamente. Todos los firmantes han aprobado y el documento definitivo fue creado.",

        flujo: {
          id:
            flujoActualizado.id,

          numero_flujo:
            flujoActualizado.numero_flujo,

          estado:
            "Finalizado",

          documento_id:
            nuevoDocumento.id,

          fecha_fin:
            ahora,
        },

        firma: {
          id:
            firmaAprobada.id,

          orden:
            firmaAprobada.orden,

          estado:
            estadoAprobado.nombre,

          fecha_aprobacion:
            ahora,
        },

        documento: {
          id:
            nuevoDocumento.id,

          codigo_flujo:
            nuevoDocumento.codigo_flujo,

          titulo:
            nuevoDocumento.titulo,

          descripcion:
            nuevoDocumento.descripcion,

          estado:
            nuevoDocumento.estado,

          visibilidad:
            nuevoDocumento.visibilidad,
        },

        version_origen: versionSeleccionada
          ? "archivo_firmado"
          : "version_actual_del_flujo",

        version_actual: {
          id:
            nuevaVersionDocumento.id,

          numero_version:
            nuevaVersionDocumento.numero_version,

          nombre_archivo:
            nuevaVersionDocumento.nombre_archivo,

          mime_type:
            nuevaVersionDocumento.mime_type,

          tamano_bytes:
            nuevaVersionDocumento.tamano_bytes,

          drive_url:
            nuevaVersionDocumento.drive_url,
        },

        progreso: {
          aprobados:
            todosFirmantes.length,

          total:
            todosFirmantes.length,

          pendientes:
            0,
        },

        listo_para_publicar:
          true,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "ERROR INESPERADO EN /api/flujos/aprobar-firma:",
      error
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar la firma.";

    return NextResponse.json(
      {
        success:
          false,

        error:
          mensaje,
      },
      { status: 500 }
    );
  }
}