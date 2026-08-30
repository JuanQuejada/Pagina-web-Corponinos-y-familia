import {
  supabaseAdmin,
  getProfileFromBearer,
  obtenerDocumentoCompleto,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getProfileFromBearer(request);
    if (!actor) return jsonError("Sesión no válida.", 401);

    const { id } = await params;
    const documento = await obtenerDocumentoCompleto(id);

    if (documento.creador_id !== actor.profile.id) {
      // La lista pública ya aplica visibilidad; el detalle también debe hacerlo.
      const supabase = supabaseAdmin();
      const roleIds = await (async () => {
        const { data } = await supabase
          .from("usuarios_asignaciones")
          .select("rol_id")
          .eq("usuario_id", actor.profile.id)
          .eq("activo", true);
        return (data || []).map((x: any) => x.rol_id).filter(Boolean);
      })();

      const permitido = (documento.documentos_destinatarios || []).some(
        (d: any) => d.acceso_toda_entidad === true || (d.rol_id && roleIds.includes(d.rol_id))
      );
      if (!permitido) return jsonError("No tienes acceso a este documento.", 403);
    }

    return jsonOk({ documento });
  } catch (error: any) {
    return jsonError(error?.message || "Documento no encontrado.", 404);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getProfileFromBearer(request);
    if (!actor) return jsonError("Sesión no válida.", 401);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const allowed = ["titulo", "descripcion", "fecha_documento", "observaciones", "palabras_clave"];
    const update: Record<string, unknown> = {};

    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }
    if (!Object.keys(update).length) return jsonError("No hay campos para actualizar.");

    const supabase = supabaseAdmin();
    const { data: current, error: currentError } = await supabase
      .from("documentos")
      .select("id,creador_id")
      .eq("id", id)
      .single();

    if (currentError || !current) return jsonError("Documento no encontrado.", 404);
    if (current.creador_id !== actor.profile.id) return jsonError("No tienes permiso para modificar este documento.", 403);

    update.updated_by = actor.profile.id;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("documentos")
      .update(update)
      .eq("id", id)
      .select("id,titulo,descripcion,fecha_documento,observaciones,palabras_clave,updated_at")
      .single();

    if (error) return jsonError(error.message, 500);
    return jsonOk({ documento: data });
  } catch (error: any) {
    return jsonError(error?.message || "No fue posible actualizar el documento.", 500);
  }
}
