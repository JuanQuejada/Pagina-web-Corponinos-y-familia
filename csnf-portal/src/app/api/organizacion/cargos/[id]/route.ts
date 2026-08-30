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

function normalizarCodigo(
  valor: unknown
): string {
  return texto(valor).toUpperCase();
}

function booleano(
  valor: unknown,
  defecto: boolean
): boolean {
  return typeof valor ===
    "boolean"
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
      ...(detalle
        ? { detalle }
        : {}),
    },
    {
      status,
    }
  );
}

// ============================================================
// GET /api/organizacion/cargos/[id]
// ============================================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return errorRespuesta(
        "El ID del cargo es obligatorio.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    const {
      data,
      error,
    } = await supabase
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
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "Error obteniendo cargo:",
        error
      );

      return errorRespuesta(
        "No se pudo obtener el cargo.",
        500,
        error.message
      );
    }

    if (!data) {
      return errorRespuesta(
        "El cargo no existe.",
        404
      );
    }

    let cargoSuperior = null;

if (data.reporta_a) {
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
    .eq("id", data.reporta_a)
    .maybeSingle();

  if (superiorError) {
    console.error(
      "Error obteniendo cargo superior:",
      superiorError
    );

    return errorRespuesta(
      "No se pudo obtener el cargo superior.",
      500,
      superiorError.message
    );
  }

  cargoSuperior = superior;
}

    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        cargo_superior: cargoSuperior,
      },
    });
  } catch (error: unknown) {
    console.error(
      "Error inesperado obteniendo cargo:",
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
// PUT /api/organizacion/cargos/[id]
//
// Actualizar cargo y sus atribuciones
// ============================================================

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
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
    // ID
    // --------------------------------------------------------

    const { id } =
      await context.params;

    if (!id) {
      return errorRespuesta(
        "El ID del cargo es obligatorio.",
        400
      );
    }

    // --------------------------------------------------------
    // BODY
    // --------------------------------------------------------

    const body =
      await request.json();

    const supabase =
      supabaseAdmin();

    // --------------------------------------------------------
    // CARGO ACTUAL
    // --------------------------------------------------------

    const {
      data: cargoActual,
      error: consultaError,
    } = await supabase
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
        es_firma_autorizada,
        nivel_jerarquico
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (consultaError) {
      throw consultaError;
    }

    if (!cargoActual) {
      return errorRespuesta(
        "El cargo no existe.",
        404
      );
    }

    // --------------------------------------------------------
    // PROTEGER CARGO NO EDITABLE
    // --------------------------------------------------------

    if (
      cargoActual.editable ===
      false
    ) {
      return errorRespuesta(
        "Este cargo no puede ser editado.",
        403
      );
    }

    // ========================================================
    // NORMALIZAR DATOS GENERALES
    // ========================================================

    const departamentoId =
      body.departamento_id !==
      undefined
        ? texto(
            body.departamento_id
          )
        : cargoActual.departamento_id;

    const codigo =
      body.codigo !==
      undefined
        ? normalizarCodigo(
            body.codigo
          )
        : cargoActual.codigo;

    const nombre =
      body.nombre !==
      undefined
        ? texto(
            body.nombre
          )
        : cargoActual.nombre;

    const descripcion =
      body.descripcion !==
      undefined
        ? texto(
            body.descripcion
          ) || null
        : cargoActual.descripcion;

    const nivelOrganizacional =
      body.nivel_organizacional !==
      undefined
        ? enteroPositivo(
            body.nivel_organizacional,
            cargoActual.nivel_organizacional ??
              1
          )
        : cargoActual.nivel_organizacional;

    const nivelJerarquicoRaw =
      body.nivel_jerarquico !==
      undefined
        ? texto(
            body.nivel_jerarquico
          )
        : texto(
            cargoActual.nivel_jerarquico
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
      body.reporta_a !==
      undefined
        ? texto(
            body.reporta_a
          ) || null
        : cargoActual.reporta_a;

    // ========================================================
    // ATRIBUCIONES DEL CARGO
    //
    // MUY IMPORTANTE:
    // Cada atributo se conserva cuando el frontend no lo envía
    // y se modifica cuando sí lo envía.
    // ========================================================

    const requiereFirma =
      body.requiere_firma !==
      undefined
        ? booleano(
            body.requiere_firma,
            cargoActual.requiere_firma
          )
        : cargoActual.requiere_firma;

    const puedeAprobar =
      body.puede_aprobar !==
      undefined
        ? booleano(
            body.puede_aprobar,
            cargoActual.puede_aprobar
          )
        : cargoActual.puede_aprobar;

    const puedeIniciarFlujos =
      body.puede_iniciar_flujos !==
      undefined
        ? booleano(
            body.puede_iniciar_flujos,
            cargoActual.puede_iniciar_flujos
          )
        : cargoActual.puede_iniciar_flujos;

    const esFirmaAutorizada =
      body.es_firma_autorizada !==
      undefined
        ? booleano(
            body.es_firma_autorizada,
            cargoActual.es_firma_autorizada ??
              false
          )
        : (
            cargoActual.es_firma_autorizada ??
            false
          );

    // ========================================================
    // OTROS CAMPOS
    // ========================================================

    const orden =
      body.orden !==
      undefined
        ? enteroPositivo(
            body.orden,
            cargoActual.orden ??
              1
          )
        : cargoActual.orden;

    const activo =
      body.activo !==
      undefined
        ? booleano(
            body.activo,
            cargoActual.activo
          )
        : cargoActual.activo;

    // ========================================================
    // VALIDACIONES
    // ========================================================

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

    // ========================================================
    // DEPARTAMENTO
    // ========================================================

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

    // Un cargo activo no puede pertenecer a departamento
    // inactivo.

    if (
      !departamento.activo &&
      activo
    ) {
      return errorRespuesta(
        "No se puede mantener activo un cargo dentro de un departamento inactivo.",
        400
      );
    }

    // ========================================================
    // CÓDIGO DUPLICADO
    // ========================================================

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
      .neq(
        "id",
        id
      )
      .maybeSingle();

    if (codigoError) {
      throw codigoError;
    }

    if (codigoExistente) {
      return errorRespuesta(
        `Ya existe otro cargo con el código ${codigo}.`,
        409
      );
    }

    // ========================================================
    // NOMBRE DUPLICADO
    // ========================================================

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
      .neq(
        "id",
        id
      )
      .maybeSingle();

    if (nombreError) {
      throw nombreError;
    }

    if (nombreExistente) {
      return errorRespuesta(
        `Ya existe otro cargo llamado "${nombre}" en este departamento.`,
        409
      );
    }

    // ========================================================
    // NO REPORTARSE A SÍ MISMO
    // ========================================================

    if (
      reportaA === id
    ) {
      return errorRespuesta(
        "Un cargo no puede reportarse a sí mismo.",
        400
      );
    }

    // ========================================================
    // VALIDAR CARGO SUPERIOR
    // ========================================================

    if (reportaA) {
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

    // ========================================================
    // ACTUALIZAR
    // ========================================================

    const {
      data,
      error,
    } = await supabase
      .from("cargos")
      .update({
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

        // ====================================================
        // ATRIBUCIONES
        // ====================================================

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

        // ====================================================
        // TRAZABILIDAD
        // ====================================================

        updated_by:
          usuarioId,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        id
      )
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
        "Error actualizando cargo:",
        error
      );

      return errorRespuesta(
        "No se pudo actualizar el cargo.",
        500,
        error.message
      );
    }

    let cargoSuperior = null;

    if (data?.reporta_a) {
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
        .eq("id", data.reporta_a)
        .maybeSingle();

      if (superiorError) {
        console.error(
          "Error obteniendo cargo superior después de actualizar:",
          superiorError
        );

        return errorRespuesta(
          "El cargo fue actualizado, pero no se pudo obtener el cargo superior.",
          500,
          superiorError.message
        );
      }

      cargoSuperior = superior;
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        "Cargo actualizado correctamente.",
      data: {
        ...data,
        cargo_superior: cargoSuperior,
      },
    });
  } catch (error: unknown) {
    console.error(
      "Error inesperado actualizando cargo:",
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
// DELETE /api/organizacion/cargos/[id]
// ============================================================

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
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
    // ID
    // --------------------------------------------------------

    const { id } =
      await context.params;

    if (!id) {
      return errorRespuesta(
        "El ID del cargo es obligatorio.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    // --------------------------------------------------------
    // CARGO
    // --------------------------------------------------------

    const {
      data: cargo,
      error: cargoError,
    } = await supabase
      .from("cargos")
      .select(
        "id,nombre,editable"
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (cargoError) {
      throw cargoError;
    }

    if (!cargo) {
      return errorRespuesta(
        "El cargo no existe.",
        404
      );
    }

    if (
      cargo.editable ===
      false
    ) {
      return errorRespuesta(
        "Este cargo no puede ser eliminado.",
        403
      );
    }

    // --------------------------------------------------------
    // CARGOS DEPENDIENTES
    // --------------------------------------------------------

    const {
      count: cargosDependientes,
      error: dependientesError,
    } = await supabase
      .from("cargos")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "reporta_a",
        id
      );

    if (dependientesError) {
      throw dependientesError;
    }

    if (
      (cargosDependientes ?? 0) >
      0
    ) {
      return errorRespuesta(
        "No se puede eliminar el cargo porque otros cargos reportan a él.",
        409,
        `Cargos dependientes encontrados: ${cargosDependientes}`
      );
    }

    // --------------------------------------------------------
    // ASIGNACIONES
    // --------------------------------------------------------

    const {
      count: asignaciones,
      error: asignacionesError,
    } = await supabase
      .from(
        "usuarios_asignaciones"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "cargo_id",
        id
      );

    if (asignacionesError) {
      throw asignacionesError;
    }

    if (
      (asignaciones ?? 0) >
      0
    ) {
      return errorRespuesta(
        "No se puede eliminar el cargo porque existen usuarios asociados a él.",
        409,
        `Asignaciones encontradas: ${asignaciones}`
      );
    }

    // --------------------------------------------------------
    // USUARIOS DIRECTOS
    // --------------------------------------------------------

    const {
      count: usuarios,
      error: usuariosError,
    } = await supabase
      .from("usuarios")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "cargo_id",
        id
      );

    if (usuariosError) {
      throw usuariosError;
    }

    if (
      (usuarios ?? 0) >
      0
    ) {
      return errorRespuesta(
        "No se puede eliminar el cargo porque existen usuarios asociados directamente a él.",
        409,
        `Usuarios encontrados: ${usuarios}`
      );
    }

    // --------------------------------------------------------
    // ELIMINAR
    // --------------------------------------------------------

    const {
      error,
    } = await supabase
      .from("cargos")
      .delete()
      .eq(
        "id",
        id
      );

    if (error) {
      console.error(
        "Error eliminando cargo:",
        error
      );

      return errorRespuesta(
        "No se pudo eliminar el cargo.",
        500,
        error.message
      );
    }

    console.info(
      "Cargo eliminado por usuario:",
      usuarioId
    );

    return NextResponse.json({
      ok: true,
      mensaje:
        `El cargo "${cargo.nombre}" fue eliminado correctamente.`,
    });
  } catch (error: unknown) {
    console.error(
      "Error inesperado eliminando cargo:",
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