import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No se encontró ningún archivo" }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'], // Ampliamos al scope completo de drive para evitar restricciones de permisos
    });

    const drive = google.drive({ version: 'v3', auth });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const readableStream = new (require('stream').Readable)();
    readableStream.push(buffer);
    readableStream.push(null);

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const fileMetadata = {
      name: `${Date.now()}_${file.name}`,
      parents: folderId ? [folderId] : [],
    };

    const media = {
      mimeType: file.type,
      body: readableStream,
    };

    // 1. Subir el archivo a la Unidad Compartida
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    const fileId = response.data.id;

    if (!fileId) {
      throw new Error("No se pudo obtener el ID del archivo subido a Drive");
    }

    // 2. FORZAR PERMISO AUTOMÁTICO: Hacer que cualquier persona dentro de la organización o con el enlace pueda leerlo
    try {
      await drive.permissions.create({
        fileId: fileId,
        supportsAllDrives: true,
        requestBody: {
          role: 'reader',
          type: 'anyone', // Permite que cualquier usuario del portal lo abra sin restricción
        },
      });
    } catch (permError) {
      console.warn("No se pudo hacer público globalmente (política de empresa), pero heredará la unidad:", permError);
    }

    // Usar el enlace de vista previa directo de Google
    const urlVistaPrevia = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    return NextResponse.json({
      success: true,
      fileId: fileId,
      webViewLink: urlVistaPrevia,
    });

  } catch (error: any) {
    console.error("Error en la API de Google Drive:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}