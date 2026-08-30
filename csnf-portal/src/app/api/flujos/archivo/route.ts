import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { obtenerArchivo } from "@/lib/google-drive";
import { extraerDriveFileId } from "@/lib/document-domain";

const BUCKET_FLUJOS = "documentos";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * /api/flujos/archivo
 *
 * Regla de almacenamiento:
 *
 * 1. Mientras el flujo no está publicado, el archivo vive en
 *    Supabase Storage y se devuelve una URL firmada temporal.
 *
 * 2. Cuando el flujo ya fue publicado, documentos_versiones.drive_url
 *    es la referencia definitiva. En ese caso NO se utiliza nuevamente
 *    la URL del bucket para el consumo del documento.
 *
 * Esto permite que el mismo endpoint funcione para:
 * - Bandeja
 * - Mis Flujos Creados
 * - Historial
 * - Flujo ya publicado en Documentos
 * - Flujo ya publicado en Repositorio
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const flujoId = searchParams.get("flujo_id")?.trim() || "";
    const versionId = searchParams.get("version_id")?.trim() || "";

    if (!flujoId) {
      return NextResponse.json(
        {
          success: false,
          error: "El parámetro flujo_id es obligatorio.",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    const { data: flujo, error: flujoError } = await supabase
      .from("documentos_flujos")
      .select(`
        id,
        numero_flujo,
        estado,
        documento_id,
        destino_final
      `)
      .eq("id", flujoId)
      .maybeSingle();

    if (flujoError) {
      console.error("Error consultando flujo:", flujoError);
      return NextResponse.json(
        {
          success: false,
          error: "No fue posible consultar el flujo.",
          detalle: flujoError.message,
        },
        { status: 500 }
      );
    }

    if (!flujo) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró el flujo solicitado.",
        },
        { status: 404 }
      );
    }

    // ============================================================
    // 1. DOCUMENTO PUBLICADO: GOOGLE DRIVE ES LA FUENTE DEFINITIVA
    // ============================================================

    if (flujo.documento_id) {
      const { data: documentoVersiones, error: documentoVersionError } =
        await supabase
          .from("documentos_versiones")
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
          .eq("documento_id", flujo.documento_id)
          .order("numero_version", { ascending: false });

      if (documentoVersionError) {
        console.error(
          "Error consultando versión documental definitiva:",
          documentoVersionError
        );
      } else {
        const versionDrive =
          (versionId
            ? documentoVersiones?.find((v: any) => v.id === versionId)
            : null) ||
          documentoVersiones?.find((v: any) => v.es_version_actual === true) ||
          documentoVersiones?.find((v: any) => !!v.drive_url);

        if (versionDrive?.drive_url) {
          const driveFileId = extraerDriveFileId(versionDrive.drive_url);

          try {
            const metadata = await obtenerArchivo(driveFileId);
            const downloadUrl =
              `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
                driveFileId
              )}`;

            return NextResponse.json({
              success: true,
              fuente: "google_drive",
              flujo: {
                id: flujo.id,
                numero_flujo: flujo.numero_flujo,
                estado: flujo.estado,
                documento_id: flujo.documento_id,
                destino_final: flujo.destino_final,
              },
              archivo: {
                version_id: versionDrive.id,
                flujo_id: flujo.id,
                documento_id: flujo.documento_id,
                numero_version: versionDrive.numero_version,
                es_version_actual: versionDrive.es_version_actual,
                nombre_archivo:
                  versionDrive.nombre_archivo || metadata.name || "documento",
                mime_type:
                  versionDrive.mime_type || metadata.mimeType || "application/octet-stream",
                tamano_bytes:
                  versionDrive.tamano_bytes ||
                  (metadata.size ? Number(metadata.size) : null),
                drive_file_id: driveFileId,
                drive_url: versionDrive.drive_url,
                download_url: downloadUrl,
                web_view_url: metadata.webViewLink || versionDrive.drive_url,
                storage_path: null,
                usuario_carga_id: versionDrive.usuario_carga_id,
                created_at: versionDrive.created_at,
                es_publicado: true,
              },
            });
          } catch (driveError: any) {
            console.error(
              "No fue posible validar el archivo definitivo de Google Drive:",
              driveError
            );

            return NextResponse.json(
              {
                success: false,
                error:
                  "El flujo está publicado, pero no fue posible acceder al archivo definitivo de Google Drive.",
                detalle: driveError?.message || null,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // ============================================================
    // 2. FLUJO NO PUBLICADO: SUPABASE STORAGE TEMPORAL
    // ============================================================

    let version: any = null;

    if (versionId) {
      const { data, error } = await supabase
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
        .eq("id", versionId)
        .eq("flujo_id", flujoId)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "No fue posible consultar la versión del flujo.",
            detalle: error.message,
          },
          { status: 500 }
        );
      }

      version = data;
    }

    if (!version) {
      const { data, error } = await supabase
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
        .eq("flujo_id", flujoId)
        .eq("es_version_actual", true)
        .order("numero_version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "No fue posible consultar la versión actual del flujo.",
            detalle: error.message,
          },
          { status: 500 }
        );
      }

      version = data;
    }

    if (!version) {
      const { data, error } = await supabase
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
        .eq("flujo_id", flujoId)
        .order("numero_version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "No fue posible consultar las versiones del flujo.",
            detalle: error.message,
          },
          { status: 500 }
        );
      }

      version = data;
    }

    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: "No hay información del documento disponible para este flujo.",
        },
        { status: 404 }
      );
    }

    const storagePath = String(version.storage_path || "").trim();

    if (!storagePath) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La versión del flujo no tiene una ubicación de archivo temporal registrada.",
        },
        { status: 404 }
      );
    }

    const lastSlash = storagePath.lastIndexOf("/");
    const storageFolder =
      lastSlash >= 0 ? storagePath.substring(0, lastSlash) : "";
    const storageFile =
      lastSlash >= 0 ? storagePath.substring(lastSlash + 1) : storagePath;

    const { data: archivosStorage, error: storageListError } = await supabase.storage
      .from(BUCKET_FLUJOS)
      .list(storageFolder, {
        limit: 100,
        search: storageFile,
      });

    if (storageListError) {
      return NextResponse.json(
        {
          success: false,
          error: "No fue posible verificar el archivo temporal almacenado.",
          detalle: storageListError.message,
        },
        { status: 500 }
      );
    }

    const archivoExiste = (archivosStorage || []).some(
      (archivo) => archivo.name === storageFile
    );

    if (!archivoExiste) {
      return NextResponse.json(
        {
          success: false,
          error: "El archivo temporal no fue encontrado en Storage.",
          storage_path: storagePath,
        },
        { status: 404 }
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_FLUJOS)
      .createSignedUrl(storagePath, 60 * 5);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            signedUrlError?.message ||
            "No fue posible generar el acceso temporal al archivo.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fuente: "supabase_storage_temporal",
      flujo: {
        id: flujo.id,
        numero_flujo: flujo.numero_flujo,
        estado: flujo.estado,
        documento_id: flujo.documento_id,
        destino_final: flujo.destino_final,
      },
      archivo: {
        version_id: version.id,
        flujo_id: version.flujo_id,
        numero_version: version.numero_version,
        es_version_actual: version.es_version_actual,
        nombre_archivo: version.nombre_archivo,
        mime_type: version.mime_type,
        tamano_bytes: version.tamano_bytes,
        storage_path: storagePath,
        usuario_carga_id: version.usuario_carga_id,
        created_at: version.created_at,
        url: signedUrlData.signedUrl,
        expires_in: 300,
        es_publicado: false,
      },
    });
  } catch (error: any) {
    console.error("Error inesperado en /api/flujos/archivo:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}