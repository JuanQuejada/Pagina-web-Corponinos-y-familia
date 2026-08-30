import { NextRequest } from "next/server";
import {
  supabaseAdmin,
  getProfileFromBearer,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

type AnyRecord =
  Record<string, any>;

function texto(value: unknown): string {
  return String(value ?? "").trim();
}

function nullable(
  value: unknown
): string | null {
  const v = texto(value);
  return v || null;
}

function normalizarEmail(
  value: unknown
): string {
  return texto(value).toLowerCase();
}

function normalizarCodigo(
  value: unknown
): string {
  return texto(value).toUpperCase();
}

function errorMessage(
  error: any
): string {
  return (
    error?.message ||
    "Error inesperado."
  );
}

/* ============================================================
   VALIDAR DATOS
============================================================ */

async function validarDatosUsuario(
  supabase: any,
  body: AnyRecord,
  usuarioId: string
) {
  const tipoPersonaId =
    texto(
      body.tipo_persona_id
    );

  const tipoIdentificacionId =
    texto(
      body.tipo_identificacion_id
    );

  const numeroIdentificacion =
    texto(
      body.numero_identificacion
    );

  const nombres =
    texto(body.nombres);

  const apellidos =
    texto(body.apellidos);

  const razonSocial =
    texto(
      body.razon_social
    );

  const departamentoId =
    texto(body.departamento_id);

  const cargoId =
    texto(body.cargo_id);

  const rolId =
    texto(body.rol_id);

  const estadoUsuarioId =
    texto(
      body.estado_usuario_id
    );

  if (!tipoPersonaId) {
    throw new Error(
      "El tipo de persona es obligatorio."
    );
  }

  if (!tipoIdentificacionId) {
    throw new Error(
      "El tipo de identificación es obligatorio."
    );
  }

  if (!numeroIdentificacion) {
    throw new Error(
      "El número de identificación es obligatorio."
    );
  }

  if (!departamentoId) {
    throw new Error(
      "El departamento es obligatorio."
    );
  }

  if (!cargoId) {
    throw new Error(
      "El cargo es obligatorio."
    );
  }

  if (!rolId) {
    throw new Error(
      "El rol del sistema es obligatorio."
    );
  }

  if (!estadoUsuarioId) {
    throw new Error(
      "El estado del usuario es obligatorio."
    );
  }

  /* ----------------------------------------------------------
     TIPO PERSONA
  ---------------------------------------------------------- */

  const {
    data: tipoPersona,
    error: tipoPersonaError,
  } = await supabase
    .from("tipos_persona")
    .select(
      "id,codigo,nombre,activo"
    )
    .eq(
      "id",
      tipoPersonaId
    )
    .maybeSingle();

  if (tipoPersonaError) {
    throw tipoPersonaError;
  }

  if (!tipoPersona) {
    throw new Error(
      "El tipo de persona seleccionado no existe."
    );
  }

  if (!tipoPersona.activo) {
    throw new Error(
      "El tipo de persona seleccionado está inactivo."
    );
  }

  const codigoPersona =
    normalizarCodigo(
      tipoPersona.codigo
    );

  const nombrePersona =
    normalizarCodigo(
      tipoPersona.nombre
    );

  const esJuridica =
    codigoPersona.includes("JUR") ||
    nombrePersona.includes("JURID") ||
    nombrePersona.includes("EMPRESA");

  if (esJuridica) {
    if (!razonSocial) {
      throw new Error(
        "La razón social es obligatoria para una persona jurídica."
      );
    }
  } else {
    if (!nombres) {
      throw new Error(
        "Los nombres son obligatorios."
      );
    }

    if (!apellidos) {
      throw new Error(
        "Los apellidos son obligatorios."
      );
    }
  }

  /* ----------------------------------------------------------
     TIPO IDENTIFICACIÓN
  ---------------------------------------------------------- */

  const {
    data: tipoIdentificacion,
    error:
      tipoIdentificacionError,
  } = await supabase
    .from("tipos_identificacion")
    .select(
      "id,codigo,nombre,activo,tipo_persona_id"
    )
    .eq(
      "id",
      tipoIdentificacionId
    )
    .maybeSingle();

  if (tipoIdentificacionError) {
    throw tipoIdentificacionError;
  }

  if (!tipoIdentificacion) {
    throw new Error(
      "El tipo de identificación seleccionado no existe."
    );
  }

  if (!tipoIdentificacion.activo) {
    throw new Error(
      "El tipo de identificación seleccionado está inactivo."
    );
  }

  if (
    tipoIdentificacion.tipo_persona_id &&
    tipoIdentificacion.tipo_persona_id !==
      tipoPersonaId
  ) {
    throw new Error(
      "El tipo de identificación no corresponde al tipo de persona."
    );
  }

  /* ----------------------------------------------------------
     IDENTIFICACIÓN DUPLICADA
  ---------------------------------------------------------- */

  const {
    data: duplicado,
    error: duplicadoError,
  } = await supabase
    .from("usuarios")
    .select("id")
    .eq(
      "numero_identificacion",
      numeroIdentificacion
    )
    .neq(
      "id",
      usuarioId
    )
    .maybeSingle();

  if (duplicadoError) {
    throw duplicadoError;
  }

  if (duplicado) {
    throw new Error(
      "Ya existe otro usuario con ese número de identificación."
    );
  }

  /* ----------------------------------------------------------
     ESTADO
  ---------------------------------------------------------- */

  const {
    data: estado,
    error: estadoError,
  } = await supabase
    .from("estados_usuario")
    .select(
      "id,codigo,nombre,activo"
    )
    .eq(
      "id",
      estadoUsuarioId
    )
    .maybeSingle();

  if (estadoError) {
    throw estadoError;
  }

  if (!estado) {
    throw new Error(
      "El estado seleccionado no existe."
    );
  }

  if (!estado.activo) {
    throw new Error(
      "El estado seleccionado está inactivo."
    );
  }

  /* ----------------------------------------------------------
     DEPARTAMENTO
  ---------------------------------------------------------- */

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
    throw new Error(
      "El departamento seleccionado no existe."
    );
  }

  if (!departamento.activo) {
    throw new Error(
      "No se puede asignar un usuario a un departamento inactivo."
    );
  }

  /* ----------------------------------------------------------
     CARGO
  ---------------------------------------------------------- */

  const {
    data: cargo,
    error: cargoError,
  } = await supabase
    .from("cargos")
    .select(
      "id,nombre,departamento_id,activo"
    )
    .eq(
      "id",
      cargoId
    )
    .maybeSingle();

  if (cargoError) {
    throw cargoError;
  }

  if (!cargo) {
    throw new Error(
      "El cargo seleccionado no existe."
    );
  }

  if (!cargo.activo) {
    throw new Error(
      "No se puede asignar un cargo inactivo."
    );
  }

  if (
    cargo.departamento_id !==
    departamentoId
  ) {
    throw new Error(
      "El cargo seleccionado no pertenece al departamento indicado."
    );
  }

  /* ----------------------------------------------------------
     ROL
  ---------------------------------------------------------- */

  const {
    data: rol,
    error: rolError,
  } = await supabase
    .from("roles")
    .select(
      "id,codigo,nombre,activo"
    )
    .eq(
      "id",
      rolId
    )
    .maybeSingle();

  if (rolError) {
    throw rolError;
  }

  if (!rol) {
    throw new Error(
      "El rol seleccionado no existe."
    );
  }

  if (!rol.activo) {
    throw new Error(
      "El rol seleccionado está inactivo."
    );
  }

  return {
    tipoPersonaId,
    tipoIdentificacionId,
    numeroIdentificacion,
    nombres,
    apellidos,
    razonSocial,
    departamentoId,
    cargoId,
    rolId,
    estadoUsuarioId,
    esJuridica,
  };
}

