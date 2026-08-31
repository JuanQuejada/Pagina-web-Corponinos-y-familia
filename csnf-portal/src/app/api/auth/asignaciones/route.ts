import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function errorRespuesta(error: string, status = 500) {
  return NextResponse.json({ success: false, error }, { status });
}

function obtenerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * GET /api/auth/asignaciones
 *
 * Fuente de verdad para el selector de perfiles.
 * Devuelve TODAS las asignaciones activas de la persona autenticada.
 */
export async function GET(request: NextRequest) {
  try {
    const token = obtenerToken(request);
    if (!token) return errorRespuesta("No se proporcionó token de autenticación.", 401);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return errorRespuesta("Sesión inválida o expirada.", 401);
    }

    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .select(`
        id,
        auth_user_id,
        email,
        tipo_persona_id,
        tipo_identificacion_id,
        numero_identificacion,
        nombres,
        apellidos,
        razon_social,
        telefono,
        direccion,
        estado_usuario_id,
        fecha_ingreso,
        fecha_retiro,
        foto_url,
        cargo_id,
        clave_repositorio,
        puede_iniciar_flujos,
        tipoPersona:tipos_persona(id,codigo,nombre,activo),
        tipoIdentificacion:tipos_identificacion(id,codigo,nombre,activo),
        estadoUsuario:estados_usuario(id,codigo,nombre,activo)
      `)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuarioError) {
      console.error("Error consultando usuario portal:", usuarioError);
      return errorRespuesta("No fue posible obtener el usuario del portal.", 500);
    }

    if (!usuario) {
      return errorRespuesta("El usuario autenticado no está registrado en el portal.", 404);
    }

    const { data: asignaciones, error: asignacionesError } = await supabaseAdmin
      .from("usuarios_asignaciones")
      .select(`
        id,
        usuario_id,
        cargo_id,
        rol_id,
        fecha_inicio,
        fecha_fin,
        activo,
        perfil_predeterminado,
        rol:roles(
          id,
          codigo,
          nombre,
          nivel,
          activo
        ),
        cargo:cargos(
          id,
          codigo,
          nombre,
          departamento_id,
          activo,
          departamento:departamentos(
            id,
            codigo,
            nombre,
            activo,
            area:areas(
              id,
              codigo,
              nombre,
              activo
            )
          )
        )
      `)
      .eq("usuario_id", usuario.id)
      .eq("activo", true)
      .order("perfil_predeterminado", { ascending: false })
      .order("fecha_inicio", { ascending: false });

    if (asignacionesError) {
      console.error("Error consultando asignaciones:", asignacionesError);
      return errorRespuesta("No fue posible obtener las asignaciones del usuario.", 500);
    }

    const asignacionesValidas = (asignaciones || []).filter(
      (asignacion: any) =>
        asignacion.activo === true &&
        asignacion.cargo?.activo !== false &&
        asignacion.rol?.activo !== false
    );

    return NextResponse.json({
      success: true,
      usuario,
      asignaciones: asignacionesValidas,
      total_asignaciones: asignacionesValidas.length,
      requiere_seleccion_perfil: asignacionesValidas.length > 1,
    });
  } catch (error: any) {
    console.error("GET /api/auth/asignaciones:", error);
    return errorRespuesta(error?.message || "Error interno del servidor.", 500);
  }
}
