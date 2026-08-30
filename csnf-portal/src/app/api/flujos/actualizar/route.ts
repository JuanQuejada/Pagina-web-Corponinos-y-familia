import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ESTADOS_FLUJO = {
  EN_CURSO: "dbb08020-424a-4cf3-84b3-a3d975a088f0",
  FINALIZADO: "20f8a732-9779-465f-af15-b4f62cd3745f",
  RECHAZADO: "597ddc01-1f85-4af7-a6d6-574d5bdde23b",
  CANCELADO: "925e2cd5-62e5-4313-bb27-cf487af69bb2",
};

const ESTADOS_FIRMANTE = {
  PENDIENTE: "6f1665c2-3194-462c-aa5b-a44a786978aa",
  HABILITADO: "7c4a1357-733f-468b-9208-8f46acf386e5",
  DOCUMENTO_CARGADO: "7fa80abc-621b-44d1-8b11-0e92b20f577a",
};

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: Request) {
  let storagePathCreado: string | null = null;

  try {
    const formData = await request.formData();

    const flujoId = String(formData.get("flujo_id") || "").trim();
    const creadorId = String(formData.get("creador_id") || "").trim();
    const titulo = String(formData.get("titulo") || "").trim();
    const descripcion = String(formData.get("descripcion") || "").trim();
    const tipoDocumentoId = String(
      formData.get("tipo_documento_id") || ""
    ).trim();
    const firmantesRaw = String(formData.get("firmantes_ids") || "");
    const fileValue = formData.get("archivo");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (!flujoId || !creadorId || !titulo || !tipoDocumentoId) {
      return jsonError(
        "Faltan datos obligatorios: flujo_id, creador_id, titulo o tipo_documento_id."
      );
    }

    let firmantesIds: string[];
    try {
      const parsed = JSON.parse(firmantesRaw || "[]");
      firmantesIds = Array.isArray(parsed)
        ? [...new Set(parsed.map((id) => String(id).trim()).filter(Boolean))]
        : [];
    } catch {
      return jsonError("El campo firmantes_ids no contiene un JSON válido.");
    }

    if (firmantesIds.length === 0) {
      return jsonError("Debes seleccionar al menos un firmante.");
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const db = supabase as any;

    const { data: flujo, error: flujoError } = await db
      .from("documentos_flujos")
      .select(
        "id, numero_flujo, titulo, descripcion, documento_id, iniciado_por, estado, estado_flujo_id"
      )
      .eq("id", flujoId)
      .single();

    if (flujoError || !flujo) {
      return jsonError("No se encontró el flujo especificado.", 404);
    }

    if (flujo.iniciado_por !== creadorId) {
      return jsonError("Solo el creador del flujo puede editarlo.", 403);
    }

    if (
      flujo.estado_flujo_id === ESTADOS_FLUJO.FINALIZADO ||
      flujo.estado_flujo_id === ESTADOS_FLUJO.RECHAZADO
    ) {
      return jsonError("Un flujo finalizado o rechazado no puede editarse.", 409);
    }

    const { data: firmantesActuales, error: firmantesError } = await db
      .from("documentos_firmantes")
      .select(
        "id, usuario_id, orden, fecha_aprobacion, fecha_rechazo, estado_firmante_id"
      )
      .eq("flujo_id", flujoId)
      .order("orden", { ascending: true });

    if (firmantesError) {
      throw new Error(
        `Error obteniendo los firmantes actuales: ${firmantesError.message}`
      );
    }

    const yaProcesado = (firmantesActuales || []).some(
      (firmante: any) =>
        Boolean(firmante.fecha_aprobacion) ||
        Boolean(firmante.fecha_rechazo) ||
        firmante.estado_firmante_id ===
          "e8107f56-0f26-4ab6-aff1-4c73530f134a" ||
        firmante.estado_firmante_id ===
          "62a7203b-dfff-463d-92d6-819cbf9e9ade"
    );

    if (yaProcesado) {
      return jsonError(
        "El flujo ya tiene al menos un firmante procesado y no puede editarse.",
        409
      );
    }

    if (flujo.estado_flujo_id === ESTADOS_FLUJO.CANCELADO) {
      return jsonError(
        "El flujo está desactivado. Debes reanudarlo antes de editarlo.",
        409
      );
    }

    if (flujo.documento_id) {
      const { error: documentoError } = await db
        .from("documentos")
        .update({
          titulo,
          descripcion: descripcion || null,
          tipo_documento_id: tipoDocumentoId,
        })
        .eq("id", flujo.documento_id);

      if (documentoError) {
        throw new Error(
          `Error actualizando el documento asociado: ${documentoError.message}`
        );
      }
    }

    const { error: flujoUpdateError } = await db
      .from("documentos_flujos")
      .update({
        titulo,
        descripcion: descripcion || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flujoId);

    if (flujoUpdateError) {
      throw new Error(
        `Error actualizando el flujo: ${flujoUpdateError.message}`
      );
    }

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeFileName = file.name
        .replace(/\s+/g, "_")
        .replace(/[^\w.\-]/g, "_");
      const fileName = `${Date.now()}_editado_${safeFileName}`;
      storagePathCreado = `flujos/originales/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(storagePathCreado, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Error subiendo el nuevo archivo: ${uploadError.message}`);
      }

      const { error: desactivarError } = await db
        .from("flujos_versiones")
        .update({ es_version_actual: false })
        .eq("flujo_id", flujoId)
        .eq("es_version_actual", true);

      if (desactivarError) {
        throw new Error(
          `Error desactivando la versión anterior: ${desactivarError.message}`
        );
      }

      const { data: ultimaVersion, error: ultimaVersionError } = await db
        .from("flujos_versiones")
        .select("numero_version")
        .eq("flujo_id", flujoId)
        .order("numero_version", { ascending: false })
        .limit(1);

      if (ultimaVersionError) {
        throw new Error(
          `Error obteniendo la última versión: ${ultimaVersionError.message}`
        );
      }

      const siguienteNumero = (ultimaVersion?.[0]?.numero_version || 0) + 1;

      const { error: versionError } = await db
        .from("flujos_versiones")
        .insert({
          flujo_id: flujoId,
          numero_version: siguienteNumero,
          es_version_actual: true,
          nombre_archivo: file.name,
          mime_type: file.type || "application/octet-stream",
          tamano_bytes: file.size,
          storage_path: storagePathCreado,
          usuario_carga_id: creadorId,
        });

      if (versionError) {
        throw new Error(
          `Error registrando la nueva versión: ${versionError.message}`
        );
      }

      storagePathCreado = null;
    }

    // Reemplazar la configuración de firmantes solo porque ninguno ha sido procesado.
    await db.from("documentos_firmantes").delete().eq("flujo_id", flujoId);

    const nuevosFirmantes = firmantesIds.map((usuarioId, index) => ({
      flujo_id: flujoId,
      usuario_id: usuarioId,
      orden: index + 1,
      estado_firmante_id:
        index === 0
          ? ESTADOS_FIRMANTE.HABILITADO
          : ESTADOS_FIRMANTE.PENDIENTE,
      fecha_habilitacion:
        index === 0 ? new Date().toISOString() : null,
    }));

    const { error: nuevosFirmantesError } = await db
      .from("documentos_firmantes")
      .insert(nuevosFirmantes);

    if (nuevosFirmantesError) {
      throw new Error(
        `Error registrando los nuevos firmantes: ${nuevosFirmantesError.message}`
      );
    }

    await db
      .from("notificaciones")
      .update({ leida: true })
      .eq("entidad_tipo", "documentos_flujos")
      .eq("entidad_id", flujoId)
      .eq("tipo", "APROBACION_PENDIENTE")
      .eq("leida", false);

    const primerFirmante = firmantesIds[0];
    await db.from("notificaciones").insert({
      usuario_id: primerFirmante,
      tipo: "APROBACION_PENDIENTE",
      titulo: "Flujo actualizado pendiente de firma",
      mensaje: `El flujo #${flujo.numero_flujo} fue actualizado y requiere tu firma o aprobación (Paso #1).`,
      entidad_tipo: "documentos_flujos",
      entidad_id: flujoId,
      url: "/principal/flujo-aprobaciones",
      leida: false,
    });

    await db.from("documentos_flujos_historial").insert({
      documento_flujo_id: flujoId,
      usuario_id: creadorId,
      accion: "Flujo editado",
      observacion: "Se actualizaron los datos y la configuración de firmantes.",
    });

    return NextResponse.json({
      success: true,
      message: "Flujo actualizado correctamente.",
      flujo_id: flujoId,
      numero_flujo: flujo.numero_flujo,
    });
  } catch (error: any) {
    if (storagePathCreado) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await supabase.storage.from("documentos").remove([storagePathCreado]);
      } catch (cleanupError) {
        console.error("Error limpiando Storage:", cleanupError);
      }
    }

    console.error("Error en /api/flujos/actualizar:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}