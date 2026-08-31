import { NextRequest } from "next/server";

import {
  supabaseAdmin,
  getProfileFromBearer,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

/* ============================================================
   TYPES / HELPERS
============================================================ */

type AnyRecord = Record<string, any>;

function texto(value: unknown): string {
  return String(value ?? "").trim();
}

function nullable(value: unknown): string | null {
  const v = texto(value);
  return v || null;
}

function normalizarEmail(value: unknown): string {
  return texto(value).toLowerCase();
}

function errorMessage(error: any): string {
  return error?.message || "Error inesperado.";
}

function esBooleano(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/* ============================================================
   VALIDACIÓN DE DATOS DEL USUARIO
   ------------------------------------------------------------
   Esta validación se ocupa de los datos institucionales de
   usuarios y de validar una posible asignación nueva/editada.

   IMPORTANTE:
   - Un registro en usuarios representa a la PERSONA.
   - Los diferentes cargos/roles viven en usuarios_asignaciones.
   - Nunca se crea otro registro en usuarios para agregar otro
     cargo a la misma persona.
============================================================ */

async function validarDatosUsuario(
  supabase: any,
  body: AnyRecord,
  usuarioId: string
) {
  const tipoPersonaId = texto(body.tipo_persona_id);
  const tipoIdentificacionId = texto(body.tipo_identificacion_id);
  const numeroIdentificacion = texto(body.numero_identificacion);
  const nombres = texto(body.nombres);
  const apellidos = texto(body.apellidos);
  const razonSocial = texto(body.razon_social);

  const departamentoId = nullable(body.departamento_id);
  const cargoId = nullable(body.cargo_id);
  const rolId = texto(body.rol_id);
  const estadoUsuarioId = texto(body.estado_usuario_id);

  if (!tipoPersonaId) {
    throw new Error("El tipo de persona es obligatorio.");
  }

  if (!tipoIdentificacionId) {
    throw new Error("El tipo de identificación es obligatorio.");
  }

  if (!numeroIdentificacion) {
    throw new Error("El número de identificación es obligatorio.");
  }

  if (!estadoUsuarioId) {
    throw new Error("El estado del usuario es obligatorio.");
  }

  if (!rolId) {
    throw new Error("El rol del sistema es obligatorio.");
  }

  const {
    data: tipoPersona,
    error: tpError,
  } = await supabase
    .from("tipos_persona")
    .select("id,codigo,nombre,activo")
    .eq("id", tipoPersonaId)
    .maybeSingle();

  if (tpError) throw tpError;

  if (!tipoPersona) {
    throw new Error("El tipo de persona seleccionado no existe.");
  }

  if (!tipoPersona.activo) {
    throw new Error("El tipo de persona seleccionado está inactivo.");
  }

  const codigoPersona = texto(tipoPersona.codigo).toUpperCase();
  const nombrePersona = texto(tipoPersona.nombre).toUpperCase();

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
        "Los nombres son obligatorios para una persona natural."
      );
    }

    if (!apellidos) {
      throw new Error(
        "Los apellidos son obligatorios para una persona natural."
      );
    }
  }

  const {
    data: tipoIdentificacion,
    error: tiError,
  } = await supabase
    .from("tipos_identificacion")
    .select("id,codigo,nombre,activo,tipo_persona_id")
    .eq("id", tipoIdentificacionId)
    .maybeSingle();

  if (tiError) throw tiError;

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
    tipoIdentificacion.tipo_persona_id !== tipoPersonaId
  ) {
    throw new Error(
      "El tipo de identificación no corresponde al tipo de persona."
    );
  }

  const {
    data: duplicado,
    error: duplicadoError,
  } = await supabase
    .from("usuarios")
    .select("id")
    .eq("numero_identificacion", numeroIdentificacion)
    .neq("id", usuarioId)
    .maybeSingle();

  if (duplicadoError) throw duplicadoError;

  if (duplicado) {
    throw new Error(
      "Ya existe otro usuario con ese número de identificación."
    );
  }

  const {
    data: estado,
    error: estadoError,
  } = await supabase
    .from("estados_usuario")
    .select("id,codigo,nombre,activo")
    .eq("id", estadoUsuarioId)
    .maybeSingle();

  if (estadoError) throw estadoError;

  if (!estado) {
    throw new Error("El estado seleccionado no existe.");
  }

  if (!estado.activo) {
    throw new Error("El estado seleccionado está inactivo.");
  }

  if (departamentoId) {
    const {
      data: departamento,
      error,
    } = await supabase
      .from("departamentos")
      .select("id,nombre,activo,area_id")
      .eq("id", departamentoId)
      .maybeSingle();

    if (error) throw error;

    if (!departamento) {
      throw new Error("El departamento seleccionado no existe.");
    }

    if (!departamento.activo) {
      throw new Error(
        "No se puede asignar un usuario a un departamento inactivo."
      );
    }
  }

  if (cargoId) {
    const {
      data: cargo,
      error,
    } = await supabase
      .from("cargos")
      .select("id,nombre,departamento_id,activo")
      .eq("id", cargoId)
      .maybeSingle();

    if (error) throw error;

    if (!cargo) {
      throw new Error("El cargo seleccionado no existe.");
    }

    if (!cargo.activo) {
      throw new Error("No se puede asignar un cargo inactivo.");
    }

    if (
      departamentoId &&
      cargo.departamento_id !== departamentoId
    ) {
      throw new Error(
        "El cargo seleccionado no pertenece al departamento indicado."
      );
    }
  }

  const {
    data: rol,
    error: rolError,
  } = await supabase
    .from("roles")
    .select("id,nombre,codigo,activo")
    .eq("id", rolId)
    .maybeSingle();

  if (rolError) throw rolError;

  if (!rol) {
    throw new Error("El rol seleccionado no existe.");
  }

  if (!rol.activo) {
    throw new Error("El rol seleccionado está inactivo.");
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
   OBTENER ASIGNACIONES
============================================================ */

async function obtenerAsignaciones(
  supabase: any,
  usuarioId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("usuarios_asignaciones")
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
    .eq("usuario_id", usuarioId)
    .order("perfil_predeterminado", {
      ascending: false,
    })
    .order("activo", {
      ascending: false,
    });

  if (error) throw error;

  return data || [];
}

/* ============================================================
   SINCRONIZAR CARGO PRINCIPAL
   ------------------------------------------------------------
   usuarios.cargo_id se conserva como referencia al cargo del
   perfil predeterminado. No representa todos los cargos del
   usuario.
============================================================ */

async function sincronizarCargoPrincipal(
  supabase: any,
  usuarioId: string,
  actorId: string
) {
  const {
    data: asignaciones,
    error,
  } = await supabase
    .from("usuarios_asignaciones")
    .select(
      "id,cargo_id,rol_id,activo,perfil_predeterminado"
    )
    .eq("usuario_id", usuarioId);

  if (error) throw error;

  const activas = (asignaciones || []).filter(
    (a: any) => a.activo === true
  );

  let predeterminada = activas.find(
    (a: any) => a.perfil_predeterminado === true
  );

  /*
   * Si por alguna razón no existe una asignación
   * predeterminada activa, usamos la primera activa.
   */
  if (!predeterminada && activas.length > 0) {
    predeterminada = activas[0];

    const {
      error: normalizarError,
    } = await supabase
      .from("usuarios_asignaciones")
      .update({
        perfil_predeterminado: false,
      })
      .eq("usuario_id", usuarioId);

    if (normalizarError) throw normalizarError;

    const {
      error: marcarError,
    } = await supabase
      .from("usuarios_asignaciones")
      .update({
        perfil_predeterminado: true,
      })
      .eq("id", predeterminada.id);

    if (marcarError) throw marcarError;
  }

  const cargoPrincipalId =
    predeterminada?.cargo_id ?? null;

  const {
    error: usuarioError,
  } = await supabase
    .from("usuarios")
    .update({
      cargo_id: cargoPrincipalId,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", usuarioId);

  if (usuarioError) throw usuarioError;

  return predeterminada || null;
}

/* ============================================================
   ASEGURAR PERFIL PREDETERMINADO ÚNICO
============================================================ */

async function establecerPerfilPredeterminado(
  supabase: any,
  usuarioId: string,
  asignacionId: string
) {
  const {
    data: asignacion,
    error: asignacionError,
  } = await supabase
    .from("usuarios_asignaciones")
    .select("id,usuario_id,activo")
    .eq("id", asignacionId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (asignacionError) throw asignacionError;

  if (!asignacion) {
    throw new Error(
      "La asignación seleccionada no existe para este usuario."
    );
  }

  if (!asignacion.activo) {
    throw new Error(
      "No se puede establecer como predeterminado un cargo inactivo."
    );
  }

  const {
    error: limpiarError,
  } = await supabase
    .from("usuarios_asignaciones")
    .update({
      perfil_predeterminado: false,
    })
    .eq("usuario_id", usuarioId);

  if (limpiarError) throw limpiarError;

  const {
    error: marcarError,
  } = await supabase
    .from("usuarios_asignaciones")
    .update({
      perfil_predeterminado: true,
    })
    .eq("id", asignacionId)
    .eq("usuario_id", usuarioId);

  if (marcarError) throw marcarError;
}

/* ============================================================
   GET /api/usuarios/[id]
============================================================ */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const actor = await getProfileFromBearer(request);

    if (!actor) {
      return jsonError("Sesión no válida.", 401);
    }

    const { id } = await context.params;

    if (!id) {
      return jsonError(
        "El ID del usuario es obligatorio.",
        400
      );
    }

    const supabase = supabaseAdmin();

    const {
      data: usuario,
      error,
    } = await supabase
      .from("usuarios")
      .select(`
        *,
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
          nombre
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
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!usuario) {
      return jsonError(
        "Usuario no encontrado.",
        404
      );
    }

    const asignaciones =
      await obtenerAsignaciones(
        supabase,
        id
      );

    return jsonOk({
      success: true,
      usuario,
      asignaciones,
    });
  } catch (error: any) {
    return jsonError(
      errorMessage(error),
      500
    );
  }
}

/* ============================================================
   PUT /api/usuarios/[id]
   ------------------------------------------------------------
   REGLA PRINCIPAL:

   1. Actualiza los datos personales/institucionales en usuarios.
   2. Si llega asignacion_id:
        - modifica SOLO esa asignación.
   3. Si NO llega asignacion_id:
        - busca una asignación con la misma combinación
          cargo + rol.
        - si existe, la reutiliza.
        - si no existe, CREA una nueva asignación.
   4. Nunca reemplaza automáticamente otro cargo existente.
   5. perfil_predeterminado solo cambia cuando se solicita
      expresamente.
============================================================ */

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const actor = await getProfileFromBearer(request);

    if (!actor) {
      return jsonError("Sesión no válida.", 401);
    }

    const { id } = await context.params;

    if (!id) {
      return jsonError(
        "El ID del usuario es obligatorio.",
        400
      );
    }

    let body: AnyRecord;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400
      );
    }

    const supabase = supabaseAdmin();

    const {
      data: usuarioActual,
      error: usuarioError,
    } = await supabase
      .from("usuarios")
      .select(
        "id,auth_user_id,email,cargo_id"
      )
      .eq("id", id)
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

    const email = normalizarEmail(body.email);

    if (!email) {
      return jsonError(
        "El correo electrónico es obligatorio.",
        400
      );
    }

    /* ----------------------------------------------------------
       ACTUALIZAR AUTH SI CAMBIÓ EL EMAIL
    ---------------------------------------------------------- */

    if (
      usuarioActual.auth_user_id &&
      email !== normalizarEmail(usuarioActual.email)
    ) {
      const {
        error: authUpdateError,
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

    const updateData: AnyRecord = {
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
        nullable(body.telefono),

      direccion:
        nullable(body.direccion),

      estado_usuario_id:
        datos.estadoUsuarioId,

      fecha_ingreso:
        nullable(body.fecha_ingreso),

      fecha_retiro:
        nullable(body.fecha_retiro),

      foto_url:
        nullable(body.foto_url),

      updated_by:
        actor.profile.id,

      updated_at:
        new Date().toISOString(),
    };

    /*
     * NO actualizamos usuarios.cargo_id aquí.
     * Esa columna se sincroniza después con la asignación
     * marcada como perfil_predeterminado.
     */

    const {
      data: usuario,
      error: updateError,
    } = await supabase
      .from("usuarios")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return jsonError(
        updateError.message,
        500
      );
    }

    /* ----------------------------------------------------------
       ASIGNACIONES EXISTENTES
       ---------------------------------------------------------- */

    const {
      data: asignacionesActuales,
      error: asignacionesError,
    } = await supabase
      .from("usuarios_asignaciones")
      .select(
        "id,cargo_id,rol_id,activo,perfil_predeterminado"
      )
      .eq("usuario_id", id);

    if (asignacionesError) {
      return jsonError(
        asignacionesError.message,
        500
      );
    }

    const asignaciones =
      asignacionesActuales || [];

    const asignacionId =
      nullable(body.asignacion_id);

    /*
     * El frontend puede indicar expresamente si esta asignación
     * debe ser el perfil predeterminado.
     */
    const solicitaPredeterminado =
      esBooleano(
        body.perfil_predeterminado
      )
        ? body.perfil_predeterminado
        : undefined;

    let asignacionFinal: AnyRecord | null = null;
    let accionAsignacion:
      | "actualizada"
      | "reutilizada"
      | "creada" = "reutilizada";

    /* ========================================================
       CASO A: EDITAR UNA ASIGNACIÓN EXISTENTE
    ======================================================== */

    if (asignacionId) {
      const asignacionExistente =
        asignaciones.find(
          (a: any) =>
            a.id === asignacionId
        );

      if (!asignacionExistente) {
        return jsonError(
          "La asignación indicada no existe para este usuario.",
          404
        );
      }

      /*
       * Si se está cambiando cargo + rol, verificamos que no
       * exista otra asignación con la misma combinación.
       */
      const duplicada =
        asignaciones.find(
          (a: any) =>
            a.id !== asignacionId &&
            a.cargo_id === datos.cargoId &&
            a.rol_id === datos.rolId
        );

      if (duplicada) {
        return jsonError(
          "El usuario ya tiene una asignación con el cargo y rol seleccionados.",
          409
        );
      }

      const perfilPredeterminado =
        solicitaPredeterminado ??
        Boolean(
          asignacionExistente.perfil_predeterminado
        );

      /*
       * Si la asignación predeterminada se desactiva, no
       * permitimos dejar al usuario sin perfil predeterminado
       * si existen otras asignaciones activas.
       */
      if (
        asignacionExistente.perfil_predeterminado &&
        body.activo === false &&
        asignaciones.some(
          (a: any) =>
            a.id !== asignacionId &&
            a.activo === true
        )
      ) {
        return jsonError(
          "No puede desactivar el perfil predeterminado mientras existan otras asignaciones activas. Establezca primero otro perfil como predeterminado.",
          409
        );
      }

      /*
       * Si el usuario solicita que la asignación quede
       * predeterminada, primero quitamos la marca de las demás.
       */
      if (perfilPredeterminado) {
        await establecerPerfilPredeterminado(
          supabase,
          id,
          asignacionId
        );
      }

      const {
        data: asignacionActualizada,
        error: updateAsignacionError,
      } = await supabase
        .from("usuarios_asignaciones")
        .update({
          cargo_id: datos.cargoId,
          rol_id: datos.rolId,
          activo:
            esBooleano(body.activo)
              ? body.activo
              : Boolean(
                  asignacionExistente.activo
                ),
          perfil_predeterminado:
            perfilPredeterminado,
        })
        .eq("id", asignacionId)
        .eq("usuario_id", id)
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
        .single();

      if (updateAsignacionError) {
        return jsonError(
          updateAsignacionError.message,
          500
        );
      }

      asignacionFinal =
        asignacionActualizada;

      accionAsignacion = "actualizada";

      /*
       * Si la asignación fue desactivada y era predeterminada,
       * establecemos otra activa como predeterminada.
       */
      if (
        !asignacionActualizada.activo &&
        asignacionActualizada.perfil_predeterminado
      ) {
        const alternativa =
          asignaciones.find(
            (a: any) =>
              a.id !== asignacionId &&
              a.activo === true
          );

        if (alternativa) {
          await establecerPerfilPredeterminado(
            supabase,
            id,
            alternativa.id
          );
        }
      }
    }

    /* ========================================================
       CASO B: NO SE INDICA asignacion_id
       --------------------------------------------------------
       Este es el comportamiento que permite agregar un NUEVO
       cargo a un usuario existente sin reemplazar los demás.
    ======================================================== */

    else {
      const mismaAsignacion =
        asignaciones.find(
          (a: any) =>
            a.cargo_id === datos.cargoId &&
            a.rol_id === datos.rolId
        );

      if (mismaAsignacion) {
        /*
         * La combinación cargo + rol ya existe.
         * No creamos un duplicado.
         */
        asignacionFinal =
          mismaAsignacion;

        accionAsignacion =
          "reutilizada";

        if (
          solicitaPredeterminado === true
        ) {
          await establecerPerfilPredeterminado(
            supabase,
            id,
            mismaAsignacion.id
          );
        }

        if (
          esBooleano(body.activo) &&
          body.activo !==
            mismaAsignacion.activo
        ) {
          const {
            error: activarError,
          } = await supabase
            .from("usuarios_asignaciones")
            .update({
              activo: body.activo,
            })
            .eq(
              "id",
              mismaAsignacion.id
            )
            .eq(
              "usuario_id",
              id
            );

          if (activarError) {
            return jsonError(
              activarError.message,
              500
            );
          }
        }
      } else {
        /*
         * NUEVA ASIGNACIÓN:
         * se agrega a usuarios_asignaciones y NO se toca ninguna
         * de las asignaciones existentes.
         */
        let perfilPredeterminado =
          solicitaPredeterminado === true;

        /*
         * Si el usuario no tiene ninguna asignación activa,
         * la primera debe quedar como predeterminada.
         */
        const tieneActiva =
          asignaciones.some(
            (a: any) =>
              a.activo === true
          );

        if (!tieneActiva) {
          perfilPredeterminado = true;
        }

        if (perfilPredeterminado) {
          const {
            error: limpiarError,
          } = await supabase
            .from("usuarios_asignaciones")
            .update({
              perfil_predeterminado: false,
            })
            .eq("usuario_id", id);

          if (limpiarError) {
            return jsonError(
              limpiarError.message,
              500
            );
          }
        }

        const {
          data: nuevaAsignacion,
          error: nuevaAsignacionError,
        } = await supabase
          .from("usuarios_asignaciones")
          .insert({
            usuario_id: id,
            cargo_id: datos.cargoId,
            rol_id: datos.rolId,
            activo:
              esBooleano(body.activo)
                ? body.activo
                : true,
            perfil_predeterminado:
              perfilPredeterminado,
          })
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
          .single();

        if (nuevaAsignacionError) {
          /*
           * Si la BD tiene una restricción de unicidad sobre
           * usuario + cargo + rol, devolvemos un mensaje claro
           * en lugar de generar un error técnico.
           */
          const mensaje =
            nuevaAsignacionError.message || "";

          if (
            mensaje
              .toLowerCase()
              .includes("duplicate") ||
            mensaje
              .toLowerCase()
              .includes("unique")
          ) {
            return jsonError(
              "El usuario ya tiene una asignación con el cargo y rol seleccionados.",
              409
            );
          }

          return jsonError(
            mensaje,
            500
          );
        }

        asignacionFinal =
          nuevaAsignacion;

        accionAsignacion = "creada";
      }
    }

    /* ========================================================
       SINCRONIZAR PERFIL PREDETERMINADO / usuarios.cargo_id
    ======================================================== */

    const predeterminada =
      await sincronizarCargoPrincipal(
        supabase,
        id,
        actor.profile.id
      );

    /* ========================================================
       RESPUESTA
    ======================================================== */

    const asignacionesFinales =
      await obtenerAsignaciones(
        supabase,
        id
      );

    return jsonOk({
      success: true,
      message:
        accionAsignacion === "creada"
          ? "Usuario actualizado y nueva asignación creada correctamente."
          : accionAsignacion === "actualizada"
            ? "Usuario y asignación actualizados correctamente."
            : "Usuario actualizado correctamente. La asignación indicada ya existía.",
      usuario,
      asignacion: asignacionFinal,
      asignacion_id:
        asignacionFinal?.id || null,
      accion_asignacion:
        accionAsignacion,
      perfil_predeterminado:
        predeterminada,
      asignaciones:
        asignacionesFinales,
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
    params: Promise<{ id: string }>;
  }
) {
  try {
    const actor = await getProfileFromBearer(request);

    if (!actor) {
      return jsonError("Sesión no válida.", 401);
    }

    const { id } = await context.params;

    if (!id) {
      return jsonError(
        "El ID del usuario es obligatorio.",
        400
      );
    }

    const supabase = supabaseAdmin();

    const {
      data: usuario,
      error: usuarioError,
    } = await supabase
      .from("usuarios")
      .select(
        "id,auth_user_id,nombres,apellidos,razon_social"
      )
      .eq("id", id)
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

    /*
     * Un usuario con asignaciones activas no se elimina.
     * Debe desactivarse mediante /estado.
     */
    const {
      data: asignaciones,
      error: asignacionesError,
    } = await supabase
      .from("usuarios_asignaciones")
      .select("id")
      .eq("usuario_id", id)
      .eq("activo", true);

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

    /*
     * Eliminamos asignaciones históricas inactivas.
     */
    const {
      error: deleteAsignacionesError,
    } = await supabase
      .from("usuarios_asignaciones")
      .delete()
      .eq("usuario_id", id);

    if (deleteAsignacionesError) {
      return jsonError(
        deleteAsignacionesError.message,
        500
      );
    }

    /*
     * Eliminar registro institucional.
     */
    const {
      error: deleteUsuarioError,
    } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", id);

    if (deleteUsuarioError) {
      return jsonError(
        `No fue posible eliminar el usuario: ${deleteUsuarioError.message}`,
        409
      );
    }

    /*
     * Eliminar usuario de Auth.
     */
    if (usuario.auth_user_id) {
      const {
        error: authDeleteError,
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
      success: true,
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