import { NextRequest } from "next/server";
import {
  supabaseAdmin,
  getProfileFromBearer,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

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

function normalizarCodigo(value: unknown): string {
  return texto(value).toUpperCase();
}

function errorMessage(error: any): string {
  return error?.message || "Error inesperado.";
}

function nombreUsuario(usuario: AnyRecord): string {
  const razon = texto(usuario?.razon_social);

  if (razon) {
    return razon;
  }

  const nombre = `${texto(
    usuario?.nombres
  )} ${texto(usuario?.apellidos)}`.trim();

  return nombre || "Usuario";
}

/* ============================================================
   GET /api/usuarios
============================================================ */

export async function GET(request: NextRequest) {
  try {
    const actor =
      await getProfileFromBearer(request);

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const supabase =
      supabaseAdmin();

    const { searchParams } =
      new URL(request.url);

    const busqueda =
      texto(
        searchParams.get("busqueda")
      );

    const soloActivos =
      searchParams.get(
        "solo_activos"
      ) === "true";

    let query = supabase
      .from("usuarios")
      .select(`
        id,
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
        created_by,
        updated_by,
        created_at,
        updated_at,
        auth_user_id,
        foto_url,
        cargo_id,
        clave_repositorio,
        puede_iniciar_flujos,
        email,

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
      .order("created_at", {
        ascending: false,
      });

    /* ----------------------------------------------------------
       SOLO ACTIVOS
    ---------------------------------------------------------- */

    if (soloActivos) {
      const {
        data: estadosActivos,
        error: estadosError,
      } = await supabase
        .from("estados_usuario")
        .select("id")
        .eq("activo", true);

      if (estadosError) {
        return jsonError(
          estadosError.message,
          500
        );
      }

      const ids =
        (estadosActivos || [])
          .map((e) => e.id)
          .filter(Boolean);

      if (!ids.length) {
        return jsonOk({
          usuarios: [],
        });
      }

      query =
        query.in(
          "estado_usuario_id",
          ids
        );
    }

    /* ----------------------------------------------------------
       BÚSQUEDA
    ---------------------------------------------------------- */

    if (busqueda) {
      const termino =
        busqueda.replace(
          /[%_]/g,
          "\\$&"
        );

      query = query.or(
        [
          `nombres.ilike.%${termino}%`,
          `apellidos.ilike.%${termino}%`,
          `razon_social.ilike.%${termino}%`,
          `email.ilike.%${termino}%`,
          `numero_identificacion.ilike.%${termino}%`,
          `telefono.ilike.%${termino}%`,
        ].join(",")
      );
    }

    const {
      data: usuarios,
      error,
    } = await query;

    if (error) {
      console.error(
        "GET /api/usuarios:",
        error
      );

      return jsonError(
        `No fue posible obtener los usuarios: ${error.message}`,
        500
      );
    }

    const usuarioIds =
      (usuarios || [])
        .map((u) => u.id)
        .filter(Boolean);

    let asignaciones: AnyRecord[] = [];

    if (usuarioIds.length) {
      const {
        data,
        error: asignacionesError,
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
        .in(
          "usuario_id",
          usuarioIds
        );

      if (asignacionesError) {
        return jsonError(
          `No fue posible obtener las asignaciones: ${asignacionesError.message}`,
          500
        );
      }

      asignaciones =
        data || [];
    }

    const asignacionesPorUsuario =
      new Map<
        string,
        AnyRecord[]
      >();

    for (
      const asignacion
      of asignaciones
    ) {
      const lista =
        asignacionesPorUsuario.get(
          asignacion.usuario_id
        ) || [];

      lista.push(
        asignacion
      );

      asignacionesPorUsuario.set(
        asignacion.usuario_id,
        lista
      );
    }

    const resultado =
      (usuarios || []).map(
        (usuario: AnyRecord) => {
          const asignacionesUsuario =
            asignacionesPorUsuario.get(
              usuario.id
            ) || [];

          const asignacionPredeterminada =
            asignacionesUsuario.find(
              (a) =>
                a.activo === true &&
                a.perfil_predeterminado === true
            ) ||
            asignacionesUsuario.find(
              (a) =>
                a.activo === true
            ) ||
            null;

          return {
            ...usuario,

            nombre_mostrar:
              nombreUsuario(
                usuario
              ),

            asignacion_predeterminada:
              asignacionPredeterminada,

            asignaciones:
              asignacionesUsuario,
          };
        }
      );

    return jsonOk({
      usuarios:
        resultado,
    });
  } catch (error: any) {
    console.error(
      "GET /api/usuarios:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}

/* ============================================================
   POST /api/usuarios

   REGLA DE NEGOCIO:
   - Una persona/identidad existe una sola vez en `usuarios`.
   - Una persona puede tener múltiples registros en
     `usuarios_asignaciones` (cargo + rol).
   - Si la identificación ya existe, NO se crea otro usuario de
     Supabase Auth ni otro registro en `usuarios`: se agrega o
     reactiva una asignación.
============================================================ */

export async function POST(
  request: NextRequest
) {
  let authUserId: string | null = null;
  let usuarioCreadoId: string | null = null;

  try {
    const actor = await getProfileFromBearer(request);

    if (!actor) {
      return jsonError("Sesión no válida.", 401);
    }

    const supabase = supabaseAdmin();

    let body: AnyRecord;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400
      );
    }

    const email = normalizarEmail(body.email);
    const password = texto(body.password);
    const tipoPersonaId = texto(body.tipo_persona_id);
    const tipoIdentificacionId = texto(body.tipo_identificacion_id);
    const numeroIdentificacion = texto(body.numero_identificacion);
    const nombres = texto(body.nombres);
    const apellidos = texto(body.apellidos);
    const razonSocial = texto(body.razon_social);
    const telefono = nullable(body.telefono);
    const direccion = nullable(body.direccion);
    const fechaIngreso = nullable(body.fecha_ingreso);
    const fechaRetiro = nullable(body.fecha_retiro);
    const departamentoId = nullable(body.departamento_id);
    const cargoId = nullable(body.cargo_id);
    const rolId = texto(body.rol_id);
    const estadoUsuarioId = texto(body.estado_usuario_id);
    const claveRepositorio = nullable(body.clave_repositorio);
    const puedeIniciarFlujos = body.puede_iniciar_flujos === true;
    const perfilPredeterminado = body.perfil_predeterminado !== false;

    /* ----------------------------------------------------------
       VALIDACIONES COMUNES
    ---------------------------------------------------------- */

    if (!numeroIdentificacion) {
      return jsonError(
        "El número de identificación es obligatorio.",
        400
      );
    }

    if (!cargoId) {
      return jsonError(
        "El cargo es obligatorio.",
        400
      );
    }

    if (!rolId) {
      return jsonError(
        "El rol del sistema es obligatorio.",
        400
      );
    }

    if (!estadoUsuarioId) {
      return jsonError(
        "El estado del usuario es obligatorio.",
        400
      );
    }

    /* ----------------------------------------------------------
       BUSCAR PERSONA EXISTENTE

       La identificación identifica a la persona, no a la
       asignación. Por eso una coincidencia NO es un error:
       significa que debemos agregar otro cargo/rol.
    ---------------------------------------------------------- */

    const {
      data: usuarioExistente,
      error: identificacionError,
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
        puede_iniciar_flujos
      `)
      .eq("numero_identificacion", numeroIdentificacion)
      .maybeSingle();

    if (identificacionError) {
      return jsonError(
        `No fue posible consultar el usuario existente: ${identificacionError.message}`,
        500
      );
    }

    const esNuevaPersona = !usuarioExistente;

    /* ----------------------------------------------------------
       PERSONA NUEVA

       Para una persona nueva sí son obligatorios correo y
       contraseña porque debemos crear su identidad en Auth.
    ---------------------------------------------------------- */

    let tipoPersonaFinal = tipoPersonaId;
    let tipoIdentificacionFinal = tipoIdentificacionId;
    let estadoUsuarioFinal = estadoUsuarioId;
    let nombresFinal = nombres;
    let apellidosFinal = apellidos;
    let razonSocialFinal = razonSocial;

    if (esNuevaPersona) {
      if (!email) {
        return jsonError(
          "El correo electrónico es obligatorio para crear un usuario nuevo.",
          400
        );
      }

      if (!password) {
        return jsonError(
          "La contraseña es obligatoria para crear un usuario nuevo.",
          400
        );
      }

      if (password.length < 6) {
        return jsonError(
          "La contraseña debe tener mínimo 6 caracteres.",
          400
        );
      }

      if (!tipoPersonaFinal) {
        return jsonError(
          "El tipo de persona es obligatorio.",
          400
        );
      }

      if (!tipoIdentificacionFinal) {
        return jsonError(
          "El tipo de identificación es obligatorio.",
          400
        );
      }
    } else {
      /* --------------------------------------------------------
         PERSONA EXISTENTE

         Los datos de identidad se conservan desde `usuarios`.
         No creamos Auth nuevamente y no modificamos datos
         personales solo por agregar un cargo.
      -------------------------------------------------------- */

      tipoPersonaFinal =
        usuarioExistente.tipo_persona_id || tipoPersonaFinal;

      tipoIdentificacionFinal =
        usuarioExistente.tipo_identificacion_id ||
        tipoIdentificacionFinal;

      estadoUsuarioFinal =
        usuarioExistente.estado_usuario_id || estadoUsuarioFinal;

      nombresFinal =
        usuarioExistente.nombres || nombresFinal;

      apellidosFinal =
        usuarioExistente.apellidos || apellidosFinal;

      razonSocialFinal =
        usuarioExistente.razon_social || razonSocialFinal;

      if (email && usuarioExistente.email &&
          normalizarEmail(usuarioExistente.email) !== email) {
        return jsonError(
          "La identificación ya pertenece a un usuario con otro correo electrónico. Para agregar un cargo no debe cambiarse la identidad del usuario.",
          409
        );
      }
    }

    /* ----------------------------------------------------------
       TIPO PERSONA
    ---------------------------------------------------------- */

    const {
      data: tipoPersona,
      error: tipoPersonaError,
    } = await supabase
      .from("tipos_persona")
      .select("id,codigo,nombre,activo")
      .eq("id", tipoPersonaFinal)
      .maybeSingle();

    if (tipoPersonaError) {
      return jsonError(tipoPersonaError.message, 500);
    }

    if (!tipoPersona) {
      return jsonError(
        "El tipo de persona seleccionado no existe.",
        400
      );
    }

    if (!tipoPersona.activo) {
      return jsonError(
        "El tipo de persona seleccionado está inactivo.",
        400
      );
    }

    const codigoTipoPersona = normalizarCodigo(tipoPersona.codigo);
    const nombreTipoPersona = normalizarCodigo(tipoPersona.nombre);

    const esJuridica =
      codigoTipoPersona.includes("JUR") ||
      nombreTipoPersona.includes("JURID") ||
      nombreTipoPersona.includes("EMPRESA");

    if (esJuridica) {
      if (!razonSocialFinal) {
        return jsonError(
          "La razón social es obligatoria para una persona jurídica.",
          400
        );
      }
    } else {
      if (!nombresFinal) {
        return jsonError(
          "Los nombres son obligatorios.",
          400
        );
      }

      if (!apellidosFinal) {
        return jsonError(
          "Los apellidos son obligatorios.",
          400
        );
      }
    }

    /* ----------------------------------------------------------
       TIPO IDENTIFICACIÓN
    ---------------------------------------------------------- */

    const {
      data: tipoIdentificacion,
      error: tipoIdentificacionError,
    } = await supabase
      .from("tipos_identificacion")
      .select("id,codigo,nombre,activo,tipo_persona_id")
      .eq("id", tipoIdentificacionFinal)
      .maybeSingle();

    if (tipoIdentificacionError) {
      return jsonError(
        tipoIdentificacionError.message,
        500
      );
    }

    if (!tipoIdentificacion) {
      return jsonError(
        "El tipo de identificación seleccionado no existe.",
        400
      );
    }

    if (!tipoIdentificacion.activo) {
      return jsonError(
        "El tipo de identificación seleccionado está inactivo.",
        400
      );
    }

    if (
      tipoIdentificacion.tipo_persona_id &&
      tipoIdentificacion.tipo_persona_id !== tipoPersonaFinal
    ) {
      return jsonError(
        "El tipo de identificación no corresponde al tipo de persona seleccionado.",
        400
      );
    }

    /* ----------------------------------------------------------
       ESTADO DEL USUARIO
    ---------------------------------------------------------- */

    const {
      data: estado,
      error: estadoError,
    } = await supabase
      .from("estados_usuario")
      .select("id,codigo,nombre,activo")
      .eq("id", estadoUsuarioFinal)
      .maybeSingle();

    if (estadoError) {
      return jsonError(estadoError.message, 500);
    }

    if (!estado) {
      return jsonError(
        "El estado seleccionado no existe.",
        400
      );
    }

    if (!estado.activo) {
      return jsonError(
        "El estado seleccionado está inactivo.",
        400
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
      .select("id,nombre,activo,area_id")
      .eq("id", departamentoId)
      .maybeSingle();

    if (departamentoError) {
      return jsonError(
        departamentoError.message,
        500
      );
    }

    if (!departamento) {
      return jsonError(
        "El departamento seleccionado no existe.",
        400
      );
    }

    if (!departamento.activo) {
      return jsonError(
        "No se puede asignar un usuario a un departamento inactivo.",
        400
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
      .select("id,nombre,departamento_id,activo")
      .eq("id", cargoId)
      .maybeSingle();

    if (cargoError) {
      return jsonError(cargoError.message, 500);
    }

    if (!cargo) {
      return jsonError(
        "El cargo seleccionado no existe.",
        400
      );
    }

    if (!cargo.activo) {
      return jsonError(
        "No se puede asignar un cargo inactivo.",
        400
      );
    }

    if (cargo.departamento_id !== departamentoId) {
      return jsonError(
        "El cargo seleccionado no pertenece al departamento seleccionado.",
        400
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
      .select("id,codigo,nombre,activo")
      .eq("id", rolId)
      .maybeSingle();

    if (rolError) {
      return jsonError(rolError.message, 500);
    }

    if (!rol) {
      return jsonError(
        "El rol seleccionado no existe.",
        400
      );
    }

    if (!rol.activo) {
      return jsonError(
        "El rol seleccionado está inactivo.",
        400
      );
    }

    /* ----------------------------------------------------------
       PERSONA EXISTENTE → AGREGAR/REACTIVAR ASIGNACIÓN
    ---------------------------------------------------------- */

    if (!esNuevaPersona) {
      const usuarioId = usuarioExistente.id;

      const {
        data: asignaciones,
        error: asignacionesError,
      } = await supabase
        .from("usuarios_asignaciones")
        .select(`
          id,
          usuario_id,
          cargo_id,
          rol_id,
          activo,
          perfil_predeterminado
        `)
        .eq("usuario_id", usuarioId);

      if (asignacionesError) {
        return jsonError(
          `No fue posible consultar las asignaciones existentes: ${asignacionesError.message}`,
          500
        );
      }

      const asignacionMisma =
        (asignaciones || []).find(
          (a) =>
            a.cargo_id === cargoId &&
            a.rol_id === rolId
        );

      /* --------------------------------------------------------
         SI YA EXISTE LA MISMA COMBINACIÓN
      -------------------------------------------------------- */

      if (asignacionMisma) {
        if (asignacionMisma.activo) {
          return jsonError(
            "El usuario ya tiene asignado ese cargo y rol.",
            409
          );
        }

        /* ------------------------------------------------------
           SI EXISTÍA PERO ESTABA INACTIVA → REACTIVAR
        ------------------------------------------------------ */

        if (perfilPredeterminado) {
          const { error: quitarPredeterminadosError } =
            await supabase
              .from("usuarios_asignaciones")
              .update({ perfil_predeterminado: false })
              .eq("usuario_id", usuarioId)
              .eq("activo", true);

          if (quitarPredeterminadosError) {
            return jsonError(
              `No fue posible actualizar el perfil predeterminado: ${quitarPredeterminadosError.message}`,
              500
            );
          }
        }

        const { data: asignacionReactivada, error: reactivarError } =
          await supabase
            .from("usuarios_asignaciones")
            .update({
              activo: true,
              perfil_predeterminado: perfilPredeterminado,
            })
            .eq("id", asignacionMisma.id)
            .select(`
              id,
              usuario_id,
              cargo_id,
              rol_id,
              activo,
              perfil_predeterminado
            `)
            .single();

        if (reactivarError) {
          return jsonError(
            `No fue posible reactivar la asignación: ${reactivarError.message}`,
            500
          );
        }

        if (perfilPredeterminado) {
          const { error: usuarioCargoError } = await supabase
            .from("usuarios")
            .update({
              cargo_id: cargoId,
              updated_by: actor.profile.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", usuarioId);

          if (usuarioCargoError) {
            return jsonError(
              `La asignación fue reactivada, pero no fue posible actualizar el cargo predeterminado: ${usuarioCargoError.message}`,
              500
            );
          }
        }

        return jsonOk({
          message: "La asignación existente fue reactivada correctamente.",
          usuario: usuarioExistente,
          asignacion: asignacionReactivada,
          asignacion_existente: true,
          asignacion_reactivada: true,
        });
      }

      /* --------------------------------------------------------
         NUEVA ASIGNACIÓN PARA PERSONA EXISTENTE
      -------------------------------------------------------- */

      const asignacionesActivas =
        (asignaciones || []).filter(
          (a) => a.activo === true
        );

      const tienePredeterminada =
        asignacionesActivas.some(
          (a) => a.perfil_predeterminado === true
        );

      const hacerPredeterminada =
        perfilPredeterminado || !tienePredeterminada;

      if (hacerPredeterminada) {
        const { error: quitarPredeterminadosError } =
          await supabase
            .from("usuarios_asignaciones")
            .update({ perfil_predeterminado: false })
            .eq("usuario_id", usuarioId)
            .eq("activo", true);

        if (quitarPredeterminadosError) {
          return jsonError(
            `No fue posible actualizar el perfil predeterminado: ${quitarPredeterminadosError.message}`,
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
          usuario_id: usuarioId,
          cargo_id: cargoId,
          rol_id: rolId,
          activo: true,
          perfil_predeterminado: hacerPredeterminada,
        })
        .select(`
          id,
          usuario_id,
          cargo_id,
          rol_id,
          activo,
          perfil_predeterminado
        `)
        .single();

      if (nuevaAsignacionError) {
        return jsonError(
          `No fue posible registrar la nueva asignación: ${nuevaAsignacionError.message}`,
          500
        );
      }

      if (hacerPredeterminada) {
        const { error: usuarioCargoError } = await supabase
          .from("usuarios")
          .update({
            cargo_id: cargoId,
            updated_by: actor.profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", usuarioId);

        if (usuarioCargoError) {
          return jsonError(
            `La asignación fue creada, pero no fue posible actualizar el cargo predeterminado: ${usuarioCargoError.message}`,
            500
          );
        }
      }

      return jsonOk({
        message: "La nueva asignación fue creada correctamente.",
        usuario: usuarioExistente,
        asignacion: nuevaAsignacion,
        asignacion_existente: false,
        usuario_existente: true,
      });
    }

    /* ----------------------------------------------------------
       PERSONA NUEVA → CREAR AUTH
    ---------------------------------------------------------- */

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombres: esJuridica ? null : nombresFinal,
        apellidos: esJuridica ? null : apellidosFinal,
        razon_social: esJuridica ? razonSocialFinal : null,
      },
    });

    if (authError) {
      console.error(
        "Error creando usuario Auth:",
        authError
      );

      return jsonError(authError.message, 400);
    }

    authUserId = authData.user?.id || null;

    if (!authUserId) {
      return jsonError(
        "Supabase Auth no devolvió el ID del usuario.",
        500
      );
    }

    /* ----------------------------------------------------------
       INSERT usuarios
    ---------------------------------------------------------- */

    const usuarioInsert: AnyRecord = {
      id: authUserId,
      auth_user_id: authUserId,
      email,
      tipo_persona_id: tipoPersonaFinal,
      tipo_identificacion_id: tipoIdentificacionFinal,
      numero_identificacion: numeroIdentificacion,
      nombres: esJuridica ? null : nombresFinal,
      apellidos: esJuridica ? null : apellidosFinal,
      razon_social: esJuridica ? razonSocialFinal : null,
      telefono,
      direccion,
      estado_usuario_id: estadoUsuarioFinal,
      fecha_ingreso: fechaIngreso,
      fecha_retiro: fechaRetiro,
      cargo_id: cargoId,
      clave_repositorio: claveRepositorio,
      puede_iniciar_flujos: puedeIniciarFlujos,
      created_by: actor.profile.id,
      updated_by: actor.profile.id,
    };

    const {
      data: usuario,
      error: usuarioError,
    } = await supabase
      .from("usuarios")
      .insert(usuarioInsert)
      .select("*")
      .single();

    if (usuarioError) {
      console.error(
        "Error creando registro usuarios:",
        usuarioError
      );

      await supabase.auth.admin.deleteUser(authUserId);

      return jsonError(
        usuarioError.message,
        500
      );
    }

    usuarioCreadoId = usuario.id;

    /* ----------------------------------------------------------
       ASIGNACIÓN INICIAL
    ---------------------------------------------------------- */

    const {
      data: asignacion,
      error: asignacionError,
    } = await supabase
      .from("usuarios_asignaciones")
      .insert({
        usuario_id: usuario.id,
        cargo_id: cargoId,
        rol_id: rolId,
        activo: true,
        perfil_predeterminado: true,
      })
      .select(`
        id,
        usuario_id,
        cargo_id,
        rol_id,
        activo,
        perfil_predeterminado
      `)
      .single();

    if (asignacionError) {
      console.error(
        "Error creando asignación:",
        asignacionError
      );

      await supabase
        .from("usuarios")
        .delete()
        .eq("id", usuario.id);

      await supabase.auth.admin.deleteUser(authUserId);

      return jsonError(
        `No fue posible registrar la asignación del usuario: ${asignacionError.message}`,
        500
      );
    }

    return jsonOk({
      message: "Usuario creado correctamente.",
      usuario,
      asignacion,
      usuario_existente: false,
      asignacion_existente: false,
    });
  } catch (error: any) {
    console.error(
      "POST /api/usuarios:",
      error
    );

    /*
     * Protección adicional.
     *
     * Si Auth fue creado pero ocurrió un error inesperado antes
     * de completar la creación del registro `usuarios`, intentamos
     * limpiar la identidad creada.
     */
    if (authUserId && !usuarioCreadoId) {
      try {
        await supabaseAdmin()
          .auth.admin.deleteUser(authUserId);
      } catch (rollbackError) {
        console.error(
          "Error en rollback Auth:",
          rollbackError
        );
      }
    }

    return jsonError(
      errorMessage(error),
      500
    );
  }
}