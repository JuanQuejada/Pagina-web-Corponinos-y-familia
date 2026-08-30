import { NextRequest } from "next/server";
import {
  supabaseAdmin,
  getProfileFromBearer,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

export async function GET(request: NextRequest) {
  try {
    const actor = await getProfileFromBearer(request);

    if (!actor) {
      return jsonError("Sesión no válida.", 401);
    }

    const supabase = supabaseAdmin();

    const [
      tiposPersonaR,
      tiposIdentificacionR,
      departamentosR,
      cargosR,
      estadosUsuarioR,
      rolesR,
    ] = await Promise.all([
      supabase
        .from("tipos_persona")
        .select("id,codigo,nombre,activo")
        .eq("activo", true)
        .order("nombre"),

      supabase
        .from("tipos_identificacion")
        .select(
          "id,codigo,nombre,activo,tipo_persona_id"
        )
        .eq("activo", true)
        .order("nombre"),

      supabase
        .from("departamentos")
        .select(
          "id,codigo,nombre,activo,orden"
        )
        .eq("activo", true)
        .order("orden", {
          ascending: true,
          nullsFirst: false,
        })
        .order("nombre"),

      supabase
        .from("cargos")
        .select(
          "id,codigo,nombre,departamento_id,activo,orden"
        )
        .eq("activo", true)
        .order("orden", {
          ascending: true,
          nullsFirst: false,
        })
        .order("nombre"),

      supabase
        .from("estados_usuario")
        .select(
          "id,codigo,nombre,activo"
        )
        .eq("activo", true)
        .order("nombre"),

      supabase
        .from("roles")
        .select(
          "id,codigo,nombre,nivel,activo"
        )
        .eq("activo", true)
        .order("nivel", {
          ascending: true,
          nullsFirst: false,
        })
        .order("nombre"),
    ]);

    const errores = [
      tiposPersonaR.error,
      tiposIdentificacionR.error,
      departamentosR.error,
      cargosR.error,
      estadosUsuarioR.error,
      rolesR.error,
    ].filter(Boolean);

    if (errores.length > 0) {
      return jsonError(
        errores[0]?.message ||
          "No fue posible cargar los catálogos.",
        500
      );
    }

    return jsonOk({
      tiposPersona:
        tiposPersonaR.data || [],

      tiposIdentificacion:
        tiposIdentificacionR.data || [],

      departamentos:
        departamentosR.data || [],

      cargos:
        cargosR.data || [],

      estadosUsuario:
        estadosUsuarioR.data || [],

      roles:
        rolesR.data || [],
    });
  } catch (error: any) {
    console.error(
      "GET /api/usuarios/catalogo:",
      error
    );

    return jsonError(
      error?.message ||
        "No fue posible cargar los catálogos.",
      500
    );
  }
}