// ============================================================
// INTEGRACIÓN GOOGLE DRIVE - CSNiños y Familia Portal
// ============================================================
// Autenticación mediante CUENTA DE SERVICIO
// Compatible con UNIDADES COMPARTIDAS (Shared Drives)
//
// VARIABLES .env.local:
//
// GOOGLE_DRIVE_FOLDER_ID=ID_DE_LA_UNIDAD_COMPARTIDA
// GOOGLE_DRIVE_DOCUMENTOS_FOLDER_ID=ID_CARPETA_DOCUMENTOS
// GOOGLE_DRIVE_REPOSITORIO_FOLDER_ID=ID_CARPETA_REPOSITORIO
//
// GOOGLE_CLIENT_EMAIL=...
// GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
// ============================================================

import { google } from "googleapis";
import { Readable } from "stream";

/* ============================================================
   TIPOS
============================================================ */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  /** URL propia de Drive para visualización. */
  driveUrl?: string;
  /** URL directa de descarga de Drive. */
  downloadUrl?: string;
}

interface FolderMetadata {
  name: string;
  mimeType: string;
  parents?: string[];
  /** URL propia de Drive para visualización. */
  driveUrl?: string;
  /** URL directa de descarga de Drive. */
  downloadUrl?: string;
}

export type DestinoDrive = "documentos" | "repositorio";

/* ============================================================
   HELPERS DE CONFIGURACIÓN
============================================================ */

function requerirEnv(nombre: string): string {
  const valor = process.env[nombre]?.trim();

  if (!valor) {
    throw new Error(
      `No está configurada la variable de entorno ${nombre}.`
    );
  }

  return valor;
}

/**
 * ID de la Unidad Compartida.
 *
 * IMPORTANTE:
 * GOOGLE_DRIVE_FOLDER_ID corresponde a la raíz de la Unidad Compartida
 * "PORTAL GESTION DOCUMENTAL".
 *
 * En Google Drive una Unidad Compartida tiene un ID que puede utilizarse
 * como raíz para consultas de archivos/carpetas mediante la API.
 */
export function obtenerGoogleDriveRootFolderId(): string {
  return requerirEnv("GOOGLE_DRIVE_FOLDER_ID");
}

/**
 * Carpeta física donde se almacenan los documentos publicados
 * en el módulo Documentos.
 */
export function obtenerGoogleDriveDocumentosFolderId(): string {
  return requerirEnv("GOOGLE_DRIVE_DOCUMENTOS_FOLDER_ID");
}

/**
 * Carpeta física donde se almacenan los documentos publicados
 * en el módulo Repositorio / Bóveda Privada.
 */
export function obtenerGoogleDriveRepositorioFolderId(): string {
  return requerirEnv("GOOGLE_DRIVE_REPOSITORIO_FOLDER_ID");
}

/**
 * Devuelve la carpeta destino según el módulo.
 *
 * No intenta crear "subtipos de repositorio". El módulo Repositorio
 * utiliza una única carpeta raíz: GOOGLE_DRIVE_REPOSITORIO_FOLDER_ID.
 */
export function obtenerGoogleDriveDestinoFolderId(
  destino: DestinoDrive
): string {
  if (destino === "documentos") {
    return obtenerGoogleDriveDocumentosFolderId();
  }

  return obtenerGoogleDriveRepositorioFolderId();
}

/* ============================================================
   AUTENTICACIÓN GOOGLE DRIVE
============================================================ */

function obtenerDrive() {
  const clientEmail = requerirEnv("GOOGLE_CLIENT_EMAIL");
  const privateKey = requerirEnv("GOOGLE_PRIVATE_KEY");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: [
      "https://www.googleapis.com/auth/drive",
    ],
  });

  return google.drive({
    version: "v3",
    auth,
  });
}

/* ============================================================
   VALIDAR CONFIGURACIÓN DE DRIVE
============================================================ */

/**
 * Valida:
 * 1. La cuenta de servicio.
 * 2. La Unidad Compartida.
 * 3. La carpeta Documentos.
 * 4. La carpeta Repositorio.
 *
 * Es útil para diagnosticar errores de configuración sin intentar
 * publicar ningún documento.
 */
