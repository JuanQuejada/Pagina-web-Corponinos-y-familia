import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function errorRespuesta(
  error: string,
  status = 500,
  detalle?: string
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(detalle ? { detalle } : {}),
    },
    { status }
  );
}

// ============================================================
// GET /api/organizacion/cargos/[id]/usuarios
//
// MULTICARGOS:
// Los usuarios ya no se obtienen desde usuarios.cargo_id porque
// esa columna representa únicamente el cargo predeterminado.
// La fuente de verdad es usuarios_asignaciones.
//
// Se devuelve una fila por asignación activa. Por tanto, si una
// persona tiene dos asignaciones activas para el mismo cargo con
// roles diferentes, ambas quedan visibles.
// ============================================================

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return errorRespuesta(
        "El ID del cargo es obligatorio.",
        400
      );
    }

    // ----------------------------------------------------------
    // Verificar que el cargo exista
    // ----------------------------------------------------------

    const { data: cargo, error: cargoError } = await supabase
      .from("cargos")
      .select("id, codigo, nombre, activo, departamento_id")
      .eq("id", id)
      .maybeSingle();

    if (cargoError) {
      console.error(
        "Error verificando cargo en GET /cargos/[id]/usuarios:",
        cargoError
      );

      return errorRespuesta(
        "No se pudo verificar el cargo.",
        500,
        cargoError.message
      );
    }

    if (!cargo) {
      return errorRespuesta(
        "El cargo no existe.",
        404
      );
    }

    // ----------------------------------------------------------
    // Obtener asignaciones activas del cargo
    // ----------------------------------------------------------

    const { data: asignaciones, error: asignacionesError } =
      await supabase
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
        .eq("cargo_id", id)
        .eq("activo", true)
        .order("fecha_inicio", {
          ascending: true,
        });

    if (asignacionesError) {
      console.error(
        "Error obteniendo asignaciones del cargo:",
        asignacionesError
      );

      return errorRespuesta(
        "No se pudieron cargar las asignaciones del cargo.",
        500,
        asignacionesError.message
      );
    }

    const asignacionesValidas = (asignaciones || []).filter(
      (asignacion: any) =>
        asignacion.activo === true &&
        asignacion.cargo?.activo !== false &&
        asignacion.rol?.activo !== false
    );

    // ----------------------------------------------------------
    // Obtener usuarios correspondientes
    // ----------------------------------------------------------

    const usuarioIds = [
      ...new Set(
        asignacionesValidas
          .map((a: any) => a.usuario_id)
          .filter(Boolean)
      ),
    ];

    let usuarios: any[] = [];

    if (usuarioIds.length > 0) {
      const { data, error: usuariosError } = await supabase
        .from("usuarios")
        .select(`
          id,
          auth_user_id,
          nombres,
          apellidos,
          razon_social,
          email,
          numero_identificacion,
          telefono,
          foto_url,
          estado_usuario_id,
          estado_usuario:estados_usuario(
            id,
            codigo,
            nombre,
            activo
          )
        `)
        .in("id", usuarioIds);

      if (usuariosError) {
        console.error(
          "Error obteniendo usuarios del cargo:",
          usuariosError
        );

        return errorRespuesta(
          "No se pudieron cargar los usuarios asignados al cargo.",
          500,
          usuariosError.message
        );
      }

      usuarios = data || [];
    }

    const usuariosMap = new Map(
      usuarios.map((usuario) => [usuario.id, usuario])
    );

    // ----------------------------------------------------------
    // Combinar usuario + asignación
    // ----------------------------------------------------------

    const data = asignacionesValidas
      .map((asignacion: any) => {
        const usuario = usuariosMap.get(asignacion.usuario_id);

        if (!usuario) return null;

        return {
          ...usuario,
          asignacion_id: asignacion.id,
          asignacion: {
            id: asignacion.id,
            usuario_id: asignacion.usuario_id,
            cargo_id: asignacion.cargo_id,
            rol_id: asignacion.rol_id,
            fecha_inicio: asignacion.fecha_inicio,
            fecha_fin: asignacion.fecha_fin,
            activo: asignacion.activo,
            perfil_predeterminado:
              asignacion.perfil_predeterminado,
            cargo: asignacion.cargo,
            rol: asignacion.rol,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      cargo: {
        id: cargo.id,
        codigo: cargo.codigo,
        nombre: cargo.nombre,
        activo: cargo.activo,
        departamento_id: cargo.departamento_id,
      },
      total: data.length,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error inesperado en GET /api/organizacion/cargos/[id]/usuarios:",
      error
    );

    return errorRespuesta(
      error?.message || "Error interno del servidor.",
      500
    );
  }
}
