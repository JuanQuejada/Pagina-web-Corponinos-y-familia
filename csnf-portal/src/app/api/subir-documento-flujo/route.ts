import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// POST /api/subir-documento-flujo
//
// ALTERNATIVA A
//
// Al iniciar:
//
// documentos_flujos
//      |
//      +--> documento_id = NULL
//      |
//      +--> flujos_versiones
//      |
//      +--> documentos_firmantes
//
// El documento definitivo se crea cuando el último firmante
// aprueba el flujo.
// ============================================================

export async function POST(request: Request) {
  let storagePath: string | null = null;

  let flujoId: string | null = null;
  let flujoVersionId: string | null = null;

  let firmantesCreadosIds: string[] = [];

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // ============================================================
    // 1. VALIDAR CONFIGURACIÓN
    // ============================================================

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "No están configuradas las variables de entorno de Supabase."
      );
    }

    const supabase =
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

    // ============================================================
    // 2. FORM DATA
    // ============================================================

    const formData =
      await request.formData();

    const titulo =
      String(
        formData.get("titulo") ||
          ""
      ).trim();

    const descripcionRaw =
      formData.get(
        "descripcion"
      );

    const descripcion =
      descripcionRaw !== null
        ? String(
            descripcionRaw
          ).trim() || null
        : null;

    const tipoDocumentoId =
      String(
        formData.get(
          "tipo_documento_id"
        ) || ""
      ).trim();

    const creadoPor =
      String(
        formData.get(
          "creador_id"
        ) || ""
      ).trim();

    const firmantesJson =
      String(
        formData.get(
          "firmantes_ids"
        ) || ""
      );

    const archivo =
      formData.get(
        "archivo"
      );

    // ============================================================
    // 3. VALIDACIONES BÁSICAS
    // ============================================================

    if (
      !titulo ||
      !tipoDocumentoId ||
      !creadoPor ||
      !firmantesJson ||
      !(archivo instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Faltan datos obligatorios: título, tipo de documento, creador, archivo o firmantes.",
        },
        { status: 400 }
      );
    }

    if (
      archivo.size <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El archivo está vacío.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 4. PARSEAR FIRMANTES
    // ============================================================

    let firmantesIds: string[];

    try {
      const parsed =
        JSON.parse(
          firmantesJson
        );

      if (
        !Array.isArray(
          parsed
        )
      ) {
        throw new Error(
          "El listado no es un arreglo."
        );
      }

      firmantesIds =
        parsed
          .map((id) =>
            String(
              id || ""
            ).trim()
          )
          .filter(Boolean);

    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "El listado de firmantes no tiene un formato válido.",
        },
        { status: 400 }
      );
    }

    // Eliminar duplicados conservando orden.
    firmantesIds = [
      ...new Set(
        firmantesIds
      ),
    ];

    if (
      firmantesIds.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Debe seleccionar al menos un firmante.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 5. VALIDAR CREADOR
    // ============================================================

    const {
      data: creador,
      error: creadorError,
    } = await supabase
      .from("usuarios")
      .select("id")
      .eq(
        "id",
        creadoPor
      )
      .maybeSingle();

    if (
      creadorError
    ) {
      throw new Error(
        `Error validando creador: ${creadorError.message}`
      );
    }

    if (!creador) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El creador indicado no existe.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 6. VALIDAR TIPO DE DOCUMENTO
    // ============================================================

    const {
      data: tipoDocumento,
      error: tipoError,
    } = await supabase
      .from("tipos_documento")
      .select(
        "id, nombre, codigo"
      )
      .eq(
        "id",
        tipoDocumentoId
      )
      .maybeSingle();

    if (
      tipoError
    ) {
      throw new Error(
        `Error validando tipo de documento: ${tipoError.message}`
      );
    }

    if (!tipoDocumento) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El tipo de documento indicado no existe.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 7. VALIDAR FIRMANTES
    // ============================================================

    const {
      data: usuariosFirmantes,
      error:
        firmantesError,
    } = await supabase
      .from("usuarios")
      .select("id")
      .in(
        "id",
        firmantesIds
      );

    if (
      firmantesError
    ) {
      throw new Error(
        `Error validando firmantes: ${firmantesError.message}`
      );
    }

    if (
      !usuariosFirmantes ||
      usuariosFirmantes.length !==
        firmantesIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Uno o más firmantes seleccionados no existen.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 8. ESTADO DEL FLUJO
    // ============================================================

    const {
      data: estadoFlujo,
      error:
        estadoFlujoError,
    } = await supabase
      .from(
        "estados_flujo_documento"
      )
      .select(
        "id, codigo, nombre"
      )
      .eq(
        "codigo",
        "CUR"
      )
      .eq(
        "activo",
        true
      )
      .maybeSingle();

    if (
      estadoFlujoError ||
      !estadoFlujo
    ) {
      throw new Error(
        `No se encontró el estado de flujo CUR: ${
          estadoFlujoError?.message ||
          "sin resultado"
        }`
      );
    }

    // ============================================================
    // 9. ESTADO FIRMANTE PENDIENTE
    // ============================================================

    const {
      data:
        estadoFirmantePendiente,
      error:
        estadoPendienteError,
    } = await supabase
      .from(
        "estados_firmante_documento"
      )
      .select(
        "id, codigo, nombre"
      )
      .eq(
        "codigo",
        "PEN"
      )
      .eq(
        "activo",
        true
      )
      .maybeSingle();

    if (
      estadoPendienteError ||
      !estadoFirmantePendiente
    ) {
      throw new Error(
        `No se encontró el estado de firmante PEN: ${
          estadoPendienteError?.message ||
          "sin resultado"
        }`
      );
    }

    // ============================================================
    // 10. ESTADO FIRMANTE HABILITADO
    // ============================================================

    const {
      data:
        estadoFirmanteHabilitado,
      error:
        estadoHabilitadoError,
    } = await supabase
      .from(
        "estados_firmante_documento"
      )
      .select(
        "id, codigo, nombre"
      )
      .eq(
        "codigo",
        "HAB"
      )
      .eq(
        "activo",
        true
      )
      .maybeSingle();

    if (
      estadoHabilitadoError ||
      !estadoFirmanteHabilitado
    ) {
      throw new Error(
        `No se encontró el estado de firmante HAB: ${
          estadoHabilitadoError?.message ||
          "sin resultado"
        }`
      );
    }

    // ============================================================
    // 11. SUBIR ARCHIVO
    // ============================================================

    const fileBuffer =
      Buffer.from(
        await archivo.arrayBuffer()
      );

    const safeFileName =
      archivo.name
        .replace(
          /\s+/g,
          "_"
        )
        .replace(
          /[^\w.\-]/g,
          "_"
        );

    const fileName =
      `${Date.now()}_${crypto.randomUUID()}_${safeFileName}`;

    storagePath =
      `flujos/originales/${fileName}`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          "documentos"
        )
        .upload(
          storagePath,
          fileBuffer,
          {
            contentType:
              archivo.type ||
              "application/octet-stream",
            upsert: false,
          }
        );

    if (
      uploadError
    ) {
      throw new Error(
        `Error al subir archivo a Storage: ${uploadError.message}`
      );
    }

    // ============================================================
    // 12. CREAR FLUJO
    // ============================================================

    let flujoData: {
      id: string;
      numero_flujo: string;
    } | null = null;

    let flujoError: any =
      null;

    for (
      let intento = 1;
      intento <= 5;
      intento++
    ) {
      const codigoFlujo =
        `FLJ-${Math.floor(
          100000 +
            Math.random() *
              900000
        )}`;

      const resultado =
        await supabase
          .from(
            "documentos_flujos"
          )
          .insert({
            documento_id:
              null,

            titulo,

            descripcion,

            tipo_documento_id:
              tipoDocumentoId,

            numero_flujo:
              codigoFlujo,

            iniciado_por:
              creadoPor,

            estado_flujo_id:
              estadoFlujo.id,

            estado:
              estadoFlujo.nombre,

            fecha_inicio:
              new Date().toISOString(),
          })
          .select(
            "id, numero_flujo"
          )
          .single();

      if (
        !resultado.error &&
        resultado.data
      ) {
        flujoData =
          resultado.data;

        flujoError =
          null;

        break;
      }

      flujoError =
        resultado.error;
    }

    if (!flujoData) {
      throw new Error(
        `No fue posible crear el flujo: ${
          flujoError?.message ||
          "error desconocido"
        }`
      );
    }

    flujoId =
      flujoData.id;

    const codigoFlujo =
      flujoData.numero_flujo;

    // ============================================================
    // 13. VERSION DEL FLUJO
    // ============================================================

    const {
      data: flujoVersion,
      error:
        flujoVersionError,
    } = await supabase
      .from(
        "flujos_versiones"
      )
      .insert({
        flujo_id:
          flujoId,

        numero_version:
          1,

        es_version_actual:
          true,

        nombre_archivo:
          archivo.name,

        mime_type:
          archivo.type ||
          "application/octet-stream",

        tamano_bytes:
          archivo.size,

        storage_path:
          storagePath,

        usuario_carga_id:
          creadoPor,
      })
      .select(
        "id"
      )
      .single();

    if (
      flujoVersionError ||
      !flujoVersion
    ) {
      throw new Error(
        `Error al registrar la versión inicial del flujo: ${
          flujoVersionError?.message ||
          "sin resultado"
        }`
      );
    }

    flujoVersionId =
      flujoVersion.id;

    // ============================================================
    // 14. FIRMANTES
    // ============================================================

    const ahora =
      new Date().toISOString();

    const firmantesInsert =
      firmantesIds.map(
        (
          usuarioId,
          index
        ) => {
          const orden =
            index + 1;

          return {
            flujo_id:
              flujoId,

            usuario_id:
              usuarioId,

            orden,

            fecha_habilitacion:
              orden === 1
                ? ahora
                : null,

            estado_firmante_id:
              orden === 1
                ? estadoFirmanteHabilitado.id
                : estadoFirmantePendiente.id,

            /*
             * El documento todavía NO existe.
             */
            version_documento_id:
              null,
          };
        }
      );

    const {
      data:
        firmantesCreados,
      error:
        firmantesInsertError,
    } = await supabase
      .from(
        "documentos_firmantes"
      )
      .insert(
        firmantesInsert
      )
      .select(
        "id, usuario_id, orden"
      );

    if (
      firmantesInsertError ||
      !firmantesCreados
    ) {
      throw new Error(
        `Error registrando firmantes: ${
          firmantesInsertError?.message ||
          "sin resultado"
        }`
      );
    }

    firmantesCreadosIds =
      firmantesCreados.map(
        (firmante) =>
          firmante.id
      );

    // ============================================================
    // 15. NOTIFICAR PRIMER FIRMANTE
    // ============================================================

    const primerFirmante =
      firmantesCreados.find(
        (firmante) =>
          firmante.orden === 1
      );

    if (
      primerFirmante
    ) {
      const {
        error:
          notificacionError,
      } = await supabase
        .from(
          "notificaciones"
        )
        .insert({
          usuario_id:
            primerFirmante.usuario_id,

          tipo:
            "APROBACION_PENDIENTE",

          titulo:
            "Nuevo documento pendiente de firma",

          mensaje:
            `Se te ha asignado el documento "${titulo}" para revisión y firma.`,

          entidad_tipo:
            "documentos_flujos",

          entidad_id:
            flujoId,

          url:
            "/principal/flujo-aprobaciones",

          leida:
            false,
        });

      if (
        notificacionError
      ) {
        console.error(
          "Error notificando al primer firmante:",
          notificacionError
        );
      }
    }

    // ============================================================
    // 16. NOTIFICAR CREADOR
    // ============================================================

    const {
      error:
        creadorNotificacionError,
    } = await supabase
      .from(
        "notificaciones"
      )
      .insert({
        usuario_id:
          creadoPor,

        tipo:
          "INFO",

        titulo:
          "Flujo de aprobación iniciado",

        mensaje:
          `Has iniciado correctamente el flujo "${codigoFlujo}" para el documento "${titulo}".`,

        entidad_tipo:
          "documentos_flujos",

        entidad_id:
          flujoId,

        url:
          "/principal/mis-documentos",

        leida:
          false,
      });

    if (
      creadorNotificacionError
    ) {
      console.error(
        "Error notificando al creador:",
        creadorNotificacionError
      );
    }

    // ============================================================
    // 17. RESPUESTA
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Flujo de aprobación creado exitosamente.",

        flujo_id:
          flujoId,

        codigo_flujo:
          codigoFlujo,

        documento_id:
          null,

        flujo_version_id:
          flujoVersionId,

        estado_flujo: {
          id:
            estadoFlujo.id,

          codigo:
            estadoFlujo.codigo,

          nombre:
            estadoFlujo.nombre,
        },

        cantidad_firmantes:
          firmantesCreados.length,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "Error en /api/subir-documento-flujo:",
      error
    );

    // ============================================================
    // LIMPIEZA BD
    //
    // Se eliminan dependencias antes del flujo.
    // ============================================================

    try {
      const supabase =
        supabaseUrl &&
        serviceRoleKey
          ? createClient(
              supabaseUrl,
              serviceRoleKey,
              {
                auth: {
                  autoRefreshToken:
                    false,
                  persistSession:
                    false,
                },
              }
            )
          : null;

      if (supabase) {
        if (
          firmantesCreadosIds.length >
          0
        ) {
          await supabase
            .from(
              "documentos_firmantes"
            )
            .delete()
            .in(
              "id",
              firmantesCreadosIds
            );
        }

        if (
          flujoVersionId
        ) {
          await supabase
            .from(
              "flujos_versiones"
            )
            .delete()
            .eq(
              "id",
              flujoVersionId
            );
        }

        if (flujoId) {
          await supabase
            .from(
              "documentos_flujos"
            )
            .delete()
            .eq(
              "id",
              flujoId
            );
        }
      }
    } catch (cleanupDbError) {
      console.error(
        "Error limpiando registros BD:",
        cleanupDbError
      );
    }

    // ============================================================
    // LIMPIEZA STORAGE
    // ============================================================

    if (
      storagePath &&
      supabaseUrl &&
      serviceRoleKey
    ) {
      try {
        const supabase =
          createClient(
            supabaseUrl,
            serviceRoleKey,
            {
              auth: {
                autoRefreshToken:
                  false,
                persistSession:
                  false,
              },
            }
          );

        const {
          error:
            removeError,
        } =
          await supabase.storage
            .from(
              "documentos"
            )
            .remove([
              storagePath,
            ]);

        if (
          removeError
        ) {
          console.error(
            "No se pudo eliminar archivo huérfano:",
            removeError
          );
        }
      } catch (
        cleanupStorageError
      ) {
        console.error(
          "Error durante limpieza de Storage:",
          cleanupStorageError
        );
      }
    }

    const mensaje =
      error instanceof Error
        ? error.message
        : "Error interno del servidor.";

    return NextResponse.json(
      {
        success: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}