import { descargarArchivo, obtenerArchivo } from "@/lib/google-drive";
import { supabaseAdmin, extraerDriveFileId, jsonError } from "@/lib/document-domain";
import { getRepositoryTokenFromRequest, verifyRepositoryToken } from "@/lib/repository-session";

export async function GET(request: Request) {
  try {
    const session = verifyRepositoryToken(getRepositoryTokenFromRequest(request));
    if (!session) return jsonError("Repositorio bloqueado o sesión expirada.", 401);

    const id = String(new URL(request.url).searchParams.get("id") || "").trim();
    if (!id) return jsonError("Falta el documento.");

    const supabase = supabaseAdmin();
    const { data: relation } = await supabase
      .from("repositorios_documentos")
      .select("documento_id,repositorios!inner(id,activo)")
      .eq("documento_id", id)
      .eq("repositorios.activo", true)
      .limit(1)
      .maybeSingle();

    if (!relation) return jsonError("Documento no pertenece a un repositorio activo.", 403);

    const { data: doc, error } = await supabase
      .from("documentos")
      .select("id,titulo,documentos_versiones(nombre_archivo,mime_type,drive_url,es_version_actual)")
      .eq("id", id)
      .single();

    if (error || !doc) return jsonError("Documento no encontrado.", 404);

    const version =
      (doc.documentos_versiones || []).find((v: any) => v.es_version_actual) ||
      doc.documentos_versiones?.[0];
    if (!version?.drive_url) return jsonError("El documento no tiene archivo.", 404);

    const fileId = extraerDriveFileId(version.drive_url);
    const metadata = await obtenerArchivo(fileId);
    const buffer = await descargarArchivo(fileId);

    return new Response(buffer as any, {
      headers: {
        "Content-Type": metadata.mimeType || version.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(version.nombre_archivo || metadata.name || doc.titulo || "documento")}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return jsonError(error?.message || "No fue posible descargar el documento.", 500);
  }
}