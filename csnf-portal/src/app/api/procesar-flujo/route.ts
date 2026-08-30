import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// ESTADOS DEL FLUJO
// ============================================================

const ESTADOS_FLUJO = {
  PENDIENTE: "f33e7727-4998-4b4d-9245-23502dd8b293",
  EN_CURSO: "dbb08020-424a-4cf3-84b3-a3d975a088f0",
  RECHAZADO: "597ddc01-1f85-4af7-a6d6-574d5bdde23b",
  FINALIZADO: "20f8a732-9779-465f-af15-b4f62cd3745f",
  CANCELADO: "925e2cd5-62e5-4313-bb27-cf487af69bb2",
};

// ============================================================
// ESTADOS DE LOS FIRMANTES
// ============================================================

const ESTADOS_FIRMANTE = {
  PENDIENTE: "6f1665c2-3194-462c-aa5b-a44a786978aa",
  HABILITADO: "7c4a1357-733f-468b-9208-8f46acf386e5",
  DOCUMENTO_CARGADO: "7fa80abc-621b-44d1-8b11-0e92b20f577a",
  APROBADO: "e8107f56-0f26-4ab6-aff1-4c73530f134a",
  RECHAZADO: "62a7203b-dfff-463d-92d6-819cbf9e9ade",
  OMITIDO: "49492c19-86a4-4b14-bf6e-2d48c7e6907a",
};

// ============================================================
// POST /api/procesar-flujo
//
// FormData esperado:
//
// firmante_id
// flujo_id
// usuario_id
// accion = aprobar | rechazar
// observacion
// file = archivo firmado opcional
// ============================================================

