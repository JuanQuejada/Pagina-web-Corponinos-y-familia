import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const flujoId = data.get('flujoId') as string;
    const firmanteId = data.get('firmanteId') as string; // ID del registro en documentos_firmantes
    const documentoId = data.get('documentoId') as string;
    const usuarioId = data.get('usuarioId') as string;

    if (!file || !flujoId || !firmanteId || !documentoId) {
      return NextResponse.json({ success: false, error: "Faltan datos obligatorios para procesar la firma." }, { status: 400 });
    }

    // 1. Autenticación con Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const readableStream = new (require('stream').Readable)();
    readableStream.push(buffer);
    readableStream.push(null);

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 2. Subir el nuevo archivo temporal modificado a Google Drive
    const fileMetadata = {
      name: `FIRMADO_${Date.now()}_${file.name}`,
      parents: folderId ? [folderId] : [],
    };

    const media = {
      mimeType: file.type,
      body: readableStream,
    };

    const responseDrive = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    const nuevoDriveId = responseDrive.data.id;
    const nuevoUrl = `https://drive.google.com/file/d/${nuevoDriveId}/view?usp=sharing`;

    if (!nuevoDriveId) {
      throw new Error("Error al subir el archivo procesado a Google Drive.");
    }

    // Dar permisos públicos de lectura
    try {
      await drive.permissions.create({
        fileId: nuevoDriveId,
        supportsAllDrives: true,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (e) {
      console.warn("Permiso público omitido:", e);
    }

    // 3. Consultar número de versión actual para incrementar
    const { data: versionesAntiguas } = await supabase
      .from("documentos_versiones")
      .select("numero_version")
      .eq("documento_id", documentoId)
      .order("numero_version", { ascending: false })
      .limit(1);

    const siguienteNumVersion = (versionesAntiguas?.[0]?.numero_version || 0) + 1;

    // Des marcar versiones anteriores como actuales
    await supabase
      .from("documentos_versiones")
      .update({ es_version_actual: false })
      .eq("documento_id", documentoId);

    // 4. Insertar la nueva versión del archivo en Supabase
    const { data: nuevaVersion, error: errVer } = await supabase
      .from("documentos_versiones")
      .insert([
        {
          documento_id: documentoId,
          numero_version: siguienteNumVersion,
          es_version_actual: true,
          nombre_archivo: file.name,
          mime_type: file.type,
          tamano_bytes: file.size,
          drive_url: nuevoUrl, // Aquí ya se guarda el enlace completo de Google Drive con el ID incluido
          usuario_carga_id: usuarioId,
        },
      ])
      .select()
      .single();

    if (errVer) throw errVer;

    // 5. Actualizar el estado del firmante actual a "Aprobado / Firmado"
    // (Buscamos un ID de estado de firmante aprobado, o actualizamos por campos de fecha)
    await supabase
      .from("documentos_firmantes")
      .update({
        fecha_aprobacion: new Date().toISOString(),
        fecha_carga: new Date().toISOString(),
        version_documento_id: nuevaVersion.id,
      })
      .eq("id", firmanteId);

    // 6. Buscar el siguiente firmante en la secuencia del mismo flujo
    const { data: firmanteActualObj } = await supabase
      .from("documentos_firmantes")
      .select("orden")
      .eq("id", firmanteId)
      .single();

    const ordenSiguiente = (firmanteActualObj?.orden || 0) + 1;

    const { data: siguienteFirmante } = await supabase
      .from("documentos_firmantes")
      .select("id, usuario_id")
      .eq("flujo_id", flujoId)
      .eq("orden", ordenSiguiente)
      .single();

    if (siguienteFirmante) {
      // Habilitar al siguiente firmante en la cadena
      await supabase
        .from("documentos_firmantes")
        .update({
          fecha_habilitacion: new Date().toISOString(),
        })
        .eq("id", siguienteFirmante.id);

      // Crear Notificación dinámica para el siguiente firmante (Módulo 6 integrado)
      await supabase.from("notificaciones").insert([
        {
          usuario_id: siguienteFirmante.usuario_id,
          tipo: "APROBACION_PENDIENTE",
          titulo: "Nuevo documento pendiente de firma",
          mensaje: "Un documento anterior ha avanzado en el flujo y requiere tu firma o aprobación.",
          entidad_tipo: "documentos_flujos",
          entidad_id: flujoId,
          url: "/gestion-operativa",
          leida: false,
        },
      ]);
    } else {
      // Si no hay más firmantes, el flujo se marca como completado/finalizado
      await supabase
        .from("documentos_flujos")
        .update({
          fecha_fin: new Date().toISOString(),
        })
        .eq("id", flujoId);
    }

    return NextResponse.json({ success: true, message: "Firma procesada y archivo actualizado correctamente." });

  } catch (error: any) {
    console.error("Error en flujo de firma:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}