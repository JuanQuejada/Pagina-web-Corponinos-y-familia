import { NextRequest, NextResponse } from "next/server";

import {
  supabaseAdmin,
  getProfileFromBearer,
} from "@/lib/document-domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================
// CONSTANTES
// ============================================================

const NIVELES_JERARQUICOS = [
  "Directivo",
  "Estratégico",
  "Táctico / Coordinación",
  "Operativo",
  "Asistencial",
] as const;

type NivelJerarquico =
  (typeof NIVELES_JERARQUICOS)[number];

// ============================================================
// HELPERS
// ============================================================

function texto(valor: unknown): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function normalizarCodigo(valor: unknown): string {
  return texto(valor).toUpperCase();
}

function booleano(
  valor: unknown,
  defecto: boolean
): boolean {
  return typeof valor === "boolean"
    ? valor
    : defecto;
}

function enteroPositivo(
  valor: unknown,
  defecto: number
): number {
  const numero = Number(valor);

  if (
    !Number.isInteger(numero) ||
    numero < 1
  ) {
    return defecto;
  }

  return numero;
}

function errorRespuesta(
  error: string,
  status: number,
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
// GET /api/organizacion/cargos
//
// Parámetros:
//
// ?busqueda=director
// ?departamento_id=UUID
// ?solo_activos=true
// ============================================================

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const busqueda = texto(
      searchParams.get("busqueda")
    );

    const departamentoId = texto(
      searchParams.get("departamento_id")
    );

    const soloActivos =
      searchParams.get("solo_activos");

    const supabase =
      supabaseAdmin();

    // --------------------------------------------------------
    // CONSULTA PRINCIPAL
    // --------------------------------------------------------

    let query = supabase
      .from("cargos")
      .select(`
        id,
        departamento_id,
        codigo,
        nombre,
        descripcion,
        nivel_organizacional,
        reporta_a,
        requiere_firma,
        puede_aprobar,
        puede_iniciar_flujos,
        orden,
        activo,
        editable,
        created_by,
        updated_by,
        created_at,
        updated_at,
        es_firma_autorizada,
        nivel_jerarquico,
        departamento:departamentos(
          id,
          codigo,
          nombre,
          activo
        )
      `)
      .order(
        "nivel_organizacional",
        {
          ascending: true,
          nullsFirst: false,
        }
      )
      .order(
        "orden",
        {
          ascending: true,
          nullsFirst: false,
        }
      )
      .order(
        "nombre",
        {
          ascending: true,
        }
      );

    // --------------------------------------------------------
    // FILTRO DEPARTAMENTO
    // --------------------------------------------------------

    if (departamentoId) {
      query = query.eq(
        "departamento_id",
        departamentoId
      );
    }

    // --------------------------------------------------------
    // FILTRO ACTIVOS
    // --------------------------------------------------------

    if (soloActivos === "true") {
      query = query.eq(
        "activo",
        true
      );
    }

    // --------------------------------------------------------
    // BÚSQUEDA
    // --------------------------------------------------------

    if (busqueda) {
      const termino =
        busqueda.replace(
          /[%_]/g,
          "\\$&"
        );

      query = query.or(
        [
          `nombre.ilike.%${termino}%`,
          `codigo.ilike.%${termino}%`,
          `descripcion.ilike.%${termino}%`,
          `nivel_jerarquico.ilike.%${termino}%`,
        ].join(",")
      );
    }

    // --------------------------------------------------------
    // EJECUTAR
    // --------------------------------------------------------

    const {
      data: cargosData,
      error: cargosError,
    } = await query;

    if (cargosError) {
      console.error(
        "Error listando cargos:",
        cargosError
      );

      return errorRespuesta(
        "No se pudieron cargar los cargos.",
        500,
        cargosError.message
      );
    }

    const cargos =
      cargosData ?? [];

    // --------------------------------------------------------
    // CARGOS SUPERIORES
    //
    // Se obtiene mediante segunda consulta para evitar
    // problemas con la relación autorreferenciada.
    // --------------------------------------------------------

    const idsSuperiores =
      Array.from(
        new Set(
          cargos
            .map(
              (cargo) =>
                cargo.reporta_a
            )
            .filter(
              (
                id
              ): id is string =>
                typeof id ===
                  "string" &&
                id.length > 0
            )
        )
      );

    let cargosSuperiores: any[] =
      [];

    if (
      idsSuperiores.length > 0
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("cargos")
        .select(`
          id,
          codigo,
          nombre,
          nivel_organizacional,
          nivel_jerarquico,
          activo
        `)
        .in(
          "id",
          idsSuperiores
        );

      if (error) {
        console.error(
          "Error obteniendo cargos superiores:",
          error
        );

        return errorRespuesta(
          "No se pudieron obtener los cargos superiores.",
          500,
          error.message
        );
      }

      cargosSuperiores =
        data ?? [];
    }

    // --------------------------------------------------------
    // MAPA SUPERIORES
    // --------------------------------------------------------

    const superioresMap =
      new Map<string, any>();

    for (
      const superior of cargosSuperiores
    ) {
      superioresMap.set(
        superior.id,
        superior
      );
    }

    // --------------------------------------------------------
    // NORMALIZAR RESPUESTA
    // --------------------------------------------------------

    const resultado =
      cargos.map(
        (cargo: any) => {
          let departamento =
            null;

          if (
            Array.isArray(
              cargo.departamento
            )
          ) {
            departamento =
              cargo.departamento[0] ??
              null;
          } else {
            departamento =
              cargo.departamento ??
              null;
          }

          const cargoSuperior =
            cargo.reporta_a
              ? superioresMap.get(
                  cargo.reporta_a
                ) ?? null
              : null;

          return {
            ...cargo,
            departamento,
            cargo_superior:
              cargoSuperior,
          };
        }
      );

    return NextResponse.json({
      ok: true,
      data: resultado,
      total: resultado.length,
    });
  } catch (error: unknown) {
    console.error(
      "Error inesperado en GET /api/organizacion/cargos:",
      error
    );

    return errorRespuesta(
      error instanceof Error
        ? error.message
        : "Error interno del servidor.",
      500
    );
  }
}