export async function POST(request: Request) {
  let storagePathCreado: string | null = null;

  try {
    // ========================================================
    // 1. FORM DATA
    // ========================================================

    const formData = await request.formData();

    const firmanteId =
      String(
        formData.get("firmante_id") || ""
      ).trim();

    const flujoId =
      String(
        formData.get("flujo_id") || ""
      ).trim();

    const usuarioId =
      String(
        formData.get("usuario_id") || ""
      ).trim();

    const accion =
      String(
        formData.get("accion") || ""
      ).trim();

    const observacion =
      String(
        formData.get("observacion") || ""
      ).trim() || null;

    const fileValue =
      formData.get("file");

    const file =
      fileValue instanceof File &&
      fileValue.size > 0
        ? fileValue
        : null;

    // ========================================================
    // 2. VALIDACIONES
    // ========================================================

    if (
      !firmanteId ||
      !flujoId ||
      !usuarioId ||
      !accion
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Faltan datos obligatorios para procesar el paso.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      accion !== "aprobar" &&
      accion !== "rechazar"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'La acción debe ser "aprobar" o "rechazar".',
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // 3. SUPABASE
    // ========================================================

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const db = supabase as any;

    // ========================================================
    // 4. OBTENER FLUJO
    // ========================================================

    const {
      data: flujo,
      error: flujoError,
    } = await db
      .from("documentos_flujos")
      .select(`
        id,
        numero_flujo,
        titulo,
        descripcion,
        documento_id,
        iniciado_por,
        estado,
        estado_flujo_id
      `)
      .eq("id", flujoId)
      .single();

    if (flujoError || !flujo) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se encontró el flujo especificado.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // 5. EL FLUJO DEBE ESTAR EN CURSO
    // ========================================================

    if (
      flujo.estado_flujo_id ===
        ESTADOS_FLUJO.FINALIZADO ||
      flujo.estado_flujo_id ===
        ESTADOS_FLUJO.RECHAZADO ||
      flujo.estado_flujo_id ===
        ESTADOS_FLUJO.CANCELADO
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Este flujo ya no se encuentra disponible para procesamiento.",
        },
        {
          status: 409,
        }
      );
    }

    // ========================================================
    // 6. OBTENER FIRMANTE
    // ========================================================

    const {
      data: firmante,
      error: firmanteError,
    } = await db
      .from("documentos_firmantes")
      .select(`
        id,
        flujo_id,
        usuario_id,
        orden,
        fecha_habilitacion,
        fecha_aprobacion,
        fecha_rechazo,
        estado_firmante_id,
        observaciones,
        version_documento_id
      `)
      .eq("id", firmanteId)
      .eq("flujo_id", flujoId)
      .single();

    if (firmanteError || !firmante) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se encontró el firmante asociado al flujo.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // 7. VALIDAR USUARIO
    // ========================================================

    if (
      firmante.usuario_id !==
      usuarioId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El usuario que intenta procesar el paso no corresponde al firmante asignado.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // 8. EVITAR DOBLE PROCESAMIENTO
    // ========================================================

    if (
      firmante.estado_firmante_id ===
        ESTADOS_FIRMANTE.APROBADO ||
      firmante.estado_firmante_id ===
        ESTADOS_FIRMANTE.RECHAZADO ||
      firmante.fecha_aprobacion ||
      firmante.fecha_rechazo
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Este paso del flujo ya fue procesado anteriormente.",
        },
        {
          status: 409,
        }
      );
    }

    // ========================================================
    // 9. VALIDAR QUE SEA EL PASO ACTIVO
    // ========================================================

    if (
      firmante.estado_firmante_id !==
        ESTADOS_FIRMANTE.HABILITADO &&
      firmante.estado_firmante_id !==
        ESTADOS_FIRMANTE.DOCUMENTO_CARGADO
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El firmante todavía no está habilitado para procesar este paso.",
        },
        {
          status: 409,
        }
      );
    }

    const ahora =
      new Date().toISOString();

    // ========================================================
    // 10. CERRAR NOTIFICACIÓN DEL FIRMANTE
    // ========================================================

    const {
      error: cerrarNotificacionError,
    } = await db
      .from("notificaciones")
      .update({
        leida: true,
      })
      .eq("usuario_id", usuarioId)
      .eq(
        "entidad_tipo",
        "documentos_flujos"
      )
      .eq(
        "entidad_id",
        flujoId
      )
      .eq(
        "tipo",
        "APROBACION_PENDIENTE"
      )
      .eq(
        "leida",
        false
      );

    if (cerrarNotificacionError) {
      throw new Error(
        `Error cerrando la notificación pendiente: ${cerrarNotificacionError.message}`
      );
    }

    // ========================================================
    // 11. SUBIR ARCHIVO FIRMADO
    //
    // El archivo pertenece al flujo.
    // ========================================================

    let versionFlujoId:
      string | null = null;

    if (file) {
      const fileBuffer =
        Buffer.from(
          await file.arrayBuffer()
        );

      const safeFileName =
        file.name
          .replace(/\s+/g, "_")
          .replace(
            /[^\w.\-]/g,
            "_"
          );

      const fileName =
        `${Date.now()}_firmado_${safeFileName}`;

      storagePathCreado =
        `flujos/firmados/${fileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("documentos")
        .upload(
          storagePathCreado,
          fileBuffer,
          {
            contentType:
              file.type ||
              "application/octet-stream",
            upsert: false,
          }
        );

      if (uploadError) {
        throw new Error(
          `Error al subir archivo firmado: ${uploadError.message}`
        );
      }

      // ------------------------------------------------------
      // Desactivar versión anterior
      // ------------------------------------------------------

      const {
        error:
          desactivarVersionError,
      } = await db
        .from("flujos_versiones")
        .update({
          es_version_actual: false,
        })
        .eq(
          "flujo_id",
          flujoId
        )
        .eq(
          "es_version_actual",
          true
        );

      if (desactivarVersionError) {
        throw new Error(
          `Error actualizando la versión anterior: ${desactivarVersionError.message}`
        );
      }

      // ------------------------------------------------------
      // Obtener siguiente número
      // ------------------------------------------------------

      const {
        data: ultimaVersion,
        error:
          ultimaVersionError,
      } = await db
        .from("flujos_versiones")
        .select(
          "numero_version"
        )
        .eq(
          "flujo_id",
          flujoId
        )
        .order(
          "numero_version",
          {
            ascending: false,
          }
        )
        .limit(1);

      if (ultimaVersionError) {
        throw new Error(
          `Error obteniendo la última versión del flujo: ${ultimaVersionError.message}`
        );
      }

      const siguienteNumero =
        (
          ultimaVersion?.[0]
            ?.numero_version || 0
        ) + 1;

      // ------------------------------------------------------
      // Crear versión
      // ------------------------------------------------------

      const {
        data: nuevaVersion,
        error:
          nuevaVersionError,
      } = await db
        .from("flujos_versiones")
        .insert({
          flujo_id:
            flujoId,

          numero_version:
            siguienteNumero,

          es_version_actual:
            true,

          nombre_archivo:
            file.name,

          mime_type:
            file.type ||
            "application/octet-stream",

          tamano_bytes:
            file.size,

          storage_path:
            storagePathCreado,

          usuario_carga_id:
            usuarioId,
        })
        .select("id")
        .single();

      if (
        nuevaVersionError ||
        !nuevaVersion
      ) {
        throw new Error(
          `Error registrando la nueva versión del flujo: ${
            nuevaVersionError?.message ||
            "No se recibió el ID."
          }`
        );
      }

      versionFlujoId =
        nuevaVersion.id;

      // El archivo ya quedó registrado.
      storagePathCreado =
        null;
    }

    // ========================================================
    // 12. REGISTRAR HISTORIAL DE LA ACCIÓN
    //
    // Esto es lo que alimentará posteriormente la pestaña
    // Historial.
    // ========================================================

    const {
      error: historialError,
    } = await db
      .from(
        "documentos_flujos_historial"
      )
      .insert({
        documento_flujo_id:
          flujoId,

        usuario_id:
          usuarioId,

        accion:
          accion === "aprobar"
            ? "Aprobado"
            : "Rechazado",

        observacion:
          observacion ||
          `Acción realizada: ${accion}`,
      });

    if (historialError) {
      throw new Error(
        `Error registrando el historial: ${historialError.message}`
      );
    }

    // ========================================================
    // 13. RECHAZO
    // ========================================================

    if (
      accion === "rechazar"
    ) {
      // ------------------------------------------------------
      // Actualizar firmante
      // ------------------------------------------------------

      const {
        error:
          actualizarFirmanteError,
      } = await db
        .from(
          "documentos_firmantes"
        )
        .update({
          fecha_rechazo:
            ahora,

          observaciones:
            observacion,

          estado_firmante_id:
            ESTADOS_FIRMANTE.RECHAZADO,

          version_documento_id:
            versionFlujoId,
        })
        .eq(
          "id",
          firmanteId
        );

      if (
        actualizarFirmanteError
      ) {
        throw new Error(
          `Error actualizando el firmante rechazado: ${actualizarFirmanteError.message}`
        );
      }

      // ------------------------------------------------------
      // Rechazar flujo
      // ------------------------------------------------------

      const {
        error:
          actualizarFlujoError,
      } = await db
        .from(
          "documentos_flujos"
        )
        .update({
          estado:
            "Rechazado",

          estado_flujo_id:
            ESTADOS_FLUJO.RECHAZADO,

          motivo_rechazo:
            observacion,

          fecha_fin:
            ahora,

          updated_at:
            ahora,
        })
        .eq(
          "id",
          flujoId
        );

      if (
        actualizarFlujoError
      ) {
        throw new Error(
          `Error actualizando el estado del flujo: ${actualizarFlujoError.message}`
        );
      }

      // ------------------------------------------------------
      // Cerrar TODAS las notificaciones pendientes
      // ------------------------------------------------------

      const {
        error:
          cerrarOtrasNotificacionesError,
      } = await db
        .from("notificaciones")
        .update({
          leida: true,
        })
        .eq(
          "entidad_tipo",
          "documentos_flujos"
        )
        .eq(
          "entidad_id",
          flujoId
        )
        .eq(
          "tipo",
          "APROBACION_PENDIENTE"
        )
        .eq(
          "leida",
          false
        );

      if (
        cerrarOtrasNotificacionesError
      ) {
        console.error(
          "No se pudieron cerrar todas las notificaciones pendientes:",
          cerrarOtrasNotificacionesError
        );
      }

      // ------------------------------------------------------
      // Notificar creador
      // ------------------------------------------------------

      if (
        flujo.iniciado_por
      ) {
        const {
          error:
            notificacionError,
        } = await db
          .from(
            "notificaciones"
          )
          .insert({
            usuario_id:
              flujo.iniciado_por,

            tipo:
              "FLUJO_RECHAZADO",

            titulo:
              "Flujo de aprobación rechazado",

            mensaje:
              `El flujo #${flujo.numero_flujo} ha sido rechazado. Motivo: ${
                observacion ||
                "Sin especificar"
              }`,

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
            "Error notificando el rechazo:",
            notificacionError
          );
        }
      }

      return NextResponse.json({
        success: true,

        message:
          "Flujo rechazado correctamente.",

        flujo_id:
          flujoId,

        numero_flujo:
          flujo.numero_flujo,

        estado:
          "Rechazado",

        estado_flujo_id:
          ESTADOS_FLUJO.RECHAZADO,
      });
    }

    // ========================================================
// 14. APROBACIÓN DEL FIRMANTE
//
// Si el firmante cargó un archivo, versionFlujoId ya
// contiene la nueva versión creada.
//
// Si NO cargó archivo, utilizamos la versión actual del
// flujo. Esto permite aprobar/publicar directamente la
// versión inicial.
// ========================================================

if (!versionFlujoId) {
  const {
    data: versionActual,
    error: versionActualError,
  } = await db
    .from("flujos_versiones")
    .select("id, numero_version")
    .eq("flujo_id", flujoId)
    .eq("es_version_actual", true)
    .maybeSingle();

  if (versionActualError) {
    throw new Error(
      `Error obteniendo la versión actual del flujo: ${versionActualError.message}`
    );
  }

  if (!versionActual) {
    throw new Error(
      "El flujo no tiene una versión actual disponible para aprobar."
    );
  }

  versionFlujoId = versionActual.id;
}

const {
  error:
    aprobarFirmanteError,
} = await db
  .from(
    "documentos_firmantes"
  )
  .update({
    fecha_aprobacion:
      ahora,

    observaciones:
      observacion,

    estado_firmante_id:
      ESTADOS_FIRMANTE.APROBADO,

    version_documento_id:
      versionFlujoId,
  })
  .eq(
    "id",
    firmanteId
  );

if (
  aprobarFirmanteError
) {
  throw new Error(
    `Error actualizando el firmante aprobado: ${aprobarFirmanteError.message}`
  );
}

    // ========================================================
    // 15. BUSCAR SIGUIENTE FIRMANTE
    // ========================================================

    const ordenSiguiente =
      Number(firmante.orden) + 1;

    const {
      data: siguienteFirmante,
      error:
        siguienteFirmanteError,
    } = await db
      .from(
        "documentos_firmantes"
      )
      .select(`
        id,
        usuario_id,
        orden,
        estado_firmante_id,
        fecha_aprobacion,
        fecha_rechazo
      `)
      .eq(
        "flujo_id",
        flujoId
      )
      .eq(
        "orden",
        ordenSiguiente
      )
      .maybeSingle();

    if (
      siguienteFirmanteError
    ) {
      throw new Error(
        `Error buscando el siguiente firmante: ${siguienteFirmanteError.message}`
      );
    }

    // ========================================================
    // 16. EXISTE SIGUIENTE FIRMANTE
    // ========================================================

    if (
      siguienteFirmante
    ) {
      // ------------------------------------------------------
      // Habilitar siguiente firmante
      // ------------------------------------------------------

      const {
        error:
          habilitarError,
      } = await db
        .from(
          "documentos_firmantes"
        )
        .update({
          fecha_habilitacion:
            ahora,

          estado_firmante_id:
            ESTADOS_FIRMANTE.HABILITADO,
        })
        .eq(
          "id",
          siguienteFirmante.id
        );

      if (
        habilitarError
      ) {
        throw new Error(
          `Error habilitando al siguiente firmante: ${habilitarError.message}`
        );
      }

      // ------------------------------------------------------
      // Notificar siguiente firmante
      // ------------------------------------------------------

      const {
        error:
          notificacionError,
      } = await db
        .from(
          "notificaciones"
        )
        .insert({
          usuario_id:
            siguienteFirmante.usuario_id,

          tipo:
            "APROBACION_PENDIENTE",

          titulo:
            "Nuevo documento pendiente de firma",

          mensaje:
            `El flujo #${flujo.numero_flujo} ha avanzado y requiere tu firma o aprobación (Paso #${ordenSiguiente}).`,

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
          "Error notificando al siguiente firmante:",
          notificacionError
        );
      }

      return NextResponse.json({
        success: true,

        message:
          "Paso aprobado y avanzado al siguiente firmante.",

        flujo_id:
          flujoId,

        numero_flujo:
          flujo.numero_flujo,

        firmante_id:
          firmanteId,

        accion:
          "aprobar",

        siguiente_firmante_id:
          siguienteFirmante.id,

        siguiente_orden:
          ordenSiguiente,

        estado:
          "En curso",

        estado_flujo_id:
          ESTADOS_FLUJO.EN_CURSO,
      });
    }

    // ========================================================
    // 17. ÚLTIMO FIRMANTE
    //
    // Ya no existe otro paso.
    // ========================================================

    // --------------------------------------------------------
    // Cerrar cualquier notificación pendiente del flujo.
    //
    // Esto garantiza que ningún usuario conserve el flujo
    // dentro de su bandeja de pendientes.
    // --------------------------------------------------------

    const {
      error:
        cerrarPendientesFinalError,
    } = await db
      .from("notificaciones")
      .update({
        leida: true,
      })
      .eq(
        "entidad_tipo",
        "documentos_flujos"
      )
      .eq(
        "entidad_id",
        flujoId
      )
      .eq(
        "tipo",
        "APROBACION_PENDIENTE"
      )
      .eq(
        "leida",
        false
      );

    if (
      cerrarPendientesFinalError
    ) {
      console.error(
        "No se pudieron cerrar las notificaciones pendientes al finalizar:",
        cerrarPendientesFinalError
      );
    }

    // --------------------------------------------------------
    // Finalizar flujo
    // --------------------------------------------------------

    const {
      error:
        finalizarFlujoError,
    } = await db
      .from(
        "documentos_flujos"
      )
      .update({
        estado:
          "Finalizado",

        estado_flujo_id:
          ESTADOS_FLUJO.FINALIZADO,

        fecha_fin:
          ahora,

        updated_at:
          ahora,
      })
      .eq(
        "id",
        flujoId
      );

    if (
      finalizarFlujoError
    ) {
      throw new Error(
        `Error finalizando el flujo: ${finalizarFlujoError.message}`
      );
    }

    // --------------------------------------------------------
    // Notificar creador
    // --------------------------------------------------------

    if (
      flujo.iniciado_por
    ) {
      const {
        error:
          notificacionFinalError,
      } = await db
        .from(
          "notificaciones"
        )
        .insert({
          usuario_id:
            flujo.iniciado_por,

          tipo:
            "FLUJO_FINALIZADO",

          titulo:
            "Flujo de aprobación completado",

          mensaje:
            `El flujo #${flujo.numero_flujo} ha finalizado correctamente. Ya puedes seleccionar su destino final de publicación.`,

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
        notificacionFinalError
      ) {
        console.error(
          "Error notificando la finalización:",
          notificacionFinalError
        );
      }
    }

    // ========================================================
    // 18. RESPUESTA FINAL
    // ========================================================

    return NextResponse.json({
      success: true,

      message:
        "¡Flujo completado exitosamente por el último firmante!",

      flujo_id:
        flujoId,

      numero_flujo:
        flujo.numero_flujo,

      firmante_id:
        firmanteId,

      accion:
        "aprobar",

      estado:
        "Finalizado",

      estado_flujo_id:
        ESTADOS_FLUJO.FINALIZADO,

      version_flujo_id:
        versionFlujoId,

      puede_publicar:
        true,

      documento_id:
        flujo.documento_id || null,
    });
  } catch (error: any) {
    // ========================================================
    // LIMPIEZA DE STORAGE
    // ========================================================

    if (
      storagePathCreado
    ) {
      try {
        const supabase =
          createClient(
            process.env
              .NEXT_PUBLIC_SUPABASE_URL!,
            process.env
              .SUPABASE_SERVICE_ROLE_KEY!
          );

        const {
          error:
            removeError,
        } = await supabase.storage
          .from("documentos")
          .remove([
            storagePathCreado,
          ]);

        if (removeError) {
          console.error(
            "No se pudo eliminar el archivo huérfano:",
            removeError
          );
        }
      } catch (
        cleanupError
      ) {
        console.error(
          "Error durante limpieza de Storage:",
          cleanupError
        );
      }
    }

    console.error(
      "Error al procesar paso del flujo:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Error interno del servidor.",
      },
      {
        status: 500,
      }
    );
  }
}