export async function validarConfiguracionDrive() {
  try {
    const drive = obtenerDrive();

    const rootId = obtenerGoogleDriveRootFolderId();
    const documentosId = obtenerGoogleDriveDocumentosFolderId();
    const repositorioId = obtenerGoogleDriveRepositorioFolderId();

    const [root, documentos, repositorio] = await Promise.all([
      drive.drives.get({
        driveId: rootId,
      }),
      drive.files.get({
        fileId: documentosId,
        fields: "id,name,mimeType,parents,driveId,trashed",
        supportsAllDrives: true,
      }),
      drive.files.get({
        fileId: repositorioId,
        fields: "id,name,mimeType,parents,driveId,trashed",
        supportsAllDrives: true,
      }),
    ]);

    if (!documentos.data.id) {
      throw new Error(
        "Google Drive no devolvió información válida de la carpeta Documentos."
      );
    }

    if (!repositorio.data.id) {
      throw new Error(
        "Google Drive no devolvió información válida de la carpeta Repositorio."
      );
    }

    if (
      documentos.data.mimeType !==
      "application/vnd.google-apps.folder"
    ) {
      throw new Error(
        "GOOGLE_DRIVE_DOCUMENTOS_FOLDER_ID no corresponde a una carpeta."
      );
    }

    if (
      repositorio.data.mimeType !==
      "application/vnd.google-apps.folder"
    ) {
      throw new Error(
        "GOOGLE_DRIVE_REPOSITORIO_FOLDER_ID no corresponde a una carpeta."
      );
    }

    if (documentos.data.trashed || repositorio.data.trashed) {
      throw new Error(
        "Una de las carpetas configuradas en Google Drive está en la papelera."
      );
    }

    return {
      ok: true,
      unidadCompartida: {
        id: rootId,
        nombre: root.data.name ?? null,
      },
      documentos: {
        id: documentos.data.id,
        nombre: documentos.data.name ?? null,
        parents: documentos.data.parents ?? [],
        driveId: documentos.data.driveId ?? rootId,
      },
      repositorio: {
        id: repositorio.data.id,
        nombre: repositorio.data.name ?? null,
        parents: repositorio.data.parents ?? [],
        driveId: repositorio.data.driveId ?? rootId,
      },
    };
  } catch (error: any) {
    console.error(
      "Error validando configuración de Google Drive:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No fue posible validar la configuración de Google Drive."
    );
  }
}

/* ============================================================
   SUBIR ARCHIVO
============================================================ */

export async function subirArchivo(
  buffer: Buffer,
  nombre: string,
  mimeType: string,
  folderId: string
): Promise<DriveFile> {
  try {
    if (!folderId?.trim()) {
      throw new Error(
        "No se recibió una carpeta de destino válida de Google Drive."
      );
    }

    if (!buffer || buffer.length === 0) {
      throw new Error(
        "El archivo recibido está vacío."
      );
    }

    const drive = obtenerDrive();

    const response = await drive.files.create({
      requestBody: {
        name: nombre,
        mimeType: mimeType || "application/octet-stream",
        parents: [folderId],
      },

      media: {
        mimeType: mimeType || "application/octet-stream",
        body: Readable.from(buffer),
      },

      fields:
        "id,name,mimeType,size,webViewLink,webContentLink,parents,driveId",

      supportsAllDrives: true,
    });

    const file = response.data;

    if (!file.id) {
      throw new Error(
        "Google Drive no devolvió el ID del archivo."
      );
    }

    return {
      id: file.id,
      name: file.name ?? nombre,
      mimeType:
        file.mimeType ??
        mimeType ??
        "application/octet-stream",
      size: file.size ?? undefined,
      webViewLink:
        file.webViewLink ?? undefined,
      webContentLink:
        file.webContentLink ?? undefined,
      parents:
        file.parents ?? undefined,
      driveUrl: construirUrlDrive(file.id, "view"),
      downloadUrl: construirUrlDrive(file.id, "download"),
    };
  } catch (error: any) {
    console.error(
      "Error subiendo archivo a Google Drive:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo subir el archivo a Google Drive."
    );
  }
}

/* ============================================================
   SUBIR ARCHIVO A DOCUMENTOS
============================================================ */

/**
 * Sube directamente a la carpeta configurada del módulo Documentos.
 *
 * No utiliza el bucket de Supabase como destino final.
 */
export async function subirArchivoDocumentos(
  buffer: Buffer,
  nombre: string,
  mimeType: string
): Promise<DriveFile> {
  const folderId = obtenerGoogleDriveDocumentosFolderId();

  return subirArchivo(
    buffer,
    nombre,
    mimeType,
    folderId
  );
}

