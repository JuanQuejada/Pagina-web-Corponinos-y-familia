import { supabaseAdmin, jsonOk, jsonError } from "@/lib/document-domain";
import { getRepositoryTokenFromRequest, verifyRepositoryToken } from "@/lib/repository-session";

export async function GET(request: Request) {
  try {
    const session = verifyRepositoryToken(getRepositoryTokenFromRequest(request));
    if (!session) return jsonError("Repositorio bloqueado o sesión expirada.", 401);

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("repositorios_documentos")
      .select(`
        id,repositorio_id,documento_id,created_at,
        repositorios!inner(id,nombre,descripcion,activo),
        documentos!inner(
          id,titulo,descripcion,fecha_documento,codigo_flujo,codigo_publicacion,
          tipo_documento_id,created_at,estado,visibilidad,
          tipos_documento(id,nombre,codigo),
          documentos_versiones(id,numero_version,es_version_actual,nombre_archivo,mime_type,tamano_bytes,created_at)
        )
      `)
      .eq("repositorios.activo", true)
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);

    const documentos = (data || []).map((row: any) => ({
      ...row,
      documentos: {
        ...row.documentos,
        version_actual:
          (row.documentos?.documentos_versiones || []).find((v: any) => v.es_version_actual) ||
          row.documentos?.documentos_versiones?.[0] || null,
        documentos_versiones: undefined,
      },
    }));

    return jsonOk({ documentos, session_profile_id: session.profileId });
  } catch (error: any) {
    return jsonError(error?.message || "No fue posible cargar el repositorio.", 500);
  }
}
