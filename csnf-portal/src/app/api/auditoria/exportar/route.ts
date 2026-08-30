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

const TABLAS_PERMITIDAS = {
  usuarios: {
    tabla: "usuarios",
    nombre: "reporte_usuarios",
  },

  roles: {
    tabla: "roles",
    nombre: "reporte_roles",
  },

  permisos: {
    tabla: "permisos",
    nombre: "reporte_permisos",
  },

  roles_permisos: {
    tabla: "roles_permisos",
    nombre: "reporte_roles_permisos",
  },

  areas: {
    tabla: "areas",
    nombre: "reporte_areas",
  },

  departamentos: {
    tabla: "departamentos",
    nombre: "reporte_departamentos",
  },

  cargos: {
    tabla: "cargos",
    nombre: "reporte_cargos",
  },

  auditoria: {
    tabla: "auditoria",
    nombre: "reporte_auditoria_sistema",
  },
} as const;

type Modulo =
  keyof typeof TABLAS_PERMITIDAS;

function escaparCSV(
  valor: unknown
): string {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  let texto: string;

  if (
    typeof valor === "object"
  ) {
    try {
      texto =
        JSON.stringify(valor);
    } catch {
      texto = String(valor);
    }
  } else {
    texto = String(valor);
  }

  return `"${texto.replace(
    /"/g,
    '""'
  )}"`;
}

function convertirCSV(
  datos: Record<
    string,
    any
  >[]
): string {
  if (
    !datos ||
    datos.length === 0
  ) {
    return "";
  }

  const columnas =
    Array.from(
      new Set(
        datos.flatMap((fila) =>
          Object.keys(fila)
        )
      )
    );

  const encabezado =
    columnas
      .map(escaparCSV)
      .join(",");

  const filas =
    datos.map((fila) =>
      columnas
        .map((columna) =>
          escaparCSV(
            fila[columna]
          )
        )
        .join(",")
    );

  return [
    encabezado,
    ...filas,
  ].join("\r\n");
}

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const modulo =
      searchParams.get(
        "modulo"
      ) as Modulo | null;

    if (
      !modulo ||
      !TABLAS_PERMITIDAS[
        modulo
      ]
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Módulo de exportación no válido.",
        },
        { status: 400 }
      );
    }

    const configuracion =
      TABLAS_PERMITIDAS[
        modulo
      ];

    const {
      data,
      error,
    } = await supabase
      .from(
        configuracion.tabla
      )
      .select("*");

    if (error) {
      console.error(
        "Error exportando:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No fue posible obtener los datos del módulo.",
          detalle:
            error.message,
        },
        { status: 500 }
      );
    }

    const filas =
      Array.isArray(data)
        ? data
        : [];

    const csv =
      convertirCSV(filas);

    const nombreArchivo =
      `${configuracion.nombre}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    return new NextResponse(
      "\ufeff" + csv,
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="${nombreArchivo}"`,
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "Error inesperado exportando:",
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