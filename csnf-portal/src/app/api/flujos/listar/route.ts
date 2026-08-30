import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// ESTADOS DEL FLUJO
// ============================================================

const ESTADOS_FLUJO = {
  PENDIENTE: "f33e7727-4998-4b4d-9245-23502dd8b293",
  EN_CURSO: "dbb08020-424a-4cf3-84b3-a3d975a088f0",
  RECHAZADO: "597ddc01-1f85-4af7-a6d6-574d5bdde23b",
  FINALIZADO: "20f8a732-9779-465f-af15-b4f62cd3745f",
  CANCELADO: "925e2cd5-62e5-4313-bb27-cf487af69bb2",
};

// ============================================================
// ESTADOS DEL FIRMANTE
// ============================================================

const ESTADOS_FIRMANTE = {
  PENDIENTE: "6f1665c2-3194-462c-aa5b-a44a786978aa",
  HABILITADO: "7c4a1357-733f-468b-9208-8f46acf386e5",
  DOCUMENTO_CARGADO: "7fa80abc-621b-44d1-8b11-0e92b20f577a",
  APROBADO: "e8107f56-0f26-4ab6-aff1-4c73530f134a",
  RECHAZADO: "62a7203b-dfff-463d-92d6-819cbf9e9ade",
  OMITIDO: "49492c19-86a4-4b14-bf6e-2d48c7e6907a",
};

// ============================================================
// ESTADOS TERMINALES DEL FLUJO
// ============================================================

const ESTADOS_TERMINALES = [
  ESTADOS_FLUJO.FINALIZADO,
  ESTADOS_FLUJO.RECHAZADO,
  ESTADOS_FLUJO.CANCELADO,
];

// ============================================================
// ESTADOS DE FIRMANTE QUE REPRESENTAN UNA PENDIENTE REAL
// ============================================================

const ESTADOS_FIRMANTE_PENDIENTES = [
  ESTADOS_FIRMANTE.PENDIENTE,
  ESTADOS_FIRMANTE.HABILITADO,
  ESTADOS_FIRMANTE.DOCUMENTO_CARGADO,
];

// ============================================================
// ESTADOS DE FIRMANTE QUE PERMITEN GESTIÓN
// ============================================================

const ESTADOS_FIRMANTE_GESTIONABLES = [
  ESTADOS_FIRMANTE.HABILITADO,
  ESTADOS_FIRMANTE.DOCUMENTO_CARGADO,
];

// ============================================================
// TIPOS
// ============================================================

type TabFlujos =
  | "bandeja"
  | "creados"
  | "historial";

type EstadoFirmante = {
  id: string;
  codigo: string | null;
  nombre: string | null;
};

type Firmante = {
  id: string;
  flujo_id: string;
  usuario_id: string;
  orden: number;
  estado_firmante_id: string | null;
  estado_firmante: EstadoFirmante | null;
  fecha_habilitacion: string | null;
  fecha_aprobacion: string | null;
};

type VersionFlujo = {
  id: string;
  flujo_id: string;
  numero_version: number;
  es_version_actual: boolean;
  nombre_archivo: string | null;
  mime_type: string | null;
  tamano_bytes: number | null;
  storage_path: string | null;
  usuario_carga_id: string | null;
  created_at: string | null;
};

type DocumentoHistorial = {
  id: string;
  titulo: string | null;
  descripcion: string | null;
  palabras_clave: string | null;
  codigo_flujo: string | null;
  codigo_publicacion: string | null;
  fecha_documento: string | null;
  tipo_documento_id: string | null;
};

type UsuarioResumen = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  razon_social: string | null;
};

type Flujo = {
  es_creador: boolean;
  es_firmante: boolean;

  puede_gestionar_firmante: boolean;

  puede_publicar: boolean;
  esta_publicado: boolean;

  es_pendiente: boolean;
  es_terminal: boolean;
  es_finalizado: boolean;
  es_rechazado: boolean;
  es_cancelado: boolean;
};

// ============================================================
// HELPER
// ============================================================

