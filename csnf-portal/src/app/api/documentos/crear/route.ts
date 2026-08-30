import {
  supabaseAdmin,
  getProfileFromBearer,
  resolveRoleIds,
  generarCodigoPublicacionManual,
  jsonError,
  jsonOk,
} from "@/lib/document-domain";
import {
  subirArchivoDocumentos,
  construirUrlDrive,
} from "@/lib/google-drive";

function texto(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

function parseBoolean(v: FormDataEntryValue | null) {
  const value = texto(v).toLowerCase();
  return value === "true" || value === "1" || value === "on";
}

export async function POST(request: Request) {
  let driveFileId: string | null = null;
  let documentoId: string | null = null;

  try {
    const actor = await getProfileFromBearer(request);
    if (!actor) return jsonError("Sesión no válida.", 401);

    const form = await request.formData();

    const titulo = texto(form.get("titulo"));
    const descripcion = texto(form.get("descripcion"));
    const fechaDocumento = texto(form.get("fecha_documento"));
    const palabrasClave = texto(form.get("palabras_clave"));
    const observaciones = texto(form.get("observaciones"));
    const tipoDocumentoId = texto(form.get("tipo_documento_id"));
    const archivo = form.get("archivo");
    const accesoTodaEntidad = parseBoolean(form.get("acceso_toda_entidad"));

    if (!titulo) return jsonError("El título es obligatorio.");
    if (!tipoDocumentoId) return jsonError("El tipo de documento es obligatorio.");
    if (!(archivo instanceof File)) return jsonError("Debe adjuntar un archivo.");
    if (archivo.size <= 0) return jsonError("El archivo adjunto está vacío.");

    let rolesEntrada: unknown[] = [];
    const rolesRaw = texto(form.get("roles"));
    if (rolesRaw) {
      try {
        const parsed = JSON.parse(rolesRaw);
        rolesEntrada = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        rolesEntrada = rolesRaw.split(",").map((v) => v.trim()).filter(Boolean);
      }
    }

    const supabase = supabaseAdmin();
    const roleIds = await resolveRoleIds(supabase, rolesEntrada);

    if (!accesoTodaEntidad && roleIds.length === 0) {
      return jsonError("Selecciona al menos un rol o marca 'Todos los roles'.");
    }

    const codigoPublicacion = await generarCodigoPublicacionManual(
      supabase,
      tipoDocumentoId
    );

    const insertDocumento: Record<string, unknown> = {
      codigo_flujo: null,
      codigo_publicacion: codigoPublicacion,
      titulo,
      descripcion: descripcion || null,
      fecha_documento: fechaDocumento || new Date().toISOString().slice(0, 10),
      observaciones: observaciones || null,
      palabras_clave: palabrasClave || null,
      tipo_documento_id: tipoDocumentoId,
      estado_documento_id: null,
      requiere_flujo: false,
      requiere_publicacion: false,
      creador_id: actor.profile.id,
      created_by: actor.profile.id,
      updated_by: actor.profile.id,
      estado: "publicado",
      visibilidad: "publico",
      publicado_en: new Date().toISOString(),
      publicado_por: actor.profile.id,
    };

    const { data: documento, error: documentoError } = await supabase
      .from("documentos")
      .insert(insertDocumento)
      .select("id,codigo_publicacion,titulo")
      .single();

    if (documentoError || !documento) {
      throw new Error(documentoError?.message || "No fue posible crear el documento.");
    }

    documentoId = documento.id;

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const drive = await subirArchivoDocumentos(
      buffer,
      archivo.name,
      archivo.type || "application/octet-stream"
    );
    driveFileId = drive.id;

    const driveUrl = drive.driveUrl || construirUrlDrive(drive.id, "view");

    const { error: versionError } = await supabase
      .from("documentos_versiones")
      .insert({
        documento_id: documento.id,
        numero_version: 1,
        es_version_actual: true,
        nombre_archivo: archivo.name,
        mime_type: archivo.type || "application/octet-stream",
        tamano_bytes: archivo.size,
        drive_url: driveUrl,
        usuario_carga_id: actor.profile.id,
      });

    if (versionError) throw new Error(versionError.message);

    const destinatarios: Record<string, unknown>[] = [];
    if (accesoTodaEntidad) {
      destinatarios.push({
        documento_id: documento.id,
        rol_id: null,
        acceso_toda_entidad: true,
      });
    } else {
      for (const rolId of roleIds) {
        destinatarios.push({
          documento_id: documento.id,
          rol_id: rolId,
          acceso_toda_entidad: false,
        });
      }
    }

    if (destinatarios.length) {
      const { error: destinatariosError } = await supabase
        .from("documentos_destinatarios")
        .insert(destinatarios);
      if (destinatariosError) throw new Error(destinatariosError.message);
    }

    const { error: publicacionError } = await supabase
      .from("documentos_publicaciones")
      .insert({
        documento_id: documento.id,
        codigo_publicacion: codigoPublicacion,
        publicada: true,
        publicada_por: actor.profile.id,
        fecha_publicacion: new Date().toISOString(),
        fecha_inicio: new Date().toISOString(),
        observaciones: observaciones || null,
      });

    if (publicacionError) throw new Error(publicacionError.message);

    return jsonOk({
      message: "Documento creado y publicado correctamente.",
      documento: {
        id: documento.id,
        codigo_publicacion: codigoPublicacion,
        drive_url: driveUrl,
      },
    });
  } catch (error: any) {
    if (documentoId) {
      try {
        const supabase = supabaseAdmin();
        await supabase.from("documentos_versiones").delete().eq("documento_id", documentoId);
        await supabase.from("documentos_destinatarios").delete().eq("documento_id", documentoId);
        await supabase.from("documentos_publicaciones").delete().eq("documento_id", documentoId);
        await supabase.from("documentos").delete().eq("id", documentoId);
      } catch (rollbackError) {
        console.error("Error haciendo rollback del documento manual:", rollbackError);
      }
    }

    if (driveFileId) {
      try {
        const { eliminarArchivo } = await import("@/lib/google-drive");
        await eliminarArchivo(driveFileId);
      } catch (driveError) {
        console.error("No fue posible eliminar archivo huérfano de Drive:", driveError);
      }
    }

    return jsonError(error?.message || "No fue posible crear el documento.", 500);
  }
}