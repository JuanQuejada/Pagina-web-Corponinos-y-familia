import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Usuario = {
  id: string;
  auth_user_id: string | null;
  nombres: string | null;
  apellidos: string | null;
  razon_social: string | null;
  email: string | null;
};

type Tarea = {
  id: string;
  titulo: string;
  descripcion: string | null;
  columna_id: string | null;
  asignado_id: string | null;
  creador_id: string | null;
  prioridad: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return { url, anonKey, serviceRoleKey };
}

function getBearerToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7).trim() || null;
}

async function getContext(request: Request) {
  const { url, anonKey, serviceRoleKey } = getEnv();
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("No se recibió el token de autenticación.");
  }

  const authClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    throw new Error("La sesión no es válida o ha expirado.");
  }

  const db = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: perfil, error: perfilError } = await db
    .from("usuarios")
    .select(
      "id, auth_user_id, nombres, apellidos, razon_social, email"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (perfilError) {
    throw new Error(`No fue posible obtener el perfil: ${perfilError.message}`);
  }

  if (!perfil) {
    throw new Error("No existe un perfil de portal asociado al usuario autenticado.");
  }

  return { db, authUser: user, perfil: perfil as Usuario };
}

function nombreUsuario(usuario: Partial<Usuario> | null | undefined) {
  if (!usuario) return "Sin asignar";

  const razon = String(usuario.razon_social || "").trim();
  if (razon) return razon;

  const nombre = `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim();
  return nombre || "Usuario";
}

async function crearNotificacion(
  db: SupabaseClient,
  params: {
    usuarioId: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    tareaId: string;
  }
) {
  const { data: config } = await db
    .from("usuarios_configuracion")
    .select("notif_tareas")
    .eq("usuario_id", params.usuarioId)
    .maybeSingle();

  // Si existe configuración y el usuario desactivó las tareas,
  // respetamos su preferencia.
  if (config && config.notif_tareas === false) {
    return;
  }

  const { error } = await db.from("notificaciones").insert({
    usuario_id: params.usuarioId,
    tipo: params.tipo,
    titulo: params.titulo,
    mensaje: params.mensaje,
    entidad_tipo: "kanban_tareas",
    entidad_id: params.tareaId,
    url: `/principal/kanban?tarea_id=${params.tareaId}`,
    leida: false,
  });

  if (error) {
    // Una falla de notificación no debe deshacer la operación principal.
    console.error("Error creando notificación Kanban:", error);
  }
}

async function obtenerTareaCompleta(db: SupabaseClient, tareaId: string) {
  const { data, error } = await db
    .from("kanban_tareas")
    .select(`
      *,
      asignado:usuarios!kanban_tareas_asignado_id_fkey(
        id,
        auth_user_id,
        nombres,
        apellidos,
        razon_social,
        email
      ),
      creador:usuarios!kanban_tareas_creador_id_fkey(
        id,
        auth_user_id,
        nombres,
        apellidos,
        razon_social,
        email
      ),
      columna:kanban_columnas!kanban_tareas_columna_id_fkey(
        id,
        nombre,
        orden
      )
    `)
    .eq("id", tareaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * GET /api/kanban
 *
 * Devuelve:
 * - columnas
 * - tareas
 * - usuarios
 * - perfil actual
 *
 * También permite:
 * /api/kanban?tarea_id=UUID
 * para solicitar el detalle de una tarea.
 */
export async function GET(request: Request) {
  try {
    const { db, perfil } = await getContext(request);
    const { searchParams } = new URL(request.url);
    const tareaId = searchParams.get("tarea_id")?.trim() || "";

    if (tareaId) {
      const tarea = await obtenerTareaCompleta(db, tareaId);

      if (!tarea) {
        return errorResponse("No se encontró la tarea solicitada.", 404);
      }

      return NextResponse.json({
        success: true,
        tarea,
      });
    }

    const [columnasRes, tareasRes, usuariosRes] = await Promise.all([
      db
        .from("kanban_columnas")
        .select("id, nombre, orden, created_at")
        .order("orden", { ascending: true }),

      db
        .from("kanban_tareas")
        .select(`
          id,
          titulo,
          descripcion,
          columna_id,
          asignado_id,
          creador_id,
          prioridad,
          fecha_vencimiento,
          created_at,
          asignado:usuarios!kanban_tareas_asignado_id_fkey(
            id,
            auth_user_id,
            nombres,
            apellidos,
            razon_social,
            email
          ),
          creador:usuarios!kanban_tareas_creador_id_fkey(
            id,
            auth_user_id,
            nombres,
            apellidos,
            razon_social,
            email
          ),
          columna:kanban_columnas!kanban_tareas_columna_id_fkey(
            id,
            nombre,
            orden
          )
        `)
        .order("created_at", { ascending: false }),

      db
        .from("usuarios")
        .select(
          "id, auth_user_id, nombres, apellidos, razon_social, email"
        )
        .order("nombres", { ascending: true }),
    ]);

    if (columnasRes.error) {
      return errorResponse(
        `No fue posible cargar las columnas: ${columnasRes.error.message}`,
        500
      );
    }

    if (tareasRes.error) {
      return errorResponse(
        `No fue posible cargar las tareas: ${tareasRes.error.message}`,
        500
      );
    }

    if (usuariosRes.error) {
      return errorResponse(
        `No fue posible cargar los usuarios: ${usuariosRes.error.message}`,
        500
      );
    }

    return NextResponse.json({
      success: true,
      perfil,
      columnas: columnasRes.data || [],
      tareas: tareasRes.data || [],
      usuarios: usuariosRes.data || [],
    });
  } catch (error: any) {
    console.error("GET /api/kanban:", error);
    return errorResponse(
      error?.message || "No fue posible consultar Kanban.",
      401
    );
  }
}

/**
 * POST /api/kanban
 *
 * Crea una tarea y, si corresponde, genera una notificación
 * para el usuario asignado.
 */
export async function POST(request: Request) {
  try {
    const { db, perfil } = await getContext(request);
    const body = await request.json();

    const titulo = String(body?.titulo || "").trim();
    const descripcion = String(body?.descripcion || "").trim();
    const columnaId = String(body?.columna_id || "").trim();
    const asignadoId = String(body?.asignado_id || "").trim() || null;
    const prioridad = String(body?.prioridad || "Media").trim() || "Media";
    const fechaVencimiento =
      String(body?.fecha_vencimiento || "").trim() || null;

    if (!titulo) return errorResponse("El título de la tarea es obligatorio.");
    if (!columnaId) return errorResponse("La columna inicial es obligatoria.");

    const { data: columna, error: columnaError } = await db
      .from("kanban_columnas")
      .select("id, nombre, orden")
      .eq("id", columnaId)
      .maybeSingle();

    if (columnaError) {
      return errorResponse(
        `No fue posible validar la columna: ${columnaError.message}`,
        500
      );
    }

    if (!columna) {
      return errorResponse("La columna seleccionada no existe.", 404);
    }

    if (asignadoId) {
      const { data: asignado, error: asignadoError } = await db
        .from("usuarios")
        .select("id, nombres, apellidos, razon_social, email")
        .eq("id", asignadoId)
        .maybeSingle();

      if (asignadoError) {
        return errorResponse(
          `No fue posible validar el usuario asignado: ${asignadoError.message}`,
          500
        );
      }

      if (!asignado) {
        return errorResponse("El usuario asignado no existe.", 404);
      }
    }

    const { data: tarea, error: tareaError } = await db
      .from("kanban_tareas")
      .insert({
        titulo,
        descripcion: descripcion || null,
        columna_id: columnaId,
        asignado_id: asignadoId,
        creador_id: perfil.id,
        prioridad,
        fecha_vencimiento: fechaVencimiento,
      })
      .select("id")
      .single();

    if (tareaError || !tarea) {
      return errorResponse(
        tareaError?.message || "No fue posible crear la tarea.",
        500
      );
    }

    if (asignadoId && asignadoId !== perfil.id) {
      await crearNotificacion(db, {
        usuarioId: asignadoId,
        tipo: "KANBAN_TAREA_ASIGNADA",
        titulo: "Nueva tarea asignada",
        mensaje: `Se te ha asignado la tarea "${titulo}".`,
        tareaId: tarea.id,
      });
    }

    return NextResponse.json(
      {
        success: true,
        mensaje: "Tarea creada correctamente.",
        tarea: await obtenerTareaCompleta(db, tarea.id),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/kanban:", error);
    return errorResponse(
      error?.message || "No fue posible crear la tarea.",
      401
    );
  }
}

/**
 * PATCH /api/kanban
 *
 * Actualiza una tarea. Se usa principalmente para moverla entre
 * columnas, pero también admite editar sus campos.
 */
export async function PATCH(request: Request) {
  try {
    const { db, perfil } = await getContext(request);
    const body = await request.json();

    const tareaId = String(body?.tarea_id || "").trim();

    if (!tareaId) {
      return errorResponse("El campo tarea_id es obligatorio.");
    }

    const tareaAnterior = await obtenerTareaCompleta(db, tareaId);

    if (!tareaAnterior) {
      return errorResponse("No se encontró la tarea.", 404);
    }

    const cambios: Record<string, any> = {};

    if (body?.titulo !== undefined) {
      const titulo = String(body.titulo || "").trim();
      if (!titulo) return errorResponse("El título no puede quedar vacío.");
      cambios.titulo = titulo;
    }

    if (body?.descripcion !== undefined) {
      cambios.descripcion = String(body.descripcion || "").trim() || null;
    }

    if (body?.columna_id !== undefined) {
      const columnaId = String(body.columna_id || "").trim();

      const { data: columna } = await db
        .from("kanban_columnas")
        .select("id, nombre, orden")
        .eq("id", columnaId)
        .maybeSingle();

      if (!columna) {
        return errorResponse("La nueva columna no existe.", 404);
      }

      cambios.columna_id = columnaId;
    }

    if (body?.asignado_id !== undefined) {
      cambios.asignado_id =
        String(body.asignado_id || "").trim() || null;
    }

    if (body?.prioridad !== undefined) {
      cambios.prioridad =
        String(body.prioridad || "Media").trim() || "Media";
    }

    if (body?.fecha_vencimiento !== undefined) {
      cambios.fecha_vencimiento =
        String(body.fecha_vencimiento || "").trim() || null;
    }

    if (Object.keys(cambios).length === 0) {
      return errorResponse("No se recibieron cambios para actualizar.");
    }

    const { error: updateError } = await db
      .from("kanban_tareas")
      .update(cambios)
      .eq("id", tareaId);

    if (updateError) {
      return errorResponse(
        `No fue posible actualizar la tarea: ${updateError.message}`,
        500
      );
    }

    const tareaActualizada = await obtenerTareaCompleta(db, tareaId);

    const columnaAnterior = tareaAnterior.columna?.nombre || "Sin columna";
    const columnaNueva = tareaActualizada?.columna?.nombre || "Sin columna";

    const huboCambioColumna =
      cambios.columna_id !== undefined &&
      cambios.columna_id !== tareaAnterior.columna_id;

    const huboCambioAsignado =
      cambios.asignado_id !== undefined &&
      cambios.asignado_id !== tareaAnterior.asignado_id;

    if (huboCambioAsignado && cambios.asignado_id) {
      const nuevoAsignado = tareaActualizada?.asignado;

      if (
        cambios.asignado_id !== perfil.id &&
        nuevoAsignado?.id
      ) {
        await crearNotificacion(db, {
          usuarioId: nuevoAsignado.id,
          tipo: "KANBAN_TAREA_ASIGNADA",
          titulo: "Tarea asignada",
          mensaje: `Se te ha asignado la tarea "${tareaActualizada?.titulo}".`,
          tareaId,
        });
      }
    }

    if (
      huboCambioColumna &&
      tareaActualizada?.creador_id &&
      tareaActualizada.creador_id !== perfil.id
    ) {
      await crearNotificacion(db, {
        usuarioId: tareaActualizada.creador_id,
        tipo: "KANBAN_TAREA_ACTUALIZADA",
        titulo: "Tarea actualizada",
        mensaje: `La tarea "${tareaActualizada.titulo}" pasó de "${columnaAnterior}" a "${columnaNueva}".`,
        tareaId,
      });
    }

    // Si la tarea llegó a una columna cuyo nombre representa un
    // estado final, notificamos al creador.
    const nombreColumnaNormalizado = columnaNueva
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    const columnaFinal =
      /^(finalizado|finalizada|completado|completada|terminado|terminada|cerrado|cerrada|hecho|hecha)$/.test(
        nombreColumnaNormalizado
      );

    if (
      huboCambioColumna &&
      columnaFinal &&
      tareaActualizada?.creador_id &&
      tareaActualizada.creador_id !== perfil.id
    ) {
      await crearNotificacion(db, {
        usuarioId: tareaActualizada.creador_id,
        tipo: "KANBAN_TAREA_COMPLETADA",
        titulo: "Tarea completada",
        mensaje: `La tarea "${tareaActualizada.titulo}" fue marcada como completada.`,
        tareaId,
      });
    }

    return NextResponse.json({
      success: true,
      mensaje: "Tarea actualizada correctamente.",
      tarea: tareaActualizada,
    });
  } catch (error: any) {
    console.error("PATCH /api/kanban:", error);
    return errorResponse(
      error?.message || "No fue posible actualizar la tarea.",
      401
    );
  }
}

/**
 * DELETE /api/kanban?tarea_id=UUID
 */
export async function DELETE(request: Request) {
  try {
    const { db, perfil } = await getContext(request);
    const { searchParams } = new URL(request.url);
    const tareaId = searchParams.get("tarea_id")?.trim() || "";

    if (!tareaId) {
      return errorResponse("El parámetro tarea_id es obligatorio.");
    }

    const tarea = await obtenerTareaCompleta(db, tareaId);

    if (!tarea) {
      return errorResponse("No se encontró la tarea.", 404);
    }

    const { error } = await db
      .from("kanban_tareas")
      .delete()
      .eq("id", tareaId);

    if (error) {
      return errorResponse(
        `No fue posible eliminar la tarea: ${error.message}`,
        500
      );
    }

    // Informamos al responsable cuando el creador elimina una tarea
    // que estaba asignada a otra persona.
    if (
      tarea.asignado_id &&
      tarea.asignado_id !== perfil.id &&
      tarea.asignado_id !== tarea.creador_id
    ) {
      await crearNotificacion(db, {
        usuarioId: tarea.asignado_id,
        tipo: "KANBAN_TAREA_ELIMINADA",
        titulo: "Tarea eliminada",
        mensaje: `La tarea "${tarea.titulo}" fue eliminada del tablero.`,
        tareaId,
      });
    }

    return NextResponse.json({
      success: true,
      mensaje: "Tarea eliminada correctamente.",
    });
  } catch (error: any) {
    console.error("DELETE /api/kanban:", error);
    return errorResponse(
      error?.message || "No fue posible eliminar la tarea.",
      401
    );
  }
}