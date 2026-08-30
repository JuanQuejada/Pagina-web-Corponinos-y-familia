import {
  supabaseAdmin,
  getProfileFromBearer,
  resolveRoleIds,
  generarCodigoPublicacion,
  guardarBufferDrive,
  registrarDocumentoAuditoria,
  eliminarDriveSeguro,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

export async function POST(request: Request) {
  let driveFileId: string | null = null;
  try {
    const actor = await getProfileFromBearer(request);
    if (!actor) return jsonError("Sesión no válida.", 401);

    const form = await request.formData();
    const titulo = String(form.get("titulo") || "").trim();
    const descripcion = String(form.get("descripcion") || "").trim();
    const tipoDocumentoId = String(form.get("tipo_documento_id") || "").trim();
    const fechaDocumento = String(form.get("fecha_documento") || "").trim();
    const palabrasClave = String(form.get("palabras_clave") || "").trim();
    const alcance = String(form.get("alcance") || "roles").trim().toLowerCase();
    const rolesRaw = String(form.get("roles") || "[]");
    const file = form.get("archivo");

    if (!titulo || !tipoDocumentoId || !fechaDocumento) return jsonError("Faltan título, tipo_documento_id o fecha_documento.");
    if (!(file instanceof File) || file.size === 0) return jsonError("Debes seleccionar un archivo.");
    if (file.size > 25 * 1024 * 1024) return jsonError("El archivo no puede superar 25 MB.");

    let roles: unknown[] = [];
    try { roles = JSON.parse(rolesRaw); } catch { return jsonError("El campo roles no tiene un formato válido."); }

    const supabase = supabaseAdmin();
    const todaEntidad = alcance === "toda_entidad" || roles.some((v) => String(v).toLowerCase() === "todos los roles");
    const roleIds = todaEntidad ? [] : await resolveRoleIds(supabase, roles);
    if (!todaEntidad && roleIds.length === 0) return jsonError("Debes seleccionar al menos un rol válido.");

    const codigoPublicacion = await generarCodigoPublicacion(supabase, tipoDocumentoId, "PB");
    const buffer = Buffer.from(await file.arrayBuffer());
    const drive = await guardarBufferDrive(buffer, file.name, file.type || "application/octet-stream", tipoDocumentoId);
    driveFileId = drive.id;
    const now = new Date().toISOString();

    const { data: documento, error: documentoError } = await supabase
      .from("documentos")
      .insert({
        codigo_publicacion: codigoPublicacion,
        titulo,
        descripcion: descripcion || null,
        fecha_documento: fechaDocumento,
        palabras_clave: palabrasClave || null,
        tipo_documento_id: tipoDocumentoId,
        requiere_flujo: false,
        requiere_publicacion: true,
        creador_id: actor.profile.id,
        created_by: actor.profile.id,
        estado: "publicado",
        visibilidad: todaEntidad ? "publico" : "roles",
        publicado_en: now,
        publicado_por: actor.profile.id,
      })
      .select("id")
      .single();

    if (documentoError || !documento) throw new Error(documentoError?.message || "No se creó el documento.");

    const { data: version, error: versionError } = await supabase
      .from("documentos_versiones")
      .insert({
        documento_id: documento.id,
        numero_version: 1,
        es_version_actual: true,
        nombre_archivo: file.name,
        mime_type: file.type || "application/octet-stream",
        tamano_bytes: file.size,
        drive_url: drive.webViewLink || drive.webContentLink || drive.id,
        usuario_carga_id: actor.profile.id,
      })
      .select("id")
      .single();

    if (versionError || !version) throw new Error(versionError?.message || "No se registró la versión.");

    const destinatarios = todaEntidad
      ? [{ documento_id: documento.id, acceso_toda_entidad: true, created_by: actor.profile.id }]
      : roleIds.map((rolId) => ({ documento_id: documento.id, rol_id: rolId, acceso_toda_entidad: false, created_by: actor.profile.id }));

    const { error: destinationError } = await supabase.from("documentos_destinatarios").insert(destinatarios);
    if (destinationError) throw new Error(destinationError.message);

    const { data: publication, error: publicationError } = await supabase
      .from("documentos_publicaciones")
      .insert({
        documento_id: documento.id,
        codigo_publicacion: codigoPublicacion,
        fecha_inicio: now,
        publicada: true,
        publicada_por: actor.profile.id,
        fecha_publicacion: now,
        created_by: actor.profile.id,
      })
      .select("id,codigo_publicacion")
      .single();

    if (publicationError || !publication) throw new Error(publicationError?.message || "No se registró la publicación.");

    await registrarDocumentoAuditoria({
      documentoId: documento.id,
      versionId: version.id,
      usuarioId: actor.profile.id,
      accion: "CREACION_PUBLICACION_DOCUMENTOS",
      descripcion: "Documento publicado directamente en el módulo Documentos.",
      request,
    });

    return jsonOk({ documento_id: documento.id, codigo_publicacion: codigoPublicacion, publicacion: publication });
  } catch (error: any) {
    await eliminarDriveSeguro(driveFileId);
    return jsonError(error?.message || "No fue posible publicar el documento.", 500);
  }
}