// ============================================================
// POST /api/organizacion/cargos
//
// Crear cargo
// ============================================================

export async function POST(
  request: NextRequest
) {
  try {
    // --------------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------------

    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return errorRespuesta(
        "Sesión no válida.",
        401
      );
    }

    const usuarioId =
      actor.profile.id;

    // --------------------------------------------------------
    // BODY
    // --------------------------------------------------------

    const body =
      await request.json();

    const supabase =
      supabaseAdmin();

    // --------------------------------------------------------
    // NORMALIZACIÓN
    // --------------------------------------------------------

    const departamentoId =
      texto(
        body.departamento_id
      );

    const codigo =
      normalizarCodigo(
        body.codigo
      );

    const nombre =
      texto(body.nombre);

    const descripcion =
      texto(
        body.descripcion
      ) || null;

    const nivelOrganizacional =
      enteroPositivo(
        body.nivel_organizacional,
        1
      );

    const nivelJerarquicoRaw =
      texto(
        body.nivel_jerarquico
      );

    const nivelJerarquico: NivelJerarquico =
      NIVELES_JERARQUICOS.includes(
        nivelJerarquicoRaw as NivelJerarquico
      )
        ? (
            nivelJerarquicoRaw as NivelJerarquico
          )
        : "Operativo";

    const reportaA =
      texto(body.reporta_a) ||
      null;

    // ========================================================
    // ATRIBUCIONES DEL CARGO
    // ========================================================

    const requiereFirma =
      booleano(
        body.requiere_firma,
        false
      );

    const puedeAprobar =
      booleano(
        body.puede_aprobar,
        false
      );

    const puedeIniciarFlujos =
      booleano(
        body.puede_iniciar_flujos,
        false
      );

    const esFirmaAutorizada =
      booleano(
        body.es_firma_autorizada,
        false
      );

    const orden =
      enteroPositivo(
        body.orden,
        1
      );

    const activo =
      booleano(
        body.activo,
        true
      );

    // --------------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------------

    if (!departamentoId) {
      return errorRespuesta(
        "El departamento es obligatorio.",
        400
      );
    }

    if (!codigo) {
      return errorRespuesta(
        "El código del cargo es obligatorio.",
        400
      );
    }

    if (codigo.length > 10) {
      return errorRespuesta(
        "El código del cargo no puede superar los 10 caracteres.",
        400
      );
    }

    if (!nombre) {
      return errorRespuesta(
        "El nombre del cargo es obligatorio.",
        400
      );
    }

    if (nombre.length > 120) {
      return errorRespuesta(
        "El nombre del cargo no puede superar los 120 caracteres.",
        400
      );
    }

    // --------------------------------------------------------
    // DEPARTAMENTO
    // --------------------------------------------------------

    const {
      data: departamento,
      error: departamentoError,
    } = await supabase
      .from("departamentos")
      .select(
        "id,nombre,activo"
      )
      .eq(
        "id",
        departamentoId
      )
      .maybeSingle();

    if (departamentoError) {
      throw departamentoError;
    }

    if (!departamento) {
      return errorRespuesta(
        "El departamento seleccionado no existe.",
        404
      );
    }

    if (
      !departamento.activo
    ) {
      return errorRespuesta(
        "No se puede crear un cargo dentro de un departamento inactivo.",
        400
      );
    }

    // --------------------------------------------------------
    // CÓDIGO DUPLICADO
    // --------------------------------------------------------

    const {
      data: codigoExistente,
      error: codigoError,
    } = await supabase
      .from("cargos")
      .select("id")
      .eq(
        "codigo",
        codigo
      )
      .maybeSingle();

    if (codigoError) {
      throw codigoError;
    }

    if (codigoExistente) {
      return errorRespuesta(
        `Ya existe un cargo con el código ${codigo}.`,
        409
      );
    }

    // --------------------------------------------------------
    // NOMBRE DUPLICADO
    // --------------------------------------------------------

    const {
      data: nombreExistente,
      error: nombreError,
    } = await supabase
      .from("cargos")
      .select("id")
      .eq(
        "departamento_id",
        departamentoId
      )
      .eq(
        "nombre",
        nombre
      )
      .maybeSingle();

    if (nombreError) {
      throw nombreError;
    }

    if (nombreExistente) {
      return errorRespuesta(
        `Ya existe un cargo llamado "${nombre}" en este departamento.`,
        409
      );
    }

    // --------------------------------------------------------
    // REPORTA A
    // --------------------------------------------------------

    if (reportaA) {
      if (
        reportaA ===
        ""
      ) {
        return errorRespuesta(
          "El cargo superior no es válido.",
          400
        );
      }

      const {
        data: cargoSuperior,
        error: superiorError,
      } = await supabase
        .from("cargos")
        .select(
          "id,nombre,activo"
        )
        .eq(
          "id",
          reportaA
        )
        .maybeSingle();

      if (superiorError) {
        throw superiorError;
      }

      if (!cargoSuperior) {
        return errorRespuesta(
          "El cargo seleccionado en 'Reporta a' no existe.",
          404
        );
      }

      if (
        !cargoSuperior.activo
      ) {
        return errorRespuesta(
          "No se puede reportar a un cargo inactivo.",
          400
        );
      }
    }

    // --------------------------------------------------------
    // INSERTAR
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from("cargos")
      .insert({
        departamento_id:
          departamentoId,

        codigo,

        nombre,

        descripcion,

        nivel_organizacional:
          nivelOrganizacional,

        nivel_jerarquico:
          nivelJerarquico,

        reporta_a:
          reportaA,

        // ATRIBUCIONES
        requiere_firma:
          requiereFirma,

        puede_aprobar:
          puedeAprobar,

        puede_iniciar_flujos:
          puedeIniciarFlujos,

        es_firma_autorizada:
          esFirmaAutorizada,

        orden,

        activo,

        editable: true,

        created_by:
          usuarioId,

        updated_by:
          usuarioId,

        created_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      })
      .select(`
        id,
        departamento_id,
        codigo,
        nombre,
        descripcion,
        nivel_organizacional,
        reporta_a,
        requiere_firma,
        puede_aprobar,
        puede_iniciar_flujos,
        orden,
        activo,
        editable,
        created_by,
        updated_by,
        created_at,
        updated_at,
        es_firma_autorizada,
        nivel_jerarquico,
        departamento:departamentos(
          id,
          codigo,
          nombre,
          activo
        )
      `)
      .single();

    if (error) {
      console.error(
        "Error creando cargo:",
        error
      );

      return errorRespuesta(
        "No se pudo crear el cargo.",
        500,
        error.message
      );
    }

    // --------------------------------------------------------
    // CARGO SUPERIOR
    // --------------------------------------------------------

    let cargoSuperior =
      null;

    if (reportaA) {
      const {
        data: superior,
        error: superiorError,
      } = await supabase
        .from("cargos")
        .select(`
          id,
          codigo,
          nombre,
          nivel_organizacional,
          nivel_jerarquico,
          activo
        `)
        .eq(
          "id",
          reportaA
        )
        .maybeSingle();

      if (!superiorError) {
        cargoSuperior =
          superior;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        mensaje:
          "Cargo creado correctamente.",
        data: {
          ...data,
          cargo_superior:
            cargoSuperior,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Error inesperado creando cargo:",
      error
    );

    return errorRespuesta(
      error instanceof Error
        ? error.message
        : "Error interno del servidor.",
      500
    );
  }
}