function normalizarTexto(valor: unknown): string {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

// ============================================================
// GET
//
// /api/flujos/listar?tab=bandeja&usuario_id=UUID
// /api/flujos/listar?tab=creados&usuario_id=UUID
// /api/flujos/listar?tab=historial&usuario_id=UUID
//
// ============================================================

export async function GET(request: Request) {
  try {
    // ==========================================================
    // 1. PARÁMETROS
    // ==========================================================

    const { searchParams } = new URL(request.url);

    const tabParam =
      searchParams.get("tab")?.trim() || "bandeja";

    const usuarioId =
      searchParams.get("usuario_id")?.trim() || "";

    // ==========================================================
    // 2. VALIDACIONES
    // ==========================================================

    if (!usuarioId) {
      return NextResponse.json(
        {
          success: false,
          error: "El parámetro usuario_id es obligatorio.",
        },
        { status: 400 }
      );
    }

    if (
      tabParam !== "bandeja" &&
      tabParam !== "creados" &&
      tabParam !== "historial"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El parámetro tab debe ser 'bandeja', 'creados' o 'historial'.",
        },
        { status: 400 }
      );
    }

    const tab = tabParam as TabFlujos;

    // ==========================================================
    // 3. SUPABASE
    // ==========================================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No están configuradas las variables de entorno de Supabase.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ==========================================================
    // 4. IDS DE FLUJOS
    // ==========================================================

    let idsFlujos: string[] = [];

    let idsFlujosHistorialFirmante: string[] = [];

    // ==========================================================
    // 4.1 BANDEJA
    //
    // La bandeja contiene los flujos donde el usuario participa
    // como firmante y tiene una actuación pendiente.
    // ==========================================================

    if (tab === "bandeja") {
      const {
        data: participaciones,
        error: participacionesError,
      } = await supabase
        .from("documentos_firmantes")
        .select(
          `
          id,
          flujo_id,
          usuario_id,
          orden,
          estado_firmante_id,
          fecha_habilitacion,
          fecha_aprobacion
        `
        )
        .eq("usuario_id", usuarioId)
        .in(
          "estado_firmante_id",
          ESTADOS_FIRMANTE_PENDIENTES
        )
        .order("orden", {
          ascending: true,
        });

      if (participacionesError) {
        console.error(
          "Error obteniendo participaciones del firmante:",
          participacionesError
        );

        return NextResponse.json(
          {
            success: false,
            error: participacionesError.message,
          },
          { status: 500 }
        );
      }

      idsFlujos = Array.from(
        new Set<string>(
          (participaciones ?? [])
            .map((item) => item.flujo_id)
            .filter(
              (id): id is string =>
                typeof id === "string" &&
                id.length > 0
            )
        )
      );
    }

    // ==========================================================
    // 4.2 HISTORIAL DEL FIRMANTE
    // ==========================================================

    if (tab === "historial") {
      const {
        data: participacionesHistorial,
        error: participacionesHistorialError,
      } = await supabase
        .from("documentos_firmantes")
        .select(
          `
          id,
          flujo_id,
          usuario_id,
          orden,
          estado_firmante_id,
          fecha_habilitacion,
          fecha_aprobacion
        `
        )
        .eq("usuario_id", usuarioId);

      if (participacionesHistorialError) {
        console.error(
          "Error obteniendo historial del firmante:",
          participacionesHistorialError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              participacionesHistorialError.message,
          },
          { status: 500 }
        );
      }

      idsFlujosHistorialFirmante =
        Array.from(
          new Set<string>(
            (participacionesHistorial ?? [])
              .map((item) => item.flujo_id)
              .filter(
                (id): id is string =>
                  typeof id === "string" &&
                  id.length > 0
              )
          )
        );
    }

    // ==========================================================
    // 5. CONSULTAR FLUJOS
    // ==========================================================

    let flujosQuery = supabase
      .from("documentos_flujos")
      .select(
        `
        id,
        documento_id,
        numero_flujo,
        estado_flujo_id,
        iniciado_por,
        fecha_inicio,
        fecha_fin,
        motivo_rechazo,
        observaciones,
        reiniciado_desde,
        cancelado_por,
        fecha_cancelacion,
        created_by,
        updated_by,
        created_at,
        updated_at,
        estado,
        destino_final,
        consecutivo_repositorio_privado,
        fecha_limite,
        proposito,
        titulo,
        descripcion,
        tipo_documento_id,
        repositorio_id
      `
      )
      .order("created_at", {
        ascending: false,
      });

    // ==========================================================
    // 5.1 BANDEJA
    // ==========================================================

    if (tab === "bandeja") {
      if (idsFlujos.length === 0) {
        return NextResponse.json({
          success: true,
          tab,
          usuario_id: usuarioId,
          flujos: [],
          total: 0,
        });
      }

      flujosQuery = flujosQuery
        .in("id", idsFlujos)
        .not(
          "estado_flujo_id",
          "in",
          `(${ESTADOS_TERMINALES.join(",")})`
        );
    }

    // ==========================================================
    // 5.2 CREADOS
    //
    // IMPORTANTE:
    //
    // Un flujo FINALIZADO permanece aquí hasta que el creador
    // lo publique.
    //
    // Por eso FINALIZADO NO se excluye.
    //
    // RECHAZADO y CANCELADO sí salen de esta pestaña.
    // ==========================================================

    if (tab === "creados") {
      flujosQuery = flujosQuery
        .eq("iniciado_por", usuarioId)
        .not(
          "estado_flujo_id",
          "in",
          `(${[
            ESTADOS_FLUJO.RECHAZADO,
            ESTADOS_FLUJO.CANCELADO,
          ].join(",")})`
        );
    }

    // ==========================================================
    // 5.3 HISTORIAL
    //
    // Para el firmante:
    //   solamente flujos TERMINALES.
    //
    // Para el creador:
    //   RECHAZADO / CANCELADO entran inmediatamente.
    //   FINALIZADO entra solamente después de publicar.
    //
    // Como el estado Publicado se conserva en "estado" pero
    // normalmente sigue teniendo estado_flujo_id=FINALIZADO,
    // la condición del creador permite FINALIZADO solamente
    // cuando ya está publicado.
    // ==========================================================

    if (tab === "historial") {
      const condicionesHistorial: string[] = [];

      // Firmante.
      if (idsFlujosHistorialFirmante.length > 0) {
        condicionesHistorial.push(
          `id.in.(${idsFlujosHistorialFirmante.join(",")})`
        );
      }

      // Creador.
      condicionesHistorial.push(
        `iniciado_por.eq.${usuarioId}`
      );

      flujosQuery = flujosQuery
        .or(
          condicionesHistorial.join(",")
        );
    }

    // ==========================================================
    // 6. EJECUTAR CONSULTA
    // ==========================================================

    const {
      data: flujos,
      error: flujosError,
    } = await flujosQuery;

    if (flujosError) {
      console.error(
        "Error obteniendo flujos:",
        flujosError
      );

      return NextResponse.json(
        {
          success: false,
          error: flujosError.message,
        },
        { status: 500 }
      );
    }

    if (!flujos || flujos.length === 0) {
      return NextResponse.json({
        success: true,
        tab,
        usuario_id: usuarioId,
        flujos: [],
        total: 0,
      });
    }

    // ==========================================================
    // 7. IDS DE LOS FLUJOS
    // ==========================================================

    const flujoIds: string[] =
      flujos
        .map((flujo) => flujo.id)
        .filter(
          (id): id is string =>
            typeof id === "string" &&
            id.length > 0
        );

    if (flujoIds.length === 0) {
      return NextResponse.json({
        success: true,
        tab,
        usuario_id: usuarioId,
        flujos: [],
        total: 0,
      });
    }

    // ==========================================================
    // 8. OBTENER DOCUMENTOS DEFINITIVOS
    //
    // Un flujo publicado conserva su documento definitivo.
    // Para el historial necesitamos devolver también la metadata
    // documental y la URL definitiva de Google Drive.
    // ==========================================================

    const documentoIds = Array.from(
      new Set(
        flujos
          .map((flujo) => flujo.documento_id)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.length > 0
          )
      )
    );

    const mapaDocumentos = new Map<string, DocumentoHistorial>();
    const mapaVersionesDocumentales = new Map<string, any>();

    if (documentoIds.length > 0) {
      const { data: documentos, error: documentosError } = await supabase
        .from("documentos")
        .select(`
          id,
          titulo,
          descripcion,
          palabras_clave,
          codigo_flujo,
          codigo_publicacion,
          fecha_documento,
          tipo_documento_id
        `)
        .in("id", documentoIds);

      if (documentosError) {
        console.error("Error obteniendo documentos de los flujos:", documentosError);
        return NextResponse.json(
          {
            success: false,
            error: documentosError.message,
          },
          { status: 500 }
        );
      }

      for (const documento of documentos ?? []) {
        mapaDocumentos.set(documento.id, documento as DocumentoHistorial);
      }

      const { data: versionesDocumentales, error: versionesDocumentalesError } =
        await supabase
          .from("documentos_versiones")
          .select(`
            id,
            documento_id,
            numero_version,
            es_version_actual,
            nombre_archivo,
            mime_type,
            tamano_bytes,
            drive_url,
            usuario_carga_id,
            created_at
          `)
          .in("documento_id", documentoIds)
          .order("numero_version", { ascending: false });

      if (versionesDocumentalesError) {
        console.error(
          "Error obteniendo versiones documentales de los flujos:",
          versionesDocumentalesError
        );
        return NextResponse.json(
          {
            success: false,
            error: versionesDocumentalesError.message,
          },
          { status: 500 }
        );
      }

      for (const version of versionesDocumentales ?? []) {
        const actual = mapaVersionesDocumentales.get(version.documento_id);

        if (
          !actual ||
          version.es_version_actual === true
        ) {
          mapaVersionesDocumentales.set(version.documento_id, version);
        }
      }
    }

    // ==========================================================
    // 9. OBTENER FIRMANTES
    // ==========================================================

    const {
      data: firmantes,
      error: firmantesError,
    } = await supabase
      .from("documentos_firmantes")
      .select(
        `
        id,
        flujo_id,
        usuario_id,
        orden,
        estado_firmante_id,
        fecha_habilitacion,
        fecha_aprobacion
      `
      )
      .in("flujo_id", flujoIds)
      .order("orden", {
        ascending: true,
      });

    if (firmantesError) {
      console.error(
        "Error obteniendo firmantes:",
        firmantesError
      );

      return NextResponse.json(
        {
          success: false,
          error: firmantesError.message,
        },
        { status: 500 }
      );
    }

    // ==========================================================
    // 9. OBTENER ESTADOS DE FIRMANTES
    // ==========================================================

    const estadoFirmanteIds: string[] =
      Array.from(
        new Set<string>(
          (firmantes ?? [])
            .map(
              (firmante) =>
                firmante.estado_firmante_id
            )
            .filter(
              (id): id is string =>
                typeof id === "string" &&
                id.length > 0
            )
        )
      );

    let estadosFirmantes: EstadoFirmante[] =
      [];

    if (estadoFirmanteIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
        .from(
          "estados_firmante_documento"
        )
        .select(
          `
          id,
          codigo,
          nombre
        `
        )
        .in(
          "id",
          estadoFirmanteIds
        );

      if (error) {
        console.error(
          "Error obteniendo estados de firmantes:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        );
      }

      estadosFirmantes =
        data ?? [];
    }

    // ==========================================================
    // 10. OBTENER VERSIONES DEL FLUJO
    // ==========================================================

    const {
      data: versiones,
      error: versionesError,
    } = await supabase
      .from("flujos_versiones")
      .select(
        `
        id,
        flujo_id,
        numero_version,
        es_version_actual,
        nombre_archivo,
        mime_type,
        tamano_bytes,
        storage_path,
        usuario_carga_id,
        created_at
      `
      )
      .in("flujo_id", flujoIds)
      .order("numero_version", {
        ascending: false,
      });

    if (versionesError) {
      console.error(
        "Error obteniendo versiones de flujos:",
        versionesError
      );

      return NextResponse.json(
        {
          success: false,
          error: versionesError.message,
        },
        { status: 500 }
      );
    }

    // ==========================================================
    // 11. MAPA DE ESTADOS
    // ==========================================================

    const mapaEstadosFirmantes =
      new Map<string, EstadoFirmante>();

    for (
      const estado of estadosFirmantes
    ) {
      mapaEstadosFirmantes.set(
        estado.id,
        estado
      );
    }

    // ==========================================================
    // 12. MAPA DE FIRMANTES
    // ==========================================================

    const mapaFirmantes =
      new Map<string, Firmante[]>();

    for (
      const firmante of firmantes ?? []
    ) {
      const lista =
        mapaFirmantes.get(
          firmante.flujo_id
        ) ?? [];

      const estado =
        firmante.estado_firmante_id
          ? mapaEstadosFirmantes.get(
              firmante.estado_firmante_id
            ) ?? null
          : null;

      lista.push({
        id: firmante.id,
        flujo_id: firmante.flujo_id,
        usuario_id: firmante.usuario_id,
        orden: firmante.orden,
        estado_firmante_id:
          firmante.estado_firmante_id,
        estado_firmante: estado
          ? {
              id: estado.id,
              codigo: estado.codigo,
              nombre: estado.nombre,
            }
          : null,
        fecha_habilitacion:
          firmante.fecha_habilitacion,
        fecha_aprobacion:
          firmante.fecha_aprobacion,
      });

      mapaFirmantes.set(
        firmante.flujo_id,
        lista
      );
    }

    // ==========================================================
    // 13. MAPA DE VERSIONES
    //
    // Se prioriza siempre la versión marcada como actual.
    // ==========================================================

    const mapaVersiones =
      new Map<string, VersionFlujo>();

    for (
      const version of versiones ?? []
    ) {
      const versionNormalizada: VersionFlujo =
        {
          id: version.id,
          flujo_id: version.flujo_id,
          numero_version:
            version.numero_version,
          es_version_actual:
            version.es_version_actual,
          nombre_archivo:
            version.nombre_archivo,
          mime_type:
            version.mime_type,
          tamano_bytes:
            version.tamano_bytes,
          storage_path:
            version.storage_path,
          usuario_carga_id:
            version.usuario_carga_id,
          created_at:
            version.created_at,
        };

      const actual =
        mapaVersiones.get(
          version.flujo_id
        );

      if (
        !actual ||
        version.es_version_actual
      ) {
        mapaVersiones.set(
          version.flujo_id,
          versionNormalizada
        );
      }
    }

    // ==========================================================
    // 13.5 MAPA DE CREADORES
    // ==========================================================

    const creadorIds = Array.from(
      new Set(
        flujos
          .map((flujo) => flujo.iniciado_por)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.length > 0
          )
      )
    );

    const mapaCreadores = new Map<string, UsuarioResumen>();

    if (creadorIds.length > 0) {
      const { data: creadores, error: creadoresError } = await supabase
        .from("usuarios")
        .select("id,nombres,apellidos,razon_social")
        .in("id", creadorIds);

      if (creadoresError) {
        console.error("Error obteniendo creadores de los flujos:", creadoresError);
        return NextResponse.json(
          {
            success: false,
            error: creadoresError.message,
          },
          { status: 500 }
        );
      }

      for (const creador of creadores ?? []) {
        mapaCreadores.set(creador.id, creador as UsuarioResumen);
      }
    }

    // ==========================================================
    // 14. CONSTRUIR RESULTADO
    // ==========================================================

    const resultado = flujos.map(
      (flujo) => {
        // ======================================================
        // FIRMANTES DEL FLUJO
        // ======================================================

        const listaFirmantes =
          mapaFirmantes.get(
            flujo.id
          ) ?? [];

        // ======================================================
        // VERSIÓN ACTUAL
        // ======================================================

        const version =
          mapaVersiones.get(
            flujo.id
          ) ?? null;

        const documento = flujo.documento_id
          ? mapaDocumentos.get(flujo.documento_id) ?? null
          : null;

        const versionDocumento = flujo.documento_id
          ? mapaVersionesDocumentales.get(flujo.documento_id) ?? null
          : null;

        const creador =
          mapaCreadores.get(flujo.iniciado_por) ?? null;

        const nombreCreador = creador
          ? (
              creador.razon_social ||
              `${creador.nombres || ""} ${creador.apellidos || ""}`.trim()
            ) || "Usuario"
          : "Usuario";

        // ======================================================
        // PARTICIPACIÓN DEL USUARIO
        // ======================================================

        const miParticipacion =
          listaFirmantes.find(
            (firmante) =>
              firmante.usuario_id ===
              usuarioId
          ) ?? null;

        // ======================================================
        // CREADOR
        // ======================================================

        const esCreador =
          flujo.iniciado_por ===
          usuarioId;

        // ======================================================
        // FIRMANTE
        // ======================================================

        const esFirmante =
          !!miParticipacion;

        // ======================================================
        // ESTADO DE MI FIRMANTE
        // ======================================================

        const estadoMiFirmanteId =
          miParticipacion
            ?.estado_firmante_id ??
          null;

        const estadoMiFirmante =
          miParticipacion
            ?.estado_firmante ??
          null;

        // ======================================================
        // FLUJO TERMINAL
        // ======================================================

        const flujoEsTerminal =
          ESTADOS_TERMINALES.includes(
            flujo.estado_flujo_id
          );

        // ======================================================
        // FLUJO FINALIZADO
        // ======================================================

        const flujoEstaFinalizado =
          flujo.estado_flujo_id ===
          ESTADOS_FLUJO.FINALIZADO;

        // ======================================================
        // FLUJO RECHAZADO
        // ======================================================

        const flujoEstaRechazado =
          flujo.estado_flujo_id ===
          ESTADOS_FLUJO.RECHAZADO;

        // ======================================================
        // FLUJO CANCELADO
        // ======================================================

        const flujoEstaCancelado =
          flujo.estado_flujo_id ===
          ESTADOS_FLUJO.CANCELADO;

        // ======================================================
        // PUBLICACIÓN
        //
        // IMPORTANTE:
        //
        // documento_id NO significa que esté publicado.
        //
        // El documento puede existir desde la creación del
        // flujo y permanecer sin publicar durante todo el
        // proceso de aprobación.
        //
        // Solamente consideramos publicado cuando el estado
        // textual del flujo es "Publicado".
        // ======================================================

        const estaPublicado =
          normalizarTexto(flujo.estado) === "publicado";

        // ======================================================
        // PUEDE PUBLICAR
        //
        // Regla de negocio:
        //
        // 1. Debe ser el creador.
        // 2. El flujo debe haber finalizado.
        // 3. Todavía no debe tener destino final/publicación.
        // El documento definitivo puede ser NULL en esta etapa.
        //
        // Un flujo rechazado o cancelado nunca puede publicarse.
        // ======================================================

        const puedePublicar =
          esCreador &&
          flujoEstaFinalizado &&
          !flujoEstaRechazado &&
          !flujoEstaCancelado &&
          !estaPublicado;

        // ======================================================
        // PUEDE GESTIONAR COMO FIRMANTE
        // ======================================================

        const puedeGestionarFirmante =
          esFirmante &&
          !flujoEsTerminal &&
          !!estadoMiFirmanteId &&
          ESTADOS_FIRMANTE_GESTIONABLES.includes(
            estadoMiFirmanteId
          );

        // ======================================================
        // PENDIENTE REAL
        // ======================================================

        const esPendiente =
          tab === "bandeja" &&
          !flujoEsTerminal &&
          esFirmante &&
          !!estadoMiFirmanteId &&
          ESTADOS_FIRMANTE_PENDIENTES.includes(
            estadoMiFirmanteId
          );

        // ======================================================
        // MI RESULTADO
        // ======================================================

        let miResultado:
          | "aprobado"
          | "rechazado"
          | "omitido"
          | "pendiente"
          | null = null;

        if (miParticipacion) {
          switch (
            miParticipacion.estado_firmante_id
          ) {
            case ESTADOS_FIRMANTE.APROBADO:
              miResultado = "aprobado";
              break;

            case ESTADOS_FIRMANTE.RECHAZADO:
              miResultado = "rechazado";
              break;

            case ESTADOS_FIRMANTE.OMITIDO:
              miResultado = "omitido";
              break;

            default:
              miResultado = "pendiente";
              break;
          }
        }

        // ======================================================
        // HISTORIAL DEL FIRMANTE
        //
        // Un firmante pasa al historial cuando el flujo termina.
        // ======================================================

        const estaEnHistorialFirmante =
          tab === "historial" &&
          esFirmante &&
          flujoEsTerminal;

        // ======================================================
        // HISTORIAL DEL CREADOR
        //
        // RECHAZADO / CANCELADO:
        //   entran inmediatamente.
        //
        // FINALIZADO:
        //   permanece en "creados" hasta publicar.
        //
        // PUBLICADO:
        //   entra al historial.
        // ======================================================

        const estaEnHistorialCreador =
          tab === "historial" &&
          esCreador &&
          (
            flujoEstaRechazado ||
            flujoEstaCancelado ||
            (
              flujoEstaFinalizado &&
              estaPublicado
            )
          );

        // ======================================================
        // ARCHIVO
        // ======================================================

        const archivo =
          version
            ? {
                version_id:
                  version.id,

                numero_version:
                  version.numero_version,

                nombre_archivo:
                  version.nombre_archivo,

                mime_type:
                  version.mime_type,

                tamano_bytes:
                  version.tamano_bytes,

                storage_path:
                  version.storage_path,

                drive_url:
                  versionDocumento?.drive_url || null,
              }
            : null;

        // ======================================================
        // RESULTADO FINAL
        // ======================================================

        return {
          // ====================================================
          // DATOS DEL FLUJO
          // ====================================================

          id: flujo.id,

          flujo_id: flujo.id,

          numero_flujo:
            flujo.numero_flujo,

          titulo:
            flujo.titulo,

          descripcion:
            flujo.descripcion,

          estado:
            flujo.estado,

          estado_flujo_id:
            flujo.estado_flujo_id,

          iniciado_por:
            flujo.iniciado_por,

          fecha_inicio:
            flujo.fecha_inicio,

          fecha_fin:
            flujo.fecha_fin,

          fecha_limite:
            flujo.fecha_limite,

          motivo_rechazo:
            flujo.motivo_rechazo,

          observaciones:
            flujo.observaciones,

          proposito:
            flujo.proposito,

          destino_final:
            flujo.destino_final,

          consecutivo_repositorio_privado:
            flujo.consecutivo_repositorio_privado,

          tipo_documento_id:
            flujo.tipo_documento_id,

          repositorio_id:
            flujo.repositorio_id,

          documento_id:
            flujo.documento_id,

          documento: documento
            ? {
                id: documento.id,
                titulo: documento.titulo,
                descripcion: documento.descripcion,
                palabras_clave: documento.palabras_clave,
                codigo_flujo: documento.codigo_flujo,
                codigo_publicacion: documento.codigo_publicacion,
                fecha_documento: documento.fecha_documento,
                tipo_documento_id: documento.tipo_documento_id,
              }
            : null,

          creador_nombre:
            nombreCreador,

          drive_url_publicado:
            versionDocumento?.drive_url || null,

          drive_file_id:
            versionDocumento?.drive_url
              ? String(versionDocumento.drive_url).match(/[-\w]{20,}/)?.[0] || null
              : null,

          reiniciado_desde:
            flujo.reiniciado_desde,

          cancelado_por:
            flujo.cancelado_por,

          fecha_cancelacion:
            flujo.fecha_cancelacion,

          created_by:
            flujo.created_by,

          updated_by:
            flujo.updated_by,

          created_at:
            flujo.created_at,

          updated_at:
            flujo.updated_at,

          // ====================================================
          // PERFIL DEL USUARIO
          // ====================================================

          es_creador:
            esCreador,

          es_firmante:
            esFirmante,

          // ====================================================
          // GESTIÓN DEL FIRMANTE
          // ====================================================

          puede_gestionar_firmante:
            puedeGestionarFirmante,

          // ====================================================
          // PUBLICACIÓN
          //
          // NUEVOS CAMPOS IMPORTANTES PARA EL FRONTEND
          // ====================================================

          esta_publicado:
            estaPublicado,

          puede_publicar:
            puedePublicar,

          // ====================================================
          // ESTADO DIRECTO DE MI PARTICIPACIÓN
          // ====================================================

          estado_mi_firmante_id:
            estadoMiFirmanteId,

          estado_mi_firmante:
            estadoMiFirmante,

          // ====================================================
          // PENDIENTE
          // ====================================================

          es_pendiente:
            esPendiente,

          // ====================================================
          // HISTORIAL
          // ====================================================

          esta_en_historial_firmante:
            estaEnHistorialFirmante,

          esta_en_historial_creador:
            estaEnHistorialCreador,

          mi_resultado:
            miResultado,

          mi_participacion:
            miParticipacion,

          // ====================================================
          // ESTADO DEL FLUJO
          // ====================================================

          es_terminal:
            flujoEsTerminal,

          es_finalizado:
            flujoEstaFinalizado,

          es_rechazado:
            flujoEstaRechazado,

          es_cancelado:
            flujoEstaCancelado,

          // ====================================================
          // FIRMANTES
          // ====================================================

          firmantes:
            listaFirmantes,

          cantidad_firmantes:
            listaFirmantes.length,

          // ====================================================
          // ARCHIVO
          // ====================================================

          version_actual:
            version
              ? {
                  id:
                    version.id,

                  numero_version:
                    version.numero_version,

                  es_version_actual:
                    version.es_version_actual,

                  nombre_archivo:
                    version.nombre_archivo,

                  mime_type:
                    version.mime_type,

                  tamano_bytes:
                    version.tamano_bytes,

                  storage_path:
                    version.storage_path,

                  drive_url:
                    versionDocumento?.drive_url || null,

                  usuario_carga_id:
                    version.usuario_carga_id,

                  created_at:
                    version.created_at,
                }
              : null,

          archivo,
        };
      }
    );

    // ==========================================================
    // 15. FILTRO FINAL POR PESTAÑA
    // ==========================================================

    let resultadoFinal =
      resultado;

    // ==========================================================
    // 15.1 BANDEJA
    //
    // Solamente pendientes reales y no terminales.
    // ==========================================================

    if (tab === "bandeja") {
      resultadoFinal =
        resultado.filter(
          (flujo) =>
            flujo.es_pendiente &&
            !flujo.es_terminal
        );
    }

    // ==========================================================
    // 15.2 CREADOS
    //
    // IMPORTANTE:
    //
    // FINALIZADO permanece aquí mientras NO esté publicado.
    //
    // RECHAZADO y CANCELADO nunca deben aparecer aquí.
    // ==========================================================

    if (tab === "creados") {
      resultadoFinal =
        resultado.filter(
          (flujo) =>
            flujo.es_creador &&
            !flujo.es_rechazado &&
            !flujo.es_cancelado &&
            !(
              flujo.es_finalizado &&
              flujo.esta_publicado
            )
        );
    }

    // ==========================================================
    // 15.3 HISTORIAL
    //
    // FIRMANTE:
    //   cualquier flujo terminal.
    //
    // CREADOR:
    //   rechazado/cancelado inmediatamente.
    //   finalizado solamente después de publicar.
    // ==========================================================

    if (tab === "historial") {
      resultadoFinal =
        resultado.filter(
          (flujo) =>
            flujo.esta_en_historial_firmante ||
            flujo.esta_en_historial_creador
        );
    }

    // ==========================================================
    // 16. RESPUESTA
    // ==========================================================

    return NextResponse.json({
      success: true,

      tab,

      usuario_id:
        usuarioId,

      flujos:
        resultadoFinal,

      total:
        resultadoFinal.length,
    });
  } catch (error: any) {
    // ==========================================================
    // ERROR GENERAL
    // ==========================================================

    console.error(
      "Error inesperado en /api/flujos/listar:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Error interno del servidor.",
      },
      {
        status: 500,
      }
    );
  }
}