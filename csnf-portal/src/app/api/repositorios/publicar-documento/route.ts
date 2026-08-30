import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      flujo_id,
      documento_id,
      repositorio_id,
      usuario_id,
    } = body;

    // ---------------------------------------------------------
    // 1. Validar parámetros
    // ---------------------------------------------------------

    if (
      !flujo_id ||
      !documento_id ||
      !repositorio_id ||
      !usuario_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Faltan parámetros requeridos: flujo_id, documento_id, repositorio_id y usuario_id.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 2. Cliente Supabase con Service Role
    // ---------------------------------------------------------

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ---------------------------------------------------------
    // 3. Obtener flujo
    // ---------------------------------------------------------

    const { data: flujo, error: flujoError } = await supabase
      .from("documentos_flujos")
      .select(`
        id,
        documento_id,
        estado,
        numero_flujo,
        iniciado_por
      `)
      .eq("id", flujo_id)
      .single();

    if (flujoError || !flujo) {
      console.error("Error obteniendo flujo:", flujoError);

      return NextResponse.json(
        {
          success: false,
          error: "No se encontró el flujo especificado.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 4. Verificar que el documento corresponde al flujo
    // ---------------------------------------------------------

    if (flujo.documento_id !== documento_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El documento indicado no corresponde al flujo especificado.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 5. Verificar que el flujo esté finalizado
    // ---------------------------------------------------------

    const flujoFinalizado =
      flujo.estado === "Finalizado" ||
      flujo.estado?.toLowerCase() === "finalizado";

    if (!flujoFinalizado) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El documento solamente puede publicarse en un repositorio cuando el flujo de aprobación ha finalizado.",
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------------
    // 6. Obtener documento
    // ---------------------------------------------------------

    const { data: documento, error: documentoError } = await supabase
      .from("documentos")
      .select(`
        id,
        titulo,
        descripcion,
        estado,
        visibilidad,
        requiere_flujo,
        requiere_publicacion
      `)
      .eq("id", documento_id)
      .single();

    if (documentoError || !documento) {
      console.error("Error obteniendo documento:", documentoError);

      return NextResponse.json(
        {
          success: false,
          error: "No se encontró el documento asociado al flujo.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 7. Verificar versión actual
    // ---------------------------------------------------------

    const { data: versionActual, error: versionError } = await supabase
      .from("documentos_versiones")
      .select(`
        id,
        documento_id,
        numero_version,
        es_version_actual,
        nombre_archivo,
        mime_type,
        tamano_bytes,
        drive_url
      `)
      .eq("documento_id", documento_id)
      .eq("es_version_actual", true)
      .maybeSingle();

    if (versionError) {
      console.error("Error obteniendo versión actual:", versionError);

      return NextResponse.json(
        {
          success: false,
          error: "No fue posible verificar la versión actual del documento.",
        },
        { status: 500 }
      );
    }

    if (!versionActual) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El documento no tiene una versión actual válida para publicar.",
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------------
    // 8. Verificar repositorio
    // ---------------------------------------------------------

    const { data: repositorio, error: repositorioError } = await supabase
      .from("repositorios")
      .select(`
        id,
        nombre,
        descripcion,
        activo
      `)
      .eq("id", repositorio_id)
      .single();

    if (repositorioError || !repositorio) {
      console.error(
        "Error obteniendo repositorio:",
        repositorioError
      );

      return NextResponse.json(
        {
          success: false,
          error: "No se encontró el repositorio especificado.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 9. Verificar que el repositorio esté activo
    // ---------------------------------------------------------

    if (!repositorio.activo) {
      return NextResponse.json(
        {
          success: false,
          error:
            `El repositorio "${repositorio.nombre}" está inactivo y no puede recibir documentos.`,
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------------
    // 10. Verificar si el documento ya está en el repositorio
    // ---------------------------------------------------------

    const { data: relacionExistente, error: relacionError } =
      await supabase
        .from("repositorios_documentos")
        .select(`
          id,
          repositorio_id,
          documento_id,
          created_by,
          created_at
        `)
        .eq("repositorio_id", repositorio_id)
        .eq("documento_id", documento_id)
        .maybeSingle();

    if (relacionError) {
      console.error(
        "Error verificando relación existente:",
        relacionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "No fue posible verificar si el documento ya pertenece al repositorio.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 11. Si ya existe, no duplicar
    // ---------------------------------------------------------

    if (relacionExistente) {
      return NextResponse.json(
        {
          success: true,
          already_exists: true,
          message:
            "El documento ya se encuentra publicado en este repositorio.",
          data: {
            relacion_id: relacionExistente.id,
            repositorio_id,
            documento_id,
            version_id: versionActual.id,
          },
        },
        { status: 200 }
      );
    }

    // ---------------------------------------------------------
    // 12. Insertar relación documento ↔ repositorio
    // ---------------------------------------------------------

    const { data: nuevaRelacion, error: insertError } = await supabase
      .from("repositorios_documentos")
      .insert([
        {
          repositorio_id,
          documento_id,
          created_by: usuario_id,
        },
      ])
      .select(`
        id,
        repositorio_id,
        documento_id,
        created_by,
        created_at
      `)
      .single();

    if (insertError) {
      console.error(
        "Error insertando documento en repositorio:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `No fue posible publicar el documento en el repositorio: ${insertError.message}`,
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 13. Actualizar información general del documento
    //
    // IMPORTANTE:
    // visibilidad solamente acepta:
    //   - privado
    //   - publico
    //
    // Como "Repositorio" es el módulo privado:
    // visibilidad = "privado"
    // ---------------------------------------------------------

    const { error: documentoUpdateError } = await supabase
      .from("documentos")
      .update({
        visibilidad: "privado",
        publicado_por: usuario_id,
        updated_by: usuario_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documento_id);

    if (documentoUpdateError) {
      console.error(
        "Error actualizando documento:",
        documentoUpdateError
      );

      // Intentamos revertir la relación para evitar
      // dejar una publicación incompleta.
      await supabase
        .from("repositorios_documentos")
        .delete()
        .eq("id", nuevaRelacion.id);

      return NextResponse.json(
        {
          success: false,
          error:
            `El documento fue asociado al repositorio, pero no fue posible actualizar su estado: ${documentoUpdateError.message}`,
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 14. Respuesta final
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,
      already_exists: false,
      message:
        `El documento "${documento.titulo}" fue publicado correctamente en el repositorio "${repositorio.nombre}".`,
      data: {
        relacion_id: nuevaRelacion.id,
        flujo_id,
        documento_id,
        repositorio_id,
        repositorio_nombre: repositorio.nombre,
        version_id: versionActual.id,
        numero_version: versionActual.numero_version,
        usuario_id,
      },
    });
  } catch (error: any) {
    console.error(
      "Error inesperado en /api/repositorios/publicar-documento:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Error interno del servidor al publicar el documento.",
      },
      { status: 500 }
    );
  }
}