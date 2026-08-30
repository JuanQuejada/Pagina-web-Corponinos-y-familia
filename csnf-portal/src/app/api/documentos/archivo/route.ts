import {
  descargarArchivo,
  obtenerArchivo,
  obtenerDriveFileId,
} from "@/lib/google-drive";
import {
  supabaseAdmin,
  getProfileFromBearer,
  getUserRoleIds,
  extraerDriveFileId,
  jsonError,
} from "@/lib/document-domain";

export async function GET(request: Request) {
  try {
    const actor = await getProfileFromBearer(request);
    if (!actor) return jsonError("Sesión no válida.", 401);

    const id = String(new URL(request.url).searchParams.get("id") || "").trim();
    if (!id) return jsonError("Falta el id del documento.");

    const supabase = supabaseAdmin();
    const roleIds = await getUserRoleIds(supabase, actor.profile.id);

    const { data: doc, error } = await supabase
      .from("documentos")
      .select(`
        id,titulo,
        documentos_versiones(id,nombre_archivo,mime_type,tamano_bytes,drive_url,es_version_actual),
        documentos_destinatarios(rol_id,acceso_toda_entidad),
        documentos_publicaciones!inner(publicada)
      `)
      .eq("id", id)
      .eq("documentos_publicaciones.publicada", true)
      .maybeSingle();

    if (error || !doc) return jsonError("Documento publicado no encontrado.", 404);

    const permitido = (doc.documentos_destinatarios || []).some(
      (d: any) =>
        d.acceso_toda_entidad === true ||
        (d.rol_id && roleIds.includes(d.rol_id))
    );
    if (!permitido) return jsonError("No tienes acceso a este documento.", 403);

    const version =
      (doc.documentos_versiones || []).find((v: any) => v.es_version_actual) ||
      (doc.documentos_versiones || [])[0] || null;

    if (!version?.drive_url) return jsonError("El documento no tiene archivo en Google Drive.", 404);

    const fileId = obtenerDriveFileId(extraerDriveFileId(version.drive_url));
    if (!fileId) return jsonError("No fue posible identificar el archivo de Google Drive.", 404);

    const metadata = await obtenerArchivo(fileId);
    const buffer = await descargarArchivo(fileId);

    return new Response(buffer as any, {
      headers: {
        "Content-Type": metadata.mimeType || version.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          version.nombre_archivo || metadata.name || doc.titulo || "documento"
        )}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return jsonError(
      error?.message || "No fue posible descargar el documento.",
      500
    );
  }
}