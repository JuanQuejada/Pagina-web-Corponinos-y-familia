import {
  supabaseAdmin,
  getProfileFromBearer,
  registrarDocumentoAuditoria,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getProfileFromBearer(request);
    if (!actor) return jsonError("Sesión no válida.", 401);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const motivo = String(body?.motivo || "").trim();
    if (!motivo) return jsonError("Debes indicar el motivo del retiro.");

    const supabase = supabaseAdmin();
    const { data: doc } = await supabase
      .from("documentos")
      .select("id,creador_id")
      .eq("id", id)
      .single();

    if (!doc) return jsonError("Documento no encontrado.", 404);
    if (doc.creador_id !== actor.profile.id) return jsonError("No tienes permiso para retirar este documento.", 403);

    const now = new Date().toISOString();
    const { data: publication, error } = await supabase
      .from("documentos_publicaciones")
      .update({
        publicada: false,
        fecha_fin: now,
        retirada_por: actor.profile.id,
        fecha_retiro: now,
        motivo_retiro: motivo,
        updated_by: actor.profile.id,
        updated_at: now,
      })
      .eq("documento_id", id)
      .eq("publicada", true)
      .select("id,codigo_publicacion")
      .maybeSingle();

    if (error) return jsonError(error.message, 500);
    if (!publication) return jsonError("El documento no tiene una publicación pública activa.", 409);

    await supabase
      .from("documentos")
      .update({
        publicado_en: null,
        updated_by: actor.profile.id,
        updated_at: now,
      })
      .eq("id", id);

    await registrarDocumentoAuditoria({
      documentoId: id,
      usuarioId: actor.profile.id,
      accion: "RETIRO_PUBLICACION",
      descripcion: motivo,
      request,
    });

    return jsonOk({ publicacion: publication });
  } catch (error: any) {
    return jsonError(error?.message || "No fue posible retirar el documento.", 500);
  }
}