/* ============================================================
   GET /api/usuarios/[id]
============================================================ */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return jsonError(
        "El ID del usuario es obligatorio.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    const {
      data: usuario,
      error,
    } = await supabase
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

        cargo_id,

        clave_repositorio,
        puede_iniciar_flujos,

        foto_url,

        tipo_persona:tipos_persona(
          id,
          codigo,
          nombre
        ),

        tipo_identificacion:tipos_identificacion(
          id,
          codigo,
          nombre
        ),

        estado_usuario:estados_usuario(
          id,
          codigo,
          nombre,
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
            activo
          )
        )
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (error) {
      return jsonError(
        error.message,
        500
      );
    }

    if (!usuario) {
      return jsonError(
        "Usuario no encontrado.",
        404
      );
    }

    const {
      data: asignaciones,
      error:
        asignacionesError,
    } = await supabase
      .from(
        "usuarios_asignaciones"
      )
      .select(`
        id,
        usuario_id,
        cargo_id,
        rol_id,
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
            activo
          )
        )
      `)
      .eq(
        "usuario_id",
        id
      )
      .order(
        "perfil_predeterminado",
        {
          ascending: false,
        }
      );

    if (asignacionesError) {
      return jsonError(
        asignacionesError.message,
        500
      );
    }

    return jsonOk({
      usuario,

      asignaciones:
        asignaciones || [],
    });
  } catch (error: any) {
    console.error(
      "GET /api/usuarios/[id]:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}

/* ============================================================
   PUT /api/usuarios/[id]
============================================================ */

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return jsonError(
        "El ID del usuario es obligatorio.",
        400
      );
    }

    let body: AnyRecord;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    const {
      data: usuarioActual,
      error: usuarioError,
    } = await supabase
      .from("usuarios")
      .select(`
        id,
        auth_user_id,
        email,
        clave_repositorio,
        puede_iniciar_flujos
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (usuarioError) {
      return jsonError(
        usuarioError.message,
        500
      );
    }

    if (!usuarioActual) {
      return jsonError(
        "Usuario no encontrado.",
        404
      );
    }

    const datos =
      await validarDatosUsuario(
        supabase,
        body,
        id
      );

    const email =
      normalizarEmail(
        body.email
      );

    if (!email) {
      return jsonError(
        "El correo electrónico es obligatorio.",
        400
      );
    }

    /* ----------------------------------------------------------
       CLAVE REPOSITORIO
       
       Si el frontend envía null/vacío,
       conservamos la existente.
    ---------------------------------------------------------- */

    const claveRepositorio =
      texto(
        body.clave_repositorio
      );

    const nuevaClaveRepositorio =
      claveRepositorio
        ? claveRepositorio
        : usuarioActual.clave_repositorio ||
          null;

    const puedeIniciarFlujos =
      body.puede_iniciar_flujos === true;

    /* ----------------------------------------------------------
       EMAIL AUTH
    ---------------------------------------------------------- */

    if (
      usuarioActual.auth_user_id &&
      email !==
        normalizarEmail(
          usuarioActual.email
        )
    ) {
      const {
        error:
          authUpdateError,
      } =
        await supabase.auth.admin.updateUserById(
          usuarioActual.auth_user_id,
          {
            email,
            email_confirm: true,
          }
        );

      if (authUpdateError) {
        return jsonError(
          authUpdateError.message,
          400
        );
      }
    }

    /* ----------------------------------------------------------
       ACTUALIZAR usuarios
    ---------------------------------------------------------- */

    const updateData:
      AnyRecord = {
      email,

      tipo_persona_id:
        datos.tipoPersonaId,

      tipo_identificacion_id:
        datos.tipoIdentificacionId,

      numero_identificacion:
        datos.numeroIdentificacion,

      nombres:
        datos.esJuridica
          ? null
          : datos.nombres,

      apellidos:
        datos.esJuridica
          ? null
          : datos.apellidos,

      razon_social:
        datos.esJuridica
          ? datos.razonSocial
          : null,

      telefono:
        nullable(
          body.telefono
        ),

      direccion:
        nullable(
          body.direccion
        ),

      estado_usuario_id:
        datos.estadoUsuarioId,

      fecha_ingreso:
        nullable(
          body.fecha_ingreso
        ),

      fecha_retiro:
        nullable(
          body.fecha_retiro
        ),

      cargo_id:
        datos.cargoId,

      clave_repositorio:
        nuevaClaveRepositorio,

      puede_iniciar_flujos:
        puedeIniciarFlujos,

      updated_by:
        actor.profile.id,

      updated_at:
        new Date().toISOString(),
    };

    const {
      data: usuario,
      error: updateError,
    } =
      await supabase
        .from("usuarios")
        .update(updateData)
        .eq(
          "id",
          id
        )
        .select("*")
        .single();

    if (updateError) {
      return jsonError(
        updateError.message,
        500
      );
    }

    /* ----------------------------------------------------------
       ASIGNACIONES
    ---------------------------------------------------------- */

    const {
      data: asignacionesActuales,
      error:
        asignacionesError,
    } =
      await supabase
        .from(
          "usuarios_asignaciones"
        )
        .select(
          "id,cargo_id,rol_id,activo,perfil_predeterminado"
        )
        .eq(
          "usuario_id",
          id
        );

    if (asignacionesError) {
      return jsonError(
        asignacionesError.message,
        500
      );
    }

    const asignacionPredeterminada =
      (
        asignacionesActuales ||
        []
      ).find(
        (a) =>
          a.activo === true &&
          a.perfil_predeterminado ===
            true
      );

    if (
      asignacionPredeterminada
    ) {
      const {
        error:
          updateAsignacionError,
      } =
        await supabase
          .from(
            "usuarios_asignaciones"
          )
          .update({
            cargo_id:
              datos.cargoId,

            rol_id:
              datos.rolId,

            activo: true,

            perfil_predeterminado:
              true,
          })
          .eq(
            "id",
            asignacionPredeterminada.id
          );

      if (updateAsignacionError) {
        return jsonError(
          updateAsignacionError.message,
          500
        );
      }
    } else {
      const {
        error:
          nuevaAsignacionError,
      } =
        await supabase
          .from(
            "usuarios_asignaciones"
          )
          .insert({
            usuario_id:
              id,

            cargo_id:
              datos.cargoId,

            rol_id:
              datos.rolId,

            activo: true,

            perfil_predeterminado:
              true,
          });

      if (nuevaAsignacionError) {
        return jsonError(
          nuevaAsignacionError.message,
          500
        );
      }
    }

    return jsonOk({
      message:
        "Usuario actualizado correctamente.",

      usuario,
    });
  } catch (error: any) {
    console.error(
      "PUT /api/usuarios/[id]:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}

/* ============================================================
   DELETE /api/usuarios/[id]
============================================================ */

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return jsonError(
        "El ID del usuario es obligatorio.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    const {
      data: usuario,
      error: usuarioError,
    } =
      await supabase
        .from("usuarios")
        .select(
          "id,auth_user_id,nombres,apellidos,razon_social"
        )
        .eq(
          "id",
          id
        )
        .maybeSingle();

    if (usuarioError) {
      return jsonError(
        usuarioError.message,
        500
      );
    }

    if (!usuario) {
      return jsonError(
        "Usuario no encontrado.",
        404
      );
    }

    const {
      data: asignaciones,
      error:
        asignacionesError,
    } =
      await supabase
        .from(
          "usuarios_asignaciones"
        )
        .select("id")
        .eq(
          "usuario_id",
          id
        )
        .eq(
          "activo",
          true
        );

    if (asignacionesError) {
      return jsonError(
        asignacionesError.message,
        500
      );
    }

    if (
      asignaciones &&
      asignaciones.length > 0
    ) {
      return jsonError(
        "El usuario tiene asignaciones activas. Desactive el usuario en lugar de eliminarlo.",
        409
      );
    }

    const {
      error:
        deleteAsignacionesError,
    } =
      await supabase
        .from(
          "usuarios_asignaciones"
        )
        .delete()
        .eq(
          "usuario_id",
          id
        );

    if (
      deleteAsignacionesError
    ) {
      return jsonError(
        deleteAsignacionesError.message,
        500
      );
    }

    const {
      error:
        deleteUsuarioError,
    } =
      await supabase
        .from("usuarios")
        .delete()
        .eq(
          "id",
          id
        );

    if (deleteUsuarioError) {
      return jsonError(
        `No fue posible eliminar el usuario: ${deleteUsuarioError.message}`,
        409
      );
    }

    if (
      usuario.auth_user_id
    ) {
      const {
        error:
          authDeleteError,
      } =
        await supabase.auth.admin.deleteUser(
          usuario.auth_user_id
        );

      if (authDeleteError) {
        console.error(
          "Usuario eliminado de usuarios pero no de Auth:",
          authDeleteError
        );
      }
    }

    return jsonOk({
      message:
        "Usuario eliminado correctamente.",
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/usuarios/[id]:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}