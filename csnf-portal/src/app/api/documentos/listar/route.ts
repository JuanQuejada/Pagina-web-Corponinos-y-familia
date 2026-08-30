import {
  supabaseAdmin,
  getProfileFromBearer,
  getUserRoleIds,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

export async function GET(request: Request) {
  try {
    const actor = await getProfileFromBearer(request);
    if (!actor) return jsonError("Sesión no válida.", 401);

    const supabase = supabaseAdmin();
    const roleIds = await getUserRoleIds(supabase, actor.profile.id);

    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id,nombre,activo")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (rolesError) return jsonError(rolesError.message, 500);

    const { data, error } = await supabase
      .from("documentos")
      .select(`
        id,titulo,descripcion,codigo_flujo,codigo_publicacion,fecha_documento,
        observaciones,palabras_clave,tipo_documento_id,estado_documento_id,
        creador_id,created_by,updated_by,created_at,updated_at,visibilidad,estado,
        requiere_flujo,requiere_publicacion,publicado_en,publicado_por,
        tipos_documento(id,nombre,codigo),
        documentos_versiones(id,documento_id,numero_version,es_version_actual,
          nombre_archivo,mime_type,tamano_bytes,drive_url,usuario_carga_id,created_at),
        documentos_destinatarios(id,rol_id,acceso_toda_entidad),
        documentos_publicaciones!inner(id,codigo_publicacion,publicada,publicada_por,
          fecha_inicio,fecha_publicacion,fecha_fin,observaciones)
      `)
      .eq("documentos_publicaciones.publicada", true)
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);

    const documentos = (data || [])
      .filter((doc: any) => {
        const destinations = Array.isArray(doc.documentos_destinatarios)
          ? doc.documentos_destinatarios
          : [];
        // acceso_toda_entidad permite acceso general; de lo contrario,
        // basta con que el usuario posea uno de los roles autorizados.
        return destinations.some(
          (d: any) =>
            d.acceso_toda_entidad === true ||
            (!!d.rol_id && roleIds.includes(d.rol_id))
        );
      })
      .map((doc: any) => {
        const version =
          (doc.documentos_versiones || []).find((v: any) => v.es_version_actual) ||
          (doc.documentos_versiones || [])[0] || null;
        const publication =
          (doc.documentos_publicaciones || []).find((p: any) => p.publicada) || null;

        return {
          ...doc,
          origen: doc.codigo_flujo ? "flujo" : "manual",
          es_publicacion_manual: !doc.codigo_flujo,
          es_publicacion_flujo: Boolean(doc.codigo_flujo),
          version_actual: version,
          publicacion_activa: publication,
          roles_disponibles: roles || [],
          documentos_versiones: undefined,
          documentos_destinatarios: undefined,
          documentos_publicaciones: undefined,
        };
      });

    return jsonOk({
      documentos,
      roles: roles || [],
      usuario_id: actor.profile.id,
    });
  } catch (error: any) {
    return jsonError(
      error?.message || "No fue posible listar los documentos.",
      500
    );
  }
}