/* ============================================================
   SUBIR ARCHIVO A REPOSITORIO
============================================================ */

/**
 * Sube directamente a la carpeta configurada del módulo Repositorio.
 *
 * Repositorio funciona como Bóveda Privada y no tiene subtipo.
 */
export async function subirArchivoRepositorio(
  buffer: Buffer,
  nombre: string,
  mimeType: string
): Promise<DriveFile> {
  const folderId = obtenerGoogleDriveRepositorioFolderId();

  return subirArchivo(
    buffer,
    nombre,
    mimeType,
    folderId
  );
}

/* ============================================================
   DESCARGAR ARCHIVO
============================================================ */

export async function descargarArchivo(
  fileId: string
): Promise<Buffer> {
  try {
    if (!fileId?.trim()) {
      throw new Error(
        "No se recibió un ID de archivo de Google Drive."
      );
    }

    const drive = obtenerDrive();

    const response = await drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      {
        responseType: "arraybuffer",
      }
    );

    return Buffer.from(
      response.data as ArrayBuffer
    );
  } catch (error: any) {
    console.error(
      "Error descargando archivo desde Google Drive:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo descargar el archivo desde Google Drive."
    );
  }
}

/* ============================================================
   OBTENER METADATOS DEL ARCHIVO
============================================================ */

export async function obtenerArchivo(
  fileId: string
): Promise<DriveFile> {
  try {
    if (!fileId?.trim()) {
      throw new Error(
        "No se recibió un ID de archivo de Google Drive."
      );
    }

    const drive = obtenerDrive();

    const response = await drive.files.get({
      fileId,
      fields:
        "id,name,mimeType,size,webViewLink,webContentLink,parents,driveId,trashed",
      supportsAllDrives: true,
    });

    const file = response.data;

    if (!file.id) {
      throw new Error(
        "Google Drive no devolvió información válida del archivo."
      );
    }

    return {
      id: file.id,
      name: file.name ?? "",
      mimeType: file.mimeType ?? "",
      size: file.size ?? undefined,
      webViewLink:
        file.webViewLink ?? undefined,
      webContentLink:
        file.webContentLink ?? undefined,
      parents:
        file.parents ?? undefined,
    };
  } catch (error: any) {
    console.error(
      "Error obteniendo archivo de Google Drive:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo obtener el archivo de Google Drive."
    );
  }
}

/* ============================================================
   MOVER ARCHIVO A PAPELERA
============================================================ */

export async function eliminarArchivo(
  fileId: string
): Promise<void> {
  try {
    const drive = obtenerDrive();

    await drive.files.update({
      fileId,
      requestBody: {
        trashed: true,
      },
      supportsAllDrives: true,
    });
  } catch (error: any) {
    console.error(
      "Error enviando archivo a papelera:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo enviar el archivo a la papelera."
    );
  }
}

/* ============================================================
   ELIMINAR DEFINITIVAMENTE
============================================================ */

export async function eliminarArchivoPermanente(
  fileId: string
): Promise<void> {
  try {
    const drive = obtenerDrive();

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
  } catch (error: any) {
    console.error(
      "Error eliminando permanentemente:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo eliminar definitivamente el archivo."
    );
  }
}

/* ============================================================
   OBTENER ENLACE DE DESCARGA
============================================================ */

/**
 * Obtiene el enlace que proporciona Google Drive.
 *
 * En algunos archivos de Unidades Compartidas Google no devuelve
 * webContentLink. Por eso se utiliza como respaldo una URL de Drive
 * construida a partir del ID del archivo.
 *
 * Para la aplicación se recomienda que el frontend consuma el
 * endpoint propio de descarga, y que ese endpoint utilice
 * descargarArchivo(fileId). Así no se expone la cuenta de servicio.
 */
export async function obtenerEnlaceDescarga(
  fileId: string
): Promise<string> {
  try {
    if (!fileId?.trim()) {
      throw new Error(
        "No se recibió un ID de archivo de Google Drive."
      );
    }

    const drive = obtenerDrive();

    const response = await drive.files.get({
      fileId,
      fields:
        "id,name,mimeType,webContentLink,webViewLink",
      supportsAllDrives: true,
    });

    const webContentLink =
      response.data.webContentLink?.trim();

    if (webContentLink) {
      return webContentLink;
    }

    // Respaldo compatible con archivos de Drive que no entregan
    // webContentLink en la respuesta de la API.
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
      fileId
    )}`;
  } catch (error: any) {
    console.error(
      "Error obteniendo enlace de descarga:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo obtener el enlace de descarga."
    );
  }
}

/* ============================================================
   OBTENER ENLACE DE VISUALIZACIÓN
============================================================ */

export async function obtenerEnlaceVisualizacion(
  fileId: string
): Promise<string> {
  try {
    const archivo = await obtenerArchivo(fileId);

    if (archivo.webViewLink) {
      return archivo.webViewLink;
    }

    return `https://drive.google.com/file/d/${encodeURIComponent(
      fileId
    )}/view`;
  } catch (error: any) {
    throw new Error(
      error?.message ||
        "No se pudo obtener el enlace de visualización."
    );
  }
}

/* ============================================================
   CREAR CARPETA
============================================================ */

export async function crearCarpeta(
  nombre: string,
  parentId?: string
): Promise<string> {
  try {
    const drive = obtenerDrive();

    const metadata: FolderMetadata = {
      name: nombre,
      mimeType:
        "application/vnd.google-apps.folder",
    };

    if (parentId) {
      metadata.parents = [parentId];
    }

    const response = await drive.files.create({
      requestBody: metadata,
      fields: "id,name,mimeType,parents",
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new Error(
        "Google Drive no devolvió el ID de la carpeta."
      );
    }

    return response.data.id;
  } catch (error: any) {
    console.error(
      "Error creando carpeta en Google Drive:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo crear la carpeta."
    );
  }
}

/* ============================================================
   BUSCAR CARPETA
============================================================ */

export async function buscarCarpeta(
  nombre: string,
  parentId: string
): Promise<string | null> {
  try {
    const drive = obtenerDrive();

    const nombreSeguro = nombre.replace(/'/g, "\\'");

    const response = await drive.files.list({
      q:
        `'${parentId}' in parents ` +
        `and name='${nombreSeguro}' ` +
        `and mimeType='application/vnd.google-apps.folder' ` +
        `and trashed=false`,

      fields:
        "files(id,name,mimeType,parents,driveId)",

      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 100,
    });

    return response.data.files?.[0]?.id ?? null;
  } catch (error: any) {
    console.error(
      "Error buscando carpeta en Google Drive:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo buscar la carpeta."
    );
  }
}

/* ============================================================
   OBTENER O CREAR CARPETA
============================================================ */

export async function obtenerOCrearCarpeta(
  nombre: string,
  parentId: string
): Promise<string> {
  const existente = await buscarCarpeta(
    nombre,
    parentId
  );

  if (existente) {
    return existente;
  }

  return crearCarpeta(
    nombre,
    parentId
  );
}

/* ============================================================
   LISTAR ARCHIVOS
============================================================ */

export async function listarArchivos(
  folderId: string
): Promise<DriveFile[]> {
  try {
    const drive = obtenerDrive();

    const response = await drive.files.list({
      q:
        `'${folderId}' in parents and trashed=false`,

      fields:
        "files(id,name,mimeType,size,webViewLink,webContentLink,parents,driveId)",

      orderBy: "name",

      includeItemsFromAllDrives: true,

      supportsAllDrives: true,

      pageSize: 1000,
    });

    return (response.data.files ?? [])
      .filter((file) => file.id)
      .map((file) => ({
        id: file.id!,
        name: file.name ?? "",
        mimeType: file.mimeType ?? "",
        size:
          file.size ?? undefined,
        webViewLink:
          file.webViewLink ?? undefined,
        webContentLink:
          file.webContentLink ?? undefined,
        parents:
          file.parents ?? undefined,
      }));
  } catch (error: any) {
    console.error(
      "Error listando archivos de Google Drive:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudieron listar los archivos."
    );
  }
}

/* ============================================================
   OBTENER ARCHIVOS DE DOCUMENTOS
============================================================ */

export async function listarArchivosDocumentos(): Promise<DriveFile[]> {
  return listarArchivos(
    obtenerGoogleDriveDocumentosFolderId()
  );
}

/* ============================================================
   OBTENER ARCHIVOS DE REPOSITORIO
============================================================ */

export async function listarArchivosRepositorio(): Promise<DriveFile[]> {
  return listarArchivos(
    obtenerGoogleDriveRepositorioFolderId()
  );
}

/* ============================================================
   OBTENER O CREAR CARPETA SEGÚN TIPO DOCUMENTAL
============================================================ */

/**
 * Mantiene la estructura histórica del proyecto.
 *
 * Esta función NO se utiliza para decidir si un archivo va a
 * Documentos o Repositorio.
 *
 * El módulo de publicación ya debe seleccionar explícitamente:
 *
 *   GOOGLE_DRIVE_DOCUMENTOS_FOLDER_ID
 *   GOOGLE_DRIVE_REPOSITORIO_FOLDER_ID
 *
 * Si otra parte del sistema necesita clasificar carpetas internas
 * por tipo documental, puede seguir utilizando esta función.
 */
export async function obtenerOCrearEstructuraCarpetas(
  rootFolderId: string,
  tipoDocumento: string
): Promise<string> {
  const carpetas: Record<string, string> = {
    Acta: "01_Actas",
    Circular: "02_Circulares",
    Resolución: "03_Resoluciones",
    Memorando: "04_Memorandos",
    Citación: "05_Citaciones",
    Listado: "06_Listados",
    Formato: "07_Formatos",
    Informe: "08_Informes_Area",
    Contrato: "09_Contratos",
    Documento_Previo_Firma:
      "10_Documentos_Previos_Firma",
    Evidencia:
      "11_Evidencias_Imagenes",
  };

  const nombreCarpeta =
    carpetas[tipoDocumento] ??
    "99_General";

  try {
    return await obtenerOCrearCarpeta(
      nombreCarpeta,
      rootFolderId
    );
  } catch (error: any) {
    console.error(
      "Error obteniendo/creando estructura de carpetas:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo obtener o crear la carpeta documental."
    );
  }
}

/* ============================================================
   OBTENER CARPETA DOCUMENTOS POR TIPO
============================================================ */

/**
 * Si posteriormente se desea mantener carpetas internas por tipo
 * dentro de Documentos, esta función permite hacerlo sin modificar
 * la raíz configurada en .env.local.
 */
export async function obtenerOCrearCarpetaDocumentosPorTipo(
  tipoDocumento: string
): Promise<string> {
  const documentosRoot =
    obtenerGoogleDriveDocumentosFolderId();

  return obtenerOCrearEstructuraCarpetas(
    documentosRoot,
    tipoDocumento
  );
}

/* ============================================================
   SUBCARPETAS DE FIRMA
============================================================ */

export async function obtenerSubcarpeta(
  parentFolderId: string,
  subcarpeta:
    | "En_Firma"
    | "Firmados"
): Promise<string> {
  try {
    return await obtenerOCrearCarpeta(
      subcarpeta,
      parentFolderId
    );
  } catch (error: any) {
    console.error(
      "Error obteniendo subcarpeta de firma:",
      error?.response?.data || error
    );

    throw new Error(
      error?.message ||
        "No se pudo obtener o crear la subcarpeta."
    );
  }
}

/* ============================================================
   SUBCARPETAS DE FIRMA DEL FLUJO
============================================================ */

export async function obtenerCarpetaEnFirma(): Promise<string> {
  const documentosRoot =
    obtenerGoogleDriveDocumentosFolderId();

  return obtenerSubcarpeta(
    documentosRoot,
    "En_Firma"
  );
}

export async function obtenerCarpetaFirmados(): Promise<string> {
  const documentosRoot =
    obtenerGoogleDriveDocumentosFolderId();

  return obtenerSubcarpeta(
    documentosRoot,
    "Firmados"
  );
}

/* ============================================================
   UTILIDAD: CONSTRUIR URL DE DRIVE
============================================================ */

export function construirUrlDrive(
  fileId: string,
  modo: "view" | "download" = "view"
): string {
  if (!fileId?.trim()) {
    throw new Error(
      "No se puede construir una URL de Google Drive sin fileId."
    );
  }

  if (modo === "download") {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
      fileId
    )}`;
  }

  return `https://drive.google.com/file/d/${encodeURIComponent(
    fileId
  )}/view`;
}

/* ============================================================
   DRIVE FILE ID
============================================================ */

export function obtenerDriveFileId(value: string | null | undefined): string {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/[-\w]{20,}/);
  return match?.[0] || text;
}

/* ============================================================
   EXPORTAR DRIVE PARA FUNCIONES ESPECIALES
============================================================ */

export { obtenerDrive };