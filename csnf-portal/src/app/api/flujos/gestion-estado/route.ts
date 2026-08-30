import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ESTADOS_FLUJO = {
  PENDIENTE: "f33e7727-4998-4b4d-9245-23502dd8b293",
  EN_CURSO: "dbb08020-424a-4cf3-84b3-a3d975a088f0",
  RECHAZADO: "597ddc01-1f85-4af7-a6d6-574d5bdde23b",
  FINALIZADO: "20f8a732-9779-465f-af15-b4f62cd3745f",
  CANCELADO: "925e2cd5-62e5-4313-bb27-cf487af69bb2",
};

const ESTADOS_FIRMANTE = {
  PENDIENTE: "6f1665c2-3194-462c-aa5b-a44a786978aa",
  HABILITADO: "7c4a1357-733f-468b-9208-8f46acf386e5",
  DOCUMENTO_CARGADO: "7fa80abc-621b-44d1-8b11-0e92b20f577a",
};

const ESTADOS_FIRMANTE_PROCESADOS = new Set([
  "e8107f56-0f26-4ab6-aff1-4c73530f134a",
  "62a7203b-dfff-463d-92d6-819cbf9e9ade",
]);

type Accion = "desactivar" | "reanudar" | "reiniciar" | "eliminar";

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const flujoId = String(body?.flujo_id || "").trim();
    const usuarioId = String(body?.usuario_id || "").trim();
    const accion = String(body?.accion || "").trim() as Accion;

    if (!flujoId || !usuarioId || !accion) {
      return errorResponse("Faltan flujo_id, usuario_id o accion.");
    }

    if (!["desactivar", "reanudar", "reiniciar", "eliminar"].includes(accion)) {
      return errorResponse(
        'La acción debe ser "desactivar", "reanudar", "reiniciar" o "eliminar".'
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const db = supabase as any;

    const { data: flujo, error: flujoError } = await db
      .from("documentos_flujos")
      .select(
        "id, numero_flujo, documento_id, iniciado_por, estado, estado_flujo_id, fecha_fin"
      )
      .eq("id", flujoId)
      .single();

    if (flujoError || !flujo) {
      return errorResponse("No se encontró el flujo especificado.", 404);
    }

    if (flujo.iniciado_por !== usuarioId) {
      return errorResponse(
        "Solo el creador del flujo puede realizar esta operación.",
        403
      );
    }

    if (accion === "desactivar") {
      if (
        flujo.estado_flujo_id === ESTADOS_FLUJO.FINALIZADO ||
        flujo.estado_flujo_id === ESTADOS_FLUJO.RECHAZADO
      ) {
        return errorResponse(
          "Un flujo finalizado o rechazado no puede desactivarse.",
          409
        );
      }

      if (flujo.estado_flujo_id === ESTADOS_FLUJO.CANCELADO) {
        return errorResponse("El flujo ya está desactivado.", 409);
      }

      const { error: updateError } = await db
        .from("documentos_flujos")
        .update({
          // Se conserva CANCELADO como estado técnico porque es el único
          // estado existente que el endpoint de procesamiento reconoce como
          // no procesable. El texto distingue la pausa de un borrado.
          estado: "Desactivado",
          estado_flujo_id: ESTADOS_FLUJO.CANCELADO,
          updated_at: new Date().toISOString(),
        })
        .eq("id", flujoId);

      if (updateError) {
        throw new Error(`Error desactivando el flujo: ${updateError.message}`);
      }

      await db
        .from("notificaciones")
        .update({ leida: true })
        .eq("entidad_tipo", "documentos_flujos")
        .eq("entidad_id", flujoId)
        .eq("tipo", "APROBACION_PENDIENTE")
        .eq("leida", false);

      await db.from("documentos_flujos_historial").insert({
        documento_flujo_id: flujoId,
        usuario_id: usuarioId,
        accion: "Flujo desactivado",
        observacion: "El creador pausó temporalmente el flujo.",
      });

      return NextResponse.json({
        success: true,
        message: "Flujo desactivado correctamente. Puede reanudarse posteriormente.",
        flujo_id: flujoId,
        estado: "Desactivado",
        estado_flujo_id: ESTADOS_FLUJO.CANCELADO,
      });
    }

    if (accion === "reanudar") {
      if (flujo.estado_flujo_id !== ESTADOS_FLUJO.CANCELADO) {
        return errorResponse("El flujo no está desactivado.", 409);
      }

      const { data: firmantes, error: firmantesError } = await db
        .from("documentos_firmantes")
        .select(
          "id, usuario_id, orden, fecha_aprobacion, fecha_rechazo, estado_firmante_id"
        )
        .eq("flujo_id", flujoId)
        .order("orden", { ascending: true });

      if (firmantesError) {
        throw new Error(`Error obteniendo firmantes: ${firmantesError.message}`);
      }

      const pendientes = (firmantes || []).filter(
        (f: any) =>
          !f.fecha_aprobacion &&
          !f.fecha_rechazo &&
          !ESTADOS_FIRMANTE_PROCESADOS.has(f.estado_firmante_id)
      );

      if (pendientes.length === 0) {
        return errorResponse(
          "No hay ningún firmante pendiente para reanudar el flujo.",
          409
        );
      }

      const siguiente = pendientes.sort(
        (a: any, b: any) => a.orden - b.orden
      )[0];

      await db
        .from("documentos_firmantes")
        .update({
          estado_firmante_id: ESTADOS_FIRMANTE.PENDIENTE,
        })
        .eq("flujo_id", flujoId)
        .in(
          "estado_firmante_id",
          [ESTADOS_FIRMANTE.HABILITADO, ESTADOS_FIRMANTE.DOCUMENTO_CARGADO]
        );

      const { error: habilitarError } = await db
        .from("documentos_firmantes")
        .update({
          estado_firmante_id: ESTADOS_FIRMANTE.HABILITADO,
          fecha_habilitacion: new Date().toISOString(),
        })
        .eq("id", siguiente.id);

      if (habilitarError) {
        throw new Error(`Error habilitando el firmante: ${habilitarError.message}`);
      }

      const { error: flujoUpdateError } = await db
        .from("documentos_flujos")
        .update({
          estado: "En curso",
          estado_flujo_id: ESTADOS_FLUJO.EN_CURSO,
          fecha_fin: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", flujoId);

      if (flujoUpdateError) {
        throw new Error(`Error reanudando el flujo: ${flujoUpdateError.message}`);
      }

      await db
        .from("notificaciones")
        .update({ leida: true })
        .eq("entidad_tipo", "documentos_flujos")
        .eq("entidad_id", flujoId)
        .eq("tipo", "APROBACION_PENDIENTE")
        .eq("leida", false);

      await db.from("notificaciones").insert({
        usuario_id: siguiente.usuario_id,
        tipo: "APROBACION_PENDIENTE",
        titulo: "Flujo reanudado",
        mensaje: `El flujo #${flujo.numero_flujo} fue reanudado y requiere tu firma o aprobación (Paso #${siguiente.orden}).`,
        entidad_tipo: "documentos_flujos",
        entidad_id: flujoId,
        url: "/principal/flujo-aprobaciones",
        leida: false,
      });

      await db.from("documentos_flujos_historial").insert({
        documento_flujo_id: flujoId,
        usuario_id: usuarioId,
        accion: "Flujo reanudado",
        observacion: `Se reanudó el flujo en el paso #${siguiente.orden}.`,
      });

      return NextResponse.json({
        success: true,
        message: "Flujo reanudado correctamente.",
        flujo_id: flujoId,
        siguiente_firmante_id: siguiente.id,
        siguiente_orden: siguiente.orden,
        estado: "En curso",
        estado_flujo_id: ESTADOS_FLUJO.EN_CURSO,
      });
    }

    if (accion === "reiniciar") {
      if (flujo.estado_flujo_id === ESTADOS_FLUJO.FINALIZADO) {
        return errorResponse("Un flujo finalizado no puede reiniciarse.", 409);
      }

      const { data: firmantes, error: firmantesError } = await db
        .from("documentos_firmantes")
        .select("id, usuario_id, orden, fecha_aprobacion, fecha_rechazo")
        .eq("flujo_id", flujoId)
        .order("orden", { ascending: true });

      if (firmantesError) {
        throw new Error(`Error obteniendo firmantes: ${firmantesError.message}`);
      }

      if (!firmantes || firmantes.length === 0) {
        return errorResponse("El flujo no tiene firmantes configurados.", 409);
      }

      const ahora = new Date().toISOString();

      const { error: resetError } = await db
        .from("documentos_firmantes")
        .update({
          estado_firmante_id: ESTADOS_FIRMANTE.PENDIENTE,
          fecha_habilitacion: null,
          fecha_aprobacion: null,
          fecha_rechazo: null,
          observaciones: null,
          version_documento_id: null,
        })
        .eq("flujo_id", flujoId);

      if (resetError) {
        throw new Error(`Error reiniciando firmantes: ${resetError.message}`);
      }

      const primero = [...firmantes].sort(
        (a: any, b: any) => a.orden - b.orden
      )[0];

      const { error: firstError } = await db
        .from("documentos_firmantes")
        .update({
          estado_firmante_id: ESTADOS_FIRMANTE.HABILITADO,
          fecha_habilitacion: ahora,
        })
        .eq("id", primero.id);

      if (firstError) {
        throw new Error(`Error habilitando el primer firmante: ${firstError.message}`);
      }

      const { error: flujoUpdateError } = await db
        .from("documentos_flujos")
        .update({
          estado: "En curso",
          estado_flujo_id: ESTADOS_FLUJO.EN_CURSO,
          fecha_fin: null,
          motivo_rechazo: null,
          updated_at: ahora,
        })
        .eq("id", flujoId);

      if (flujoUpdateError) {
        throw new Error(`Error reiniciando el flujo: ${flujoUpdateError.message}`);
      }

      await db
        .from("notificaciones")
        .update({ leida: true })
        .eq("entidad_tipo", "documentos_flujos")
        .eq("entidad_id", flujoId)
        .eq("tipo", "APROBACION_PENDIENTE")
        .eq("leida", false);

      await db.from("notificaciones").insert({
        usuario_id: primero.usuario_id,
        tipo: "APROBACION_PENDIENTE",
        titulo: "Flujo reiniciado",
        mensaje: `El flujo #${flujo.numero_flujo} fue reiniciado y requiere tu firma o aprobación (Paso #${primero.orden}).`,
        entidad_tipo: "documentos_flujos",
        entidad_id: flujoId,
        url: "/principal/flujo-aprobaciones",
        leida: false,
      });

      await db.from("documentos_flujos_historial").insert({
        documento_flujo_id: flujoId,
        usuario_id: usuarioId,
        accion: "Flujo reiniciado",
        observacion: "Se reiniciaron los pasos de aprobación desde el primer firmante.",
      });

      return NextResponse.json({
        success: true,
        message: "Flujo reiniciado correctamente desde el primer firmante.",
        flujo_id: flujoId,
        primer_firmante_id: primero.id,
        primer_orden: primero.orden,
        estado: "En curso",
        estado_flujo_id: ESTADOS_FLUJO.EN_CURSO,
      });
    }

    // eliminar
    if (
      flujo.estado_flujo_id === ESTADOS_FLUJO.FINALIZADO ||
      flujo.estado_flujo_id === ESTADOS_FLUJO.RECHAZADO
    ) {
      return errorResponse(
        "Un flujo finalizado o rechazado no puede eliminarse desde esta gestión.",
        409
      );
    }

    const { data: versiones, error: versionesError } = await db
      .from("flujos_versiones")
      .select("storage_path")
      .eq("flujo_id", flujoId);

    if (versionesError) {
      throw new Error(`Error obteniendo versiones: ${versionesError.message}`);
    }

    const storagePaths = (versiones || [])
      .map((v: any) => v.storage_path)
      .filter(Boolean);

    // El documento definitivo NO se elimina: puede tener relaciones con otros módulos.
    // Solo se eliminan los datos propios del flujo.
    const childDeletes = [
      ["notificaciones_flujos", "documento_flujo_id"],
      ["documentos_flujos_historial", "documento_flujo_id"],
      ["documentos_firmantes", "flujo_id"],
      ["flujos_versiones", "flujo_id"],
      ["notificaciones", "entidad_id"],
    ] as const;

    const { error: notificacionesError } = await db
      .from("notificaciones")
      .delete()
      .eq("entidad_tipo", "documentos_flujos")
      .eq("entidad_id", flujoId);

    if (notificacionesError) {
      throw new Error(
        `Error eliminando notificaciones del flujo: ${notificacionesError.message}`
      );
    }

    for (const [table, column] of childDeletes.slice(0, 4)) {
      const { error } = await db.from(table).delete().eq(column, flujoId);
      if (error && !String(error.message).toLowerCase().includes("does not exist")) {
        throw new Error(`Error eliminando datos de ${table}: ${error.message}`);
      }
    }

    const { error: flujoDeleteError } = await db
      .from("documentos_flujos")
      .delete()
      .eq("id", flujoId);

    if (flujoDeleteError) {
      throw new Error(`Error eliminando el flujo: ${flujoDeleteError.message}`);
    }

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("documentos")
        .remove(storagePaths);

      if (storageError) {
        console.error("No se pudieron eliminar algunos archivos de Storage:", storageError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Flujo eliminado correctamente.",
      flujo_id: flujoId,
    });
  } catch (error: any) {
    console.error("Error en /api/flujos/gestion-estado:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}