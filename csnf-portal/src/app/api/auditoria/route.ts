import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

interface AuditoriaRow {
  id: string;
  usuario_id: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalles: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function normalizarAccion(valor: unknown): string {
  return texto(valor).toUpperCase();
}

function normalizarEntidad(valor: unknown): string {
  return texto(valor).toLowerCase();
}

function obtenerNombreUsuario(usuario: any): string {
  if (!usuario) {
    return "Sistema / Desconocido";
  }

  if (usuario.razon_social) {
    return usuario.razon_social;
  }

  const nombre = `${usuario.nombres ?? ""} ${
    usuario.apellidos ?? ""
  }`.trim();

  return (
    nombre ||
    usuario.email ||
    "Usuario desconocido"
  );
}

function construirDescripcion(log: AuditoriaRow): string {
  const detalles = log.detalles ?? {};

  if (detalles.descripcion) {
    return String(detalles.descripcion);
  }

  const operacion =
    detalles.operacion ||
    log.accion ||
    "OPERACIÓN";

  const entidad =
    log.entidad ||
    "sistema";

  const oldData = detalles.old_data;
  const newData = detalles.new_data;

  if (
    normalizarAccion(operacion) === "UPDATE" &&
    oldData &&
    newData
  ) {
    const cambios: string[] = [];

    const claves = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);

    claves.forEach((clave) => {
      if (
        [
          "updated_at",
          "updated_by",
          "created_at",
        ].includes(clave)
      ) {
        return;
      }

      const anterior = oldData?.[clave];
      const nuevo = newData?.[clave];

      if (
        JSON.stringify(anterior) !==
        JSON.stringify(nuevo)
      ) {
        cambios.push(
          `${clave}: ${String(
            anterior ?? "vacío"
          )} → ${String(nuevo ?? "vacío")}`
        );
      }
    });

    if (cambios.length > 0) {
      return `Actualización de ${entidad}: ${cambios.join(
        ", "
      )}`;
    }
  }

  if (
    normalizarAccion(operacion) === "INSERT"
  ) {
    return `Creación de registro en ${entidad}.`;
  }

  if (
    normalizarAccion(operacion) === "DELETE"
  ) {
    return `Eliminación de registro en ${entidad}.`;
  }

  return `${operacion} en ${entidad}.`;
}

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const busqueda =
      texto(
        searchParams.get("busqueda")
      ).toLowerCase();

    const accion =
      normalizarAccion(
        searchParams.get("accion")
      );

    const entidad =
      normalizarEntidad(
        searchParams.get("entidad")
      );

    const usuarioId =
      texto(
        searchParams.get("usuario_id")
      );

    const desde =
      texto(
        searchParams.get("desde")
      );

    const hasta =
      texto(
        searchParams.get("hasta")
      );

    const limiteSolicitado =
      Number(
        searchParams.get("limite") || 200
      );

    const limite = Math.min(
      Math.max(
        Number.isFinite(
          limiteSolicitado
        )
          ? limiteSolicitado
          : 200,
        1
      ),
      1000
    );

    let query = supabase
      .from("auditoria")
      .select(
        `
          id,
          usuario_id,
          accion,
          entidad,
          entidad_id,
          detalles,
          ip_address,
          user_agent,
          created_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(limite);

    if (accion) {
      query = query.eq(
        "accion",
        accion
      );
    }

    if (entidad) {
      query = query.eq(
        "entidad",
        entidad
      );
    }

    if (usuarioId) {
      query = query.eq(
        "usuario_id",
        usuarioId
      );
    }

    if (desde) {
      query = query.gte(
        "created_at",
        `${desde}T00:00:00`
      );
    }

    if (hasta) {
      query = query.lt(
        "created_at",
        `${hasta}T23:59:59.999`
      );
    }

    const {
      data: logs,
      error,
    } = await query;

    if (error) {
      console.error(
        "Error consultando auditoría:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No fue posible consultar la auditoría.",
          detalle: error.message,
        },
        { status: 500 }
      );
    }

    const listaLogs =
      (logs || []) as AuditoriaRow[];

    /*
     * ---------------------------------------------------------
     * OBTENER USUARIOS
     * ---------------------------------------------------------
     */

    const idsUsuarios =
      Array.from(
        new Set(
          listaLogs
            .map(
              (log) =>
                log.usuario_id
            )
            .filter(Boolean)
        )
      );

    let usuarios: any[] = [];

    if (idsUsuarios.length > 0) {
      const {
        data,
        error: errorUsuarios,
      } = await supabase
        .from("usuarios")
        .select(
          `
            id,
            nombres,
            apellidos,
            razon_social,
            email
          `
        )
        .in(
          "id",
          idsUsuarios
        );

      if (errorUsuarios) {
        console.error(
          "Error consultando usuarios de auditoría:",
          errorUsuarios
        );
      } else {
        usuarios = data || [];
      }
    }

    const mapaUsuarios =
      new Map(
        usuarios.map((usuario) => [
          usuario.id,
          usuario,
        ])
      );

    /*
     * ---------------------------------------------------------
     * CONSTRUIR RESPUESTA
     * ---------------------------------------------------------
     */

    let resultado =
      listaLogs.map((log) => {
        const usuario =
          log.usuario_id
            ? mapaUsuarios.get(
                log.usuario_id
              ) ?? null
            : null;

        return {
          ...log,

          usuario: {
            id:
              usuario?.id ??
              log.usuario_id ??
              null,

            nombre:
              obtenerNombreUsuario(
                usuario
              ),

            nombres:
              usuario?.nombres ??
              null,

            apellidos:
              usuario?.apellidos ??
              null,

            razon_social:
              usuario?.razon_social ??
              null,

            email:
              usuario?.email ??
              null,
          },

          descripcion:
            construirDescripcion(log),
        };
      });

    /*
     * ---------------------------------------------------------
     * BÚSQUEDA LIBRE
     * ---------------------------------------------------------
     */

    if (busqueda) {
      resultado =
        resultado.filter((log) => {
          const contenido =
            [
              log.accion,
              log.entidad,
              log.entidad_id,
              log.descripcion,
              log.usuario?.nombre,
              log.usuario?.email,
              JSON.stringify(
                log.detalles ?? {}
              ),
            ]
              .join(" ")
              .toLowerCase();

          return contenido.includes(
            busqueda
          );
        });
    }

    /*
     * ---------------------------------------------------------
     * CATÁLOGOS PARA EL FRONTEND
     * ---------------------------------------------------------
     */

    const acciones =
      Array.from(
        new Set(
          listaLogs
            .map(
              (log) =>
                log.accion
            )
            .filter(Boolean)
            .map(
              (valor) =>
                valor.toUpperCase()
            )
        )
      ).sort();

    const entidades =
      Array.from(
        new Set(
          listaLogs
            .map(
              (log) =>
                log.entidad
            )
            .filter(Boolean)
            .map(
              (valor) =>
                String(valor)
                  .toLowerCase()
            )
        )
      ).sort();

    return NextResponse.json({
      ok: true,
      data: resultado,
      total: resultado.length,
      acciones,
      entidades,
    });
  } catch (error: any) {
    console.error(
      "Error inesperado en /api/auditoria:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}