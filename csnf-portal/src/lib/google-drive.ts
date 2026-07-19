// ============================================================
// INTEGRACIÓN GOOGLE DRIVE - CSNiños y Familia Portal
// ============================================================

import { google } from 'googleapis';

// Configuración de OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const drive = google.drive({ version: 'v3', auth: oauth2Client });

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
}

// --- SUBIR ARCHIVO ---
export async function subirArchivo(
  buffer: Buffer,
  nombre: string,
  mimeType: string,
  folderId: string
): Promise<DriveFile> {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: nombre,
        mimeType: mimeType,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: buffer,
      },
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, parents',
    });

    // Hacer el archivo accesible por enlace
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      id: response.data.id!,
      name: response.data.name!,
      mimeType: response.data.mimeType!,
      size: response.data.size || undefined,
      webViewLink: response.data.webViewLink || undefined,
      webContentLink: response.data.webContentLink || undefined,
      parents: response.data.parents || undefined,
    };
  } catch (error) {
    console.error('Error subiendo archivo a Drive:', error);
    throw new Error('No se pudo subir el archivo a Google Drive');
  }
}

// --- DESCARGAR ARCHIVO ---
export async function descargarArchivo(fileId: string): Promise<Buffer> {
  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error('Error descargando archivo:', error);
    throw new Error('No se pudo descargar el archivo');
  }
}

// --- ELIMINAR ARCHIVO (mover a papelera) ---
export async function eliminarArchivo(fileId: string): Promise<void> {
  try {
    await drive.files.update({
      fileId,
      requestBody: {
        trashed: true,
      },
    });
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    throw new Error('No se pudo eliminar el archivo');
  }
}

// --- ELIMINAR PERMANENTEMENTE ---
export async function eliminarArchivoPermanente(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId });
  } catch (error) {
    console.error('Error eliminando archivo permanentemente:', error);
    throw new Error('No se pudo eliminar el archivo');
  }
}

// --- OBTENER ENLACE DE DESCARGA ---
export async function obtenerEnlaceDescarga(fileId: string): Promise<string> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: 'webContentLink',
    });
    return response.data.webContentLink || '';
  } catch (error) {
    console.error('Error obteniendo enlace:', error);
    throw new Error('No se pudo obtener el enlace de descarga');
  }
}

// --- CREAR CARPETA ---
export async function crearCarpeta(nombre: string, parentId?: string): Promise<string> {
  try {
    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    if (parentId) {
      metadata.parents = [parentId];
    }

    const response = await drive.files.create({
      requestBody: metadata,
      fields: 'id',
    });

    return response.data.id!;
  } catch (error) {
    console.error('Error creando carpeta:', error);
    throw new Error('No se pudo crear la carpeta');
  }
}

// --- LISTAR ARCHIVOS EN CARPETA ---
export async function listarArchivos(folderId: string): Promise<DriveFile[]> {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, webViewLink, webContentLink)',
    });

    return (response.data.files || []).map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size || undefined,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
    }));
  } catch (error) {
    console.error('Error listando archivos:', error);
    throw new Error('No se pudo listar los archivos');
  }
}

// --- OBTENER O CREAR ESTRUCTURA DE CARPETAS ---
export async function obtenerOCrearEstructuraCarpetas(
  rootFolderId: string,
  tipoDocumento: string
): Promise<string> {
  const carpetas = {
    'Acta': '01_Actas',
    'Circular': '02_Circulares',
    'Resolución': '03_Resoluciones',
    'Memorando': '04_Memorandos',
    'Citación': '05_Citaciones',
    'Listado': '06_Listados',
    'Formato': '07_Formatos',
    'Informe': '08_Informes_Area',
    'Contrato': '09_Contratos',
    'Documento_Previo_Firma': '10_Documentos_Previos_Firma',
    'Evidencia': '11_Evidencias_Imagenes',
  };

  const nombreCarpeta = carpetas[tipoDocumento as keyof typeof carpetas] || '99_General';
  
  // Buscar si la carpeta existe
  const response = await drive.files.list({
    q: `'${rootFolderId}' in parents and name = '${nombreCarpeta}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Crear la carpeta si no existe
  return await crearCarpeta(nombreCarpeta, rootFolderId);
}

// --- OBTENER O CREAR SUBCARPETA (En_Firma / Firmados) ---
export async function obtenerSubcarpeta(
  parentFolderId: string,
  subcarpeta: 'En_Firma' | 'Firmados'
): Promise<string> {
  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${subcarpeta}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  return await crearCarpeta(subcarpeta, parentFolderId);
}