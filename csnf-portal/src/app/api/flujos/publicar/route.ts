import {
  supabaseAdmin,
  getProfileFromBearer,
  resolveRoleIds,
  generarCodigoPublicacion,
  generarConsecutivoRepositorio,
  registrarDocumentoAuditoria,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

import {
  subirArchivo,
  obtenerGoogleDriveDestinoFolderId,
} from "@/lib/google-drive";

/* ============================================================
   CONSTANTES
============================================================ */

const ESTADO_FINALIZADO =
  "20f8a732-9779-465f-af15-b4f62cd3745f";

const BUCKET_FLUJOS = "documentos";

/*
 * Valores permitidos por:
 *
 * documentos_flujos_destino_final_check
 *
 * CHECK:
 * destino_final IS NULL
 * OR destino_final IN ('DOCUMENTOS', 'REPOSITORIO')
 */
const DESTINO_DOCUMENTOS = "DOCUMENTOS";
const DESTINO_REPOSITORIO = "REPOSITORIO";

/* ============================================================
   HELPERS
============================================================ */

function normalizarDestino(value: unknown) {
  const v = String(value || "").trim().toLowerCase();

  if (
    v === "repositorios" ||
    v === "repositorio" ||
    v.includes("repos")
  ) {
    return "repositorios";
  }

  if (
    v === "documentos" ||
    v === "documento"
  ) {
    return "documentos";
  }

  return "";
}

function normalizarRoles(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function seleccionaTodaEntidad(roles: string[]) {
  return roles.some((role) => {
    const normalized = role
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    return (
      normalized === "todos los roles" ||
      normalized === "toda entidad" ||
      normalized === "toda_entidad" ||
      normalized === "todos"
    );
  });
}

/* ============================================================
   POST
============================================================ */

export async function POST(request: Request) {
  let driveFileId: string | null = null;
  let createdDocumentId: string | null = null;

  try {
    /* ========================================================
       1. AUTENTICACIÓN
    ======================================================== */

    const actor = await getProfileFromBearer(request);

    if (!actor) {
      return jsonError("Sesión no válida.", 401);
    }

    /* ========================================================
       2. BODY
    ======================================================== */

    const body = await request.json().catch(() => ({}));

    const flujoId = String(
      body?.flujo_id || ""
    ).trim();

    const destino = normalizarDestino(
      body?.modulo || body?.destino
    );

    const rolesInput = normalizarRoles(
      body?.roles
    );

    if (!flujoId) {
      return jsonError("Falta flujo_id.");
    }

    if (!destino) {
      return jsonError(
        "El destino debe ser documentos o repositorios."
      );
    }

    const supabase = supabaseAdmin();

    /* ========================================================
       3. OBTENER FLUJO
    ======================================================== */

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
        estado,
        iniciado_por,
        fecha_fin,
        titulo,
        descripcion,
        tipo_documento_id,
        repositorio_id,
        destino_final
      `)
      .eq("id", flujoId)
      .single();

    if (flujoError || !flujo) {
      return jsonError(
        "Flujo no encontrado.",
        404
      );
    }

    /* ========================================================
       4. VALIDAR CREADOR
    ======================================================== */

    if (
      flujo.iniciado_por !==
      actor.profile.id
    ) {
      return jsonError(
        "Solo el creador del flujo puede publicarlo.",
        403
      );
    }

    /* ========================================================
       5. VALIDAR FINALIZACIÓN
    ======================================================== */

    const finalizado =
      flujo.estado_flujo_id ===
        ESTADO_FINALIZADO ||
      String(flujo.estado || "")
        .trim()
        .toLowerCase() === "finalizado";

    if (!finalizado) {
      return jsonError(
        "El flujo todavía no está finalizado.",
        409
      );
    }

    /* ========================================================
       6. VALIDAR QUE NO ESTÉ PUBLICADO
    ======================================================== */

    if (
      String(flujo.destino_final || "")
        .trim()
    ) {
      return jsonError(
        "El flujo ya tiene un destino final registrado.",
        409
      );
    }

    /* ========================================================
       7. VALIDAR DESTINO
    ======================================================== */

    if (destino === "repositorios") {
      /*
       * El módulo Repositorio funciona como una bóveda
       * privada. No existen subtipos de repositorio.
       *
       * Por eso debe existir exactamente un repositorio
       * activo configurado.
       */

      const {
        data: activeRepos,
        error: activeRepoError,
      } = await supabase
        .from("repositorios")
        .select(
          "id,nombre,activo"
        )
        .eq("activo", true);

      if (activeRepoError) {
        return jsonError(
          activeRepoError.message,
          500
        );
      }

      if (
        !activeRepos ||
        activeRepos.length !== 1
      ) {
        return jsonError(
          activeRepos?.length === 0
            ? "No existe un repositorio activo configurado."
            : "Existe más de un repositorio activo. Debe quedar uno solo para la publicación automática.",
          409
        );
      }
    } else {
      /*
       * Documentos:
       *
       * visibilidad NO guarda los roles.
       *
       * documentos.visibilidad solamente admite:
       *   publico
       *   privado
       *
       * Los roles se almacenan en:
       * documentos_destinatarios
       */

      const todaEntidad =
        seleccionaTodaEntidad(
          rolesInput
        );

      if (!todaEntidad) {
        const roleIds =
          await resolveRoleIds(
            supabase,
            rolesInput
          );

        if (roleIds.length === 0) {
          return jsonError(
            "Debes seleccionar al menos un rol válido para publicar en Documentos.",
            400
          );
        }
      }
    }

    /* ========================================================
       8. DETERMINAR DOCUMENTO EXISTENTE
    ======================================================== */

    /*
     * Los flujos nuevos pueden no tener documento_id.
     *
     * Los flujos antiguos pueden tenerlo.
     *
     * Si existe y corresponde a un documento real,
     * lo reutilizamos.
     */

    let documentoId =
      flujo.documento_id as string | null;

    let versionDocumentoId:
      string | null = null;

    if (documentoId) {
      const {
        data: existingDoc,
      } = await supabase
        .from("documentos")
        .select(
          "id,creador_id,tipo_documento_id"
        )
        .eq("id", documentoId)
        .maybeSingle();

      if (!existingDoc) {
        documentoId = null;
      }
    }

    /* ========================================================
       9. OBTENER VERSIÓN ACTUAL DEL FLUJO
    ======================================================== */

    const {
      data: version,
      error: versionError,
    } = await supabase
      .from("flujos_versiones")
      .select(`
        id,
        numero_version,
        nombre_archivo,
        mime_type,
        tamano_bytes,
        storage_path,
        usuario_carga_id
      `)
      .eq("flujo_id", flujoId)
      .eq("es_version_actual", true)
      .maybeSingle();

    if (
      versionError ||
      !version
    ) {
      return jsonError(
        "El flujo finalizado no tiene una versión actual de archivo.",
        409
      );
    }

    if (!version.storage_path) {
      return jsonError(
        "La versión final no tiene storage_path.",
        409
      );
    }

    /* ========================================================
       10. DESCARGAR VERSIÓN DESDE SUPABASE STORAGE
    ======================================================== */

    const {
      data: downloaded,
      error: downloadError,
    } = await supabase.storage
      .from(BUCKET_FLUJOS)
      .download(
        version.storage_path
      );

    if (
      downloadError ||
      !downloaded
    ) {
      return jsonError(
        `No fue posible recuperar el archivo final del flujo: ${
          downloadError?.message ||
          "archivo no encontrado"
        }`,
        409
      );
    }

    const buffer =
      Buffer.from(
        await downloaded.arrayBuffer()
      );

    const mimeType =
      version.mime_type ||
      downloaded.type ||
      "application/octet-stream";

    /* ========================================================
       11. CREAR DOCUMENTO DEFINITIVO SI NO EXISTE
    ======================================================== */

    if (!documentoId) {
      /*
       * IMPORTANTE:
       *
       * NO generamos aquí codigo_publicacion.
       *
       * El código definitivo se genera cuando se registra
       * documentos_publicaciones y luego se copia a
       * documentos.codigo_publicacion.
       *
       * De esta manera ambos valores son exactamente iguales.
       */

      const {
        data: documento,
        error: documentoError,
      } = await supabase
        .from("documentos")
        .insert({
          codigo_flujo:
            flujo.numero_flujo,

          codigo_publicacion:
            null,

          titulo:
            flujo.titulo ||
            "Documento sin título",

          descripcion:
            flujo.descripcion ||
            null,

          fecha_documento:
            String(
              flujo.fecha_fin ||
                new Date().toISOString()
            ).slice(0, 10),

          tipo_documento_id:
            flujo.tipo_documento_id,

          requiere_flujo:
            true,

          requiere_publicacion:
            true,

          creador_id:
            flujo.iniciado_por,

          created_by:
            actor.profile.id,

          estado:
            "privado",

          /*
           * VALOR VÁLIDO SEGÚN:
           * documentos_visibilidad_check
           *
           * CHECK (
           *   visibilidad IN ('privado','publico')
           * )
           *
           * Antes se utilizaba "roles", lo cual provocaba
           * el error:
           *
           * violates check constraint
           */
          visibilidad:
            destino === "documentos"
              ? "publico"
              : "privado",

          publicado_en:
            null,

          publicado_por:
            null,
        })
        .select("id")
        .single();

      if (
        documentoError ||
        !documento
      ) {
        return jsonError(
          documentoError?.message ||
            "No se pudo crear el documento definitivo.",
          500
        );
      }

      documentoId =
        documento.id;

      createdDocumentId =
        documento.id;
    }

    /* ========================================================
       12. GARANTIZAR DOCUMENTO ID
    ======================================================== */

    if (!documentoId) {
      return jsonError(
        "No fue posible determinar el documento definitivo para la publicación.",
        500
      );
    }

    /* ========================================================
       13. DETERMINAR CARPETA GOOGLE DRIVE
    ======================================================== */

    const driveFolderId =
      obtenerGoogleDriveDestinoFolderId(
        destino === "repositorios"
          ? "repositorio"
          : "documentos"
      );

    /* ========================================================
       14. SUBIR ARCHIVO A GOOGLE DRIVE
    ======================================================== */

    /*
     * A partir de aquí el archivo publicado deja de depender
     * de la URL temporal del bucket de Supabase.
     */

    const drive =
      await subirArchivo(
        buffer,
        version.nombre_archivo,
        mimeType,
        driveFolderId
      );

    driveFileId =
      drive.id;

    /* ========================================================
       15. URL DE GOOGLE DRIVE
    ======================================================== */

    /*
     * URL principal para consumo posterior.
     *
     * No utilizamos la URL temporal del Storage.
     */

    const driveDownloadUrl =
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
        drive.id
      )}`;

    const driveUrl =
      driveDownloadUrl ||
      drive.webContentLink ||
      drive.webViewLink ||
      drive.id;

    /* ========================================================
       16. OBTENER SIGUIENTE VERSIÓN DEL DOCUMENTO
    ======================================================== */

    const {
      data: previousVersions,
      error: previousVersionsError,
    } = await supabase
      .from("documentos_versiones")
      .select(
        "id,numero_version"
      )
      .eq(
        "documento_id",
        documentoId
      )
      .order(
        "numero_version",
        {
          ascending: false,
        }
      )
      .limit(1);

    if (previousVersionsError) {
      return jsonError(
        previousVersionsError.message,
        500
      );
    }

    const nextVersion =
      (
        previousVersions?.[0]
          ?.numero_version || 0
      ) + 1;

    /* ========================================================
       17. DESACTIVAR VERSION ANTERIOR
    ======================================================== */

    const {
      error: deactivateVersionError,
    } = await supabase
      .from("documentos_versiones")
      .update({
        es_version_actual:
          false,
      })
      .eq(
        "documento_id",
        documentoId
      )
      .eq(
        "es_version_actual",
        true
      );

    if (deactivateVersionError) {
      return jsonError(
        deactivateVersionError.message,
        500
      );
    }

    /* ========================================================
       18. REGISTRAR VERSIÓN DEFINITIVA
    ======================================================== */

    const {
      data: versionDocumento,
      error: versionDocumentoError,
    } = await supabase
      .from("documentos_versiones")
      .insert({
        documento_id:
          documentoId,

        numero_version:
          nextVersion,

        es_version_actual:
          true,

        nombre_archivo:
          version.nombre_archivo,

        mime_type:
          mimeType,

        tamano_bytes:
          version.tamano_bytes ||
          buffer.length,

        drive_url:
          driveUrl,

        usuario_carga_id:
          actor.profile.id,
      })
      .select(`
        id,
        numero_version,
        nombre_archivo,
        drive_url
      `)
      .single();

    if (
      versionDocumentoError ||
      !versionDocumento
    ) {
      return jsonError(
        versionDocumentoError?.message ||
          "No se pudo registrar la versión definitiva.",
        500
      );
    }

    versionDocumentoId =
      versionDocumento.id;

    const now =
      new Date().toISOString();

    /* ========================================================
       19. PUBLICACIÓN EN DOCUMENTOS
    ======================================================== */

    if (
      destino === "documentos"
    ) {
      const todaEntidad =
        seleccionaTodaEntidad(
          rolesInput
        );

      /*
       * Resolver roles desde la tabla roles.
       */

      const roleIds =
        todaEntidad
          ? []
          : await resolveRoleIds(
              supabase,
              rolesInput
            );

      if (
        !todaEntidad &&
        roleIds.length === 0
      ) {
        return jsonError(
          "Debes seleccionar al menos un rol válido para publicar en Documentos.",
          400
        );
      }

      /* ======================================================
         19.1 DESTINATARIOS
      ====================================================== */

      await supabase
        .from("documentos_destinatarios")
        .delete()
        .eq(
          "documento_id",
          documentoId
        );

      const destinatarios =
        todaEntidad
          ? [
              {
                documento_id:
                  documentoId,

                acceso_toda_entidad:
                  true,

                created_by:
                  actor.profile.id,
              },
            ]
          : roleIds.map(
              (rolId) => ({
                documento_id:
                  documentoId,

                rol_id:
                  rolId,

                acceso_toda_entidad:
                  false,

                created_by:
                  actor.profile.id,
              })
            );

      const {
        error: destError,
      } = await supabase
        .from(
          "documentos_destinatarios"
        )
        .insert(
          destinatarios
        );

      if (destError) {
        return jsonError(
          destError.message,
          500
        );
      }

      /* ======================================================
         19.2 CERRAR PUBLICACIÓN ANTERIOR
      ====================================================== */

      const {
        error: closePublicationError,
      } = await supabase
        .from(
          "documentos_publicaciones"
        )
        .update({
          publicada:
            false,

          fecha_fin:
            now,

          updated_by:
            actor.profile.id,

          updated_at:
            now,
        })
        .eq(
          "documento_id",
          documentoId
        )
        .eq(
          "publicada",
          true
        );

      if (
        closePublicationError
      ) {
        return jsonError(
          closePublicationError.message,
          500
        );
      }

      /* ======================================================
         19.3 GENERAR CÓDIGO DE PUBLICACIÓN
      ====================================================== */

      const codigoPublicacion =
        await generarCodigoPublicacion(
          supabase,
          flujo.tipo_documento_id ||
            "",
          "PB"
        );

      /* ======================================================
         19.4 REGISTRAR PUBLICACIÓN
      ====================================================== */

      const {
        data: publicacion,
        error: publicacionError,
      } = await supabase
        .from(
          "documentos_publicaciones"
        )
        .insert({
          documento_id:
            documentoId,

          codigo_publicacion:
            codigoPublicacion,

          fecha_inicio:
            now,

          publicada:
            true,

          publicada_por:
            actor.profile.id,

          fecha_publicacion:
            now,

          created_by:
            actor.profile.id,
        })
        .select(
          "id,codigo_publicacion"
        )
        .single();

      if (
        publicacionError ||
        !publicacion
      ) {
        return jsonError(
          publicacionError?.message ||
            "No se pudo registrar la publicación.",
          500
        );
      }

      /* ======================================================
         19.5 ACTUALIZAR DOCUMENTO
      ====================================================== */

      const {
        error: docUpdateError,
      } = await supabase
        .from("documentos")
        .update({
          /*
           * IMPORTANTE:
           *
           * Siempre "publico".
           *
           * Los roles NO se almacenan en esta columna.
           */
          visibilidad:
            "publico",

          estado:
            "publicado",

          codigo_publicacion:
            publicacion.codigo_publicacion,

          requiere_publicacion:
            true,

          publicado_en:
            now,

          publicado_por:
            actor.profile.id,

          updated_by:
            actor.profile.id,

          updated_at:
            now,
        })
        .eq(
          "id",
          documentoId
        );

      if (docUpdateError) {
        return jsonError(
          docUpdateError.message,
          500
        );
      }

      /* ======================================================
         19.6 FINALIZAR FLUJO
      ====================================================== */

      const {
        error: flujoUpdateError,
      } = await supabase
        .from("documentos_flujos")
        .update({
          documento_id:
            documentoId,

          /*
           * Usamos el valor exacto permitido por
           * documentos_flujos_destino_final_check.
           */
          destino_final:
            DESTINO_DOCUMENTOS,

          repositorio_id:
            null,

          /*
           * estado_flujo_id permanece en FINALIZADO porque representa
           * el estado terminal del proceso de aprobación. El estado
           * textual pasa a PUBLICADO para cerrar la publicación.
           * listar utiliza este valor para mover el flujo de "creados"
           * a "historial" y para desactivar puede_publicar.
           */
          estado:
            "Publicado",

          updated_by:
            actor.profile.id,

          updated_at:
            now,
        })
        .eq(
          "id",
          flujoId
        );

      if (flujoUpdateError) {
        return jsonError(
          flujoUpdateError.message,
          500
        );
      }

      /* ======================================================
         19.7 AUDITORÍA
      ====================================================== */

      await registrarDocumentoAuditoria({
        documentoId,
        flujoId,
        versionId:
          versionDocumentoId,
        usuarioId:
          actor.profile.id,
        accion:
          "PUBLICACION_DOCUMENTOS",
        descripcion:
          `Flujo ${flujo.numero_flujo} publicado en Documentos.`,
        request,
      });

      /* ======================================================
         19.8 RESPUESTA
      ====================================================== */

      return jsonOk({
        message:
          "Documento publicado correctamente en Documentos.",

        destino:
          "documentos",

        flujo_id:
          flujoId,

        documento_id:
          documentoId,

        codigo_publicacion:
          publicacion.codigo_publicacion,

        version_id:
          versionDocumentoId,

        drive_file_id:
          driveFileId,

        drive_url:
          driveUrl,
      });
    }

    /* ========================================================
       20. PUBLICACIÓN EN REPOSITORIO
    ======================================================== */

    const {
      data: repositorios,
      error: repositorioError,
    } = await supabase
      .from("repositorios")
      .select(
        "id,nombre,descripcion,activo"
      )
      .eq(
        "activo",
        true
      )
      .order(
        "nombre",
        {
          ascending: true,
        }
      );

    if (repositorioError) {
      return jsonError(
        repositorioError.message,
        500
      );
    }

    if (
      !repositorios ||
      repositorios.length !== 1
    ) {
      return jsonError(
        repositorios?.length === 0
          ? "No existe un repositorio activo configurado."
          : "Existe más de un repositorio activo. Debe quedar uno solo para la publicación automática.",
        409
      );
    }

    const repositorioId =
      repositorios[0].id;

    /* ========================================================
       21. CONSECUTIVO REPOSITORIO
    ======================================================== */

    const consecutivo =
      await generarConsecutivoRepositorio(
        supabase
      );

    /* ========================================================
       22. RELACIÓN REPOSITORIO-DOCUMENTO
    ======================================================== */

    const {
      error: relationError,
    } = await supabase
      .from(
        "repositorios_documentos"
      )
      .upsert(
        {
          repositorio_id:
            repositorioId,

          documento_id:
            documentoId,

          created_by:
            actor.profile.id,
        },
        {
          onConflict:
            "repositorio_id,documento_id",
        }
      );

    if (relationError) {
      return jsonError(
        relationError.message,
        500
      );
    }

    /* ========================================================
       23. ACTUALIZAR DOCUMENTO PRIVADO
    ======================================================== */

    const {
      error: privateDocError,
    } = await supabase
      .from("documentos")
      .update({
        estado:
          "privado",

        visibilidad:
          "privado",

        requiere_publicacion:
          false,

        publicado_en:
          null,

        publicado_por:
          null,

        updated_by:
          actor.profile.id,

        updated_at:
          now,
      })
      .eq(
        "id",
        documentoId
      );

    if (privateDocError) {
      return jsonError(
        privateDocError.message,
        500
      );
    }

    /* ========================================================
       24. ACTUALIZAR FLUJO
    ======================================================== */

    const {
      error: repoFlowError,
    } = await supabase
      .from("documentos_flujos")
      .update({
        documento_id:
          documentoId,

        /*
         * Valor exacto permitido por el CHECK.
         */
        destino_final:
          DESTINO_REPOSITORIO,

        repositorio_id:
          repositorioId,

        consecutivo_repositorio_privado:
          consecutivo,

        /*
         * El estado_flujo_id sigue siendo FINALIZADO, mientras que el
         * estado textual indica que la publicación ya fue completada.
         */
        estado:
          "Publicado",

        updated_by:
          actor.profile.id,

        updated_at:
          now,
      })
      .eq(
        "id",
        flujoId
      );

    if (repoFlowError) {
      return jsonError(
        repoFlowError.message,
        500
      );
    }

    /* ========================================================
       25. AUDITORÍA REPOSITORIO
    ======================================================== */

    await registrarDocumentoAuditoria({
      documentoId,
      flujoId,
      versionId:
        versionDocumentoId,
      usuarioId:
        actor.profile.id,
      accion:
        "PUBLICACION_REPOSITORIO",
      descripcion:
        `Flujo ${flujo.numero_flujo} enviado al Repositorio privado ${repositorios[0].nombre}.`,
      request,
    });

    /* ========================================================
       26. RESPUESTA REPOSITORIO
    ======================================================== */

    return jsonOk({
      message:
        "Documento publicado correctamente en el Repositorio.",

      destino:
        "repositorios",

      flujo_id:
        flujoId,

      documento_id:
        documentoId,

      repositorio_id:
        repositorioId,

      consecutivo_repositorio_privado:
        consecutivo,

      version_id:
        versionDocumentoId,

      drive_file_id:
        driveFileId,

      drive_url:
        driveUrl,
    });
  } catch (error: any) {
    console.error(
      "Error en /api/flujos/publicar:",
      error
    );

    return jsonError(
      error?.message ||
        "No fue posible publicar el flujo.",
      500
    );
  }
}