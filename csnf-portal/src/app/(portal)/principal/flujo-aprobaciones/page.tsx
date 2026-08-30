"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Plus,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Lock,
  Globe,
  Upload,
  UserCheck,
  AlertCircle,
  Send,
  X,
  Edit3,
  Trash2,
  RotateCcw,
  Play,
  User,
  PauseCircle,
  FileSignature,
} from "lucide-react";

import { getAuthUser, supabase } from "@/lib/supabase";

/* ============================================================
   TIPOS
============================================================ */

interface Usuario {
  id: string;
  nombres?: string | null;
  apellidos?: string | null;
  razon_social?: string | null;
}

interface TipoDocumento {
  id: string;
  nombre: string;
  codigo?: string | null;
}

interface Rol {
  id: string;
  nombre: string;
  codigo?: string | null;
  activo?: boolean | null;
  orden?: number | null;
}

interface Repositorio {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

interface FlujoVersion {
  id: string;
  flujo_id: string;
  numero_version: number;
  es_version_actual: boolean;
  nombre_archivo: string;
  mime_type?: string | null;
  tamano_bytes?: number | null;
  storage_path?: string | null;
  usuario_carga_id?: string | null;
  created_at?: string | null;
}

interface Firmante {
  id: string;
  usuario_id: string;
  orden: number;

  fecha_habilitacion?: string | null;
  fecha_aprobacion?: string | null;
  fecha_rechazo?: string | null;

  estado_firmante_id?: string | null;
  estado?: string | null;

  estado_firmante_codigo?: string | null;
  estado_firmante_nombre?: string | null;

  observaciones?: string | null;

  usuarios?: Usuario | null;
}

interface Documento {
  id: string;
  titulo?: string | null;
  descripcion?: string | null;
  codigo_flujo?: string | null;
  codigo_publicacion?: string | null;
  tipo_documento_id?: string | null;
  fecha_documento?: string | null;
}

interface Flujo {
  id: string;
  numero_flujo?: string | null;

  titulo?: string | null;
  descripcion?: string | null;

  estado?: string | null;
  estado_flujo_id?: string | null;

  fecha_inicio?: string | null;
  fecha_fin?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  documento_id: string | null;

  iniciado_por: string;

  tipo_documento_id?: string | null;

  documentos?: Documento | null;

  flujos_versiones?: FlujoVersion[];

  documentos_firmantes?: Firmante[];

  firmantes?: Array<{
    id: string; flujo_id: string; usuario_id: string; orden: number;
    estado_firmante_id?: string | null;
    estado_firmante?: { id: string; codigo: string | null; nombre: string | null } | null;
    fecha_habilitacion?: string | null; fecha_aprobacion?: string | null;
    fecha_rechazo?: string | null;
    observaciones?: string | null;
    observacion?: string | null;
  }>;
  mi_participacion?: {
    id: string; flujo_id: string; usuario_id: string; orden: number;
    estado_firmante_id?: string | null;
    estado_firmante?: { id: string; codigo: string | null; nombre: string | null } | null;
    fecha_habilitacion?: string | null; fecha_aprobacion?: string | null;
  } | null;
  es_firmante?: boolean;
  es_pendiente?: boolean;
  puede_publicar?: boolean;
  esta_publicado?: boolean;
  destino_final?: string | null;
  version_actual?: FlujoVersion | null;
  archivo?: { version_id: string; numero_version: number; nombre_archivo: string | null; mime_type?: string | null; tamano_bytes?: number | null; storage_path?: string | null } | null;
}

type TabActiva = "bandeja" | "creados" | "historial";

type AccionTipo = "aprobar" | "rechazar";

type ModuloDestino = "documentos" | "repositorios";

/* ============================================================
   CONSTANTES

   IMPORTANTE:
   No dependemos de UUID para determinar si el firmante puede
   actuar. Usamos el código HAB cuando viene desde el endpoint.

   El UUID se mantiene solamente como respaldo para instalaciones
   donde el endpoint todavía no entregue el código.
============================================================ */

const ESTADO_FIRMANTE_HABILITADO =
  "7c4a1357-733f-468b-9208-8f46acf386e5";

const CODIGO_FIRMANTE_HABILITADO = "HAB";



/* ============================================================
   HELPERS
============================================================ */

function obtenerTextoEstado(flujo: Flujo) {
  return (
    flujo.estado?.toString().trim() ||
    ""
  );
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

function esFlujoFinalizado(flujo: Flujo) {
  const estado = normalizarTexto(flujo.estado);
  const estadoId = String(flujo.estado_flujo_id || "").trim();

  // Estado FINALIZADO de documentos_flujos.
  // Se conserva el texto como respaldo porque algunas respuestas
  // del endpoint pueden traer el nombre del estado y no solamente el UUID.
  const ESTADO_FLUJO_FINALIZADO =
    "20f8a732-9779-465f-af15-b4f62cd3745f";

  return (
    estadoId === ESTADO_FLUJO_FINALIZADO ||
    estado.includes("finalizado") ||
    estado.includes("aprobado") ||
    estado === "publicado"
  );
}

function estaFlujoPublicado(flujo: Flujo) {
  if (flujo.esta_publicado === true) {
    return true;
  }

  const estado = normalizarTexto(flujo.estado);
  return estado === "publicado";
}

function puedePublicarComoCreador(
  flujo: Flujo,
  usuarioId: string
) {
  if (!usuarioId) return false;

  // La publicación pertenece exclusivamente al creador.
  if (flujo.iniciado_por !== usuarioId) {
    return false;
  }

  // El backend puede informar directamente que ya se cumplen las
  // condiciones de publicación. Usamos además el estado local como
  // respaldo para no depender de un único campo.
  const finalizado =
    flujo.puede_publicar === true ||
    (flujo as any).es_finalizado === true ||
    esFlujoFinalizado(flujo);

  if (!finalizado) {
    return false;
  }

  // Una vez publicado, el botón debe desaparecer.
  if (estaFlujoPublicado(flujo)) {
    return false;
  }

  // IMPORTANTE: documento_id puede ser NULL antes de la primera
  // publicación. El endpoint /api/flujos/publicar crea el documento
  // definitivo cuando todavía no existe. Lo que sí debe existir es
  // una fuente documental para publicar.
  const tieneFuenteDocumental = Boolean(
    flujo.documento_id ||
    flujo.version_actual ||
    flujo.archivo ||
    (Array.isArray(flujo.flujos_versiones) && flujo.flujos_versiones.length > 0)
  );

  return tieneFuenteDocumental;
}

function esFlujoRechazado(flujo: Flujo) {
  return normalizarTexto(
    flujo.estado
  ).includes("rechaz");
}

function obtenerVersionActualFlujo(
  flujo: Flujo | null
): FlujoVersion | null {
  if (!flujo) return null;

  const versiones =
    Array.isArray(flujo.flujos_versiones)
      ? flujo.flujos_versiones
      : [];

  if (flujo.version_actual) {
    return flujo.version_actual;
  }

  if (versiones.length === 0) {
    return null;
  }

  const actual = versiones.find(
    (version) =>
      version.es_version_actual === true
  );

  if (actual) {
    return actual;
  }

  return [...versiones].sort(
    (a, b) =>
      (b.numero_version || 0) -
      (a.numero_version || 0)
  )[0] || null;
}

function obtenerFirmanteUsuario(
  flujo: Flujo | null,
  usuarioId: string
): Firmante | null {
  if (!flujo || !usuarioId) {
    return null;
  }

  const firmantes =
    Array.isArray(flujo.documentos_firmantes)
      ? flujo.documentos_firmantes
      : [];

  if (flujo.mi_participacion?.usuario_id === usuarioId) {
    const p = flujo.mi_participacion;
    const existente = firmantes.find((f) => f.id === p.id);
    if (existente) return existente;
    return {
      id: p.id, usuario_id: p.usuario_id, orden: p.orden,
      estado_firmante_id: p.estado_firmante_id ?? null,
      estado_firmante_codigo: p.estado_firmante?.codigo ?? null,
      estado_firmante_nombre: p.estado_firmante?.nombre ?? null,
      estado: p.estado_firmante?.nombre ?? null,
      fecha_habilitacion: p.fecha_habilitacion ?? null,
      fecha_aprobacion: p.fecha_aprobacion ?? null,
      fecha_rechazo: p.estado_firmante?.codigo === "RECHAZADO" ? (p.fecha_aprobacion ?? new Date().toISOString()) : null,
    };
  }

  return (
    firmantes.find(
      (firmante) =>
        firmante.usuario_id === usuarioId
    ) || null
  );
}

function firmanteEstaHabilitado(
  firmante: Firmante | null
) {
  if (!firmante) return false;

  if (
    firmante.fecha_aprobacion ||
    firmante.fecha_rechazo
  ) {
    return false;
  }

  const codigo =
    firmante.estado_firmante_codigo ||
    "";

  const nombre =
    firmante.estado_firmante_nombre ||
    firmante.estado ||
    "";

  return (
    codigo.toUpperCase() ===
      CODIGO_FIRMANTE_HABILITADO ||
    nombre.toLowerCase() ===
      "habilitado" ||
    firmante.estado_firmante_id ===
      ESTADO_FIRMANTE_HABILITADO
  );
}

function formatearFecha(
  fecha?: string | null
) {
  if (!fecha) return "—";

  try {
    return new Date(fecha).toLocaleString(
      "es-CO",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  } catch {
    return fecha;
  }
}

function formatearTamano(
  bytes?: number | null
) {
  if (!bytes || bytes <= 0) {
    return "";
  }

  const mb = bytes / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }

  const kb = bytes / 1024;

  return `${kb.toFixed(0)} KB`;
}

/* ============================================================
   AUTORIZACIÓN PARA APIS DE PUBLICACIÓN
============================================================ */

async function obtenerAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function FlujoAprobacionesPage() {
  /* ==========================================================
     LISTADO
  ========================================================== */

  const [tabActiva, setTabActiva] =
    useState<TabActiva>("bandeja");

  const [flujos, setFlujos] =
    useState<Flujo[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  const [usuarioActualId, setUsuarioActualId] =
    useState("");

  /* ==========================================================
     CATÁLOGOS
  ========================================================== */

  const [usuariosDisponibles, setUsuariosDisponibles] =
    useState<Usuario[]>([]);

  const [tiposDocumento, setTiposDocumento] =
    useState<TipoDocumento[]>([]);

  const [rolesDisponibles, setRolesDisponibles] =
    useState<Rol[]>([]);

  /* ==========================================================
     CREAR FLUJO
  ========================================================== */

  const [modalCrear, setModalCrear] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [flujoEditandoId, setFlujoEditandoId] =
    useState<string | null>(null);

  const [titulo, setTitulo] =
    useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [tipoDocumentoId, setTipoDocumentoId] =
    useState("");

  const [archivo, setArchivo] =
    useState<File | null>(null);

  const [
    firmantesSeleccionados,
    setFirmantesSeleccionados,
  ] = useState<string[]>([]);

  /* ==========================================================
     PROCESAR
  ========================================================== */

  const [
    modalProcesar,
    setModalProcesar,
  ] = useState(false);

  const [
    flujoSeleccionado,
    setFlujoSeleccionado,
  ] = useState<Flujo | null>(null);

  const [
    firmanteActivoId,
    setFirmanteActivoId,
  ] = useState("");

  const [
    accionTipo,
    setAccionTipo,
  ] = useState<AccionTipo>("aprobar");

  const [
    observacion,
    setObservacion,
  ] = useState("");

  const [
    archivoFirmado,
    setArchivoFirmado,
  ] = useState<File | null>(null);

  /* ==========================================================
     PUBLICACIÓN
  ========================================================== */

  const [
    modalPublicar,
    setModalPublicar,
  ] = useState(false);

  const [
    moduloDestino,
    setModuloDestino,
  ] = useState<ModuloDestino>("documentos");

  const [
    rolesPermitidos,
    setRolesPermitidos,
  ] = useState<string[]>([]);


  /* ==========================================================
     ESTADOS GENERALES
  ========================================================== */

  const [enviando, setEnviando] =
    useState(false);

  const [
    descargandoArchivo,
    setDescargandoArchivo,
  ] = useState(false);

  const [accionGestionando, setAccionGestionando] =
    useState<string | null>(null);

  /* ==========================================================
     INICIALIZACIÓN
  ========================================================== */

  useEffect(() => {
    let activo = true;

    const inicializar = async () => {
      try {
        const user = await getAuthUser();

        if (!activo) {
          return;
        }

        if (!user) {
          console.error(
            "No se encontró usuario autenticado."
          );

          setLoading(false);

          return;
        }

        setUsuarioActualId(user.id);

        await cargarDatosIniciales();
      } catch (error) {
        console.error(
          "Error inicializando FlujoAprobacionesPage:",
          error
        );

        if (activo) {
          setLoading(false);
        }
      }
    };

    inicializar();

    return () => {
      activo = false;
    };
  }, []);

  /* ==========================================================
     CARGAR FLUJOS AL CAMBIAR DE PESTAÑA
  ========================================================== */

  useEffect(() => {
    if (!usuarioActualId) {
      return;
    }

    cargarFlujos();
  }, [
    tabActiva,
    usuarioActualId,
  ]);

  /* ==========================================================
     CARGAR CATÁLOGOS
  ========================================================== */

  const cargarDatosIniciales =
    async () => {
      try {
        const [
          respuestaTipos,
          respuestaUsuarios,
          respuestaRoles,
        ] = await Promise.all([
          fetch("/api/tipos-documento", { cache: "no-store" }),
          fetch("/api/usuarios/listar", { cache: "no-store" }),
          supabase
            .from("roles")
            .select("id,nombre,codigo,activo,orden")
            .eq("activo", true)
            .order("orden", { ascending: true })
            .order("nombre", { ascending: true }),
        ]);

        if (respuestaTipos.ok) {
          const data =
            await respuestaTipos.json();

          setTiposDocumento(
            Array.isArray(data.tipos)
              ? data.tipos
              : []
          );
        }

        if (respuestaUsuarios.ok) {
          const data =
            await respuestaUsuarios.json();

          setUsuariosDisponibles(
            Array.isArray(data.usuarios)
              ? data.usuarios
              : []
          );
        }

        if (!respuestaRoles.error) {
          setRolesDisponibles(
            Array.isArray(respuestaRoles.data)
              ? respuestaRoles.data
              : []
          );
        } else {
          console.error("Error cargando roles:", respuestaRoles.error);
          setRolesDisponibles([]);
        }
      } catch (error) {
        console.error(
          "Error cargando catálogos:",
          error
        );
      }
    };

  /* ==========================================================
     NORMALIZAR RESPUESTA DEL NUEVO /api/flujos/listar
  ========================================================== */

  const normalizarFlujoParaV2 = (flujo: Flujo): Flujo => {
    const firmantesApi = Array.isArray(flujo.firmantes) ? flujo.firmantes : [];
    const documentosFirmantes: Firmante[] = firmantesApi.map((f) => ({
      id: f.id, usuario_id: f.usuario_id, orden: f.orden,
      estado_firmante_id: f.estado_firmante_id ?? null,
      estado_firmante_codigo: f.estado_firmante?.codigo ?? null,
      estado_firmante_nombre: f.estado_firmante?.nombre ?? null,
      estado: f.estado_firmante?.nombre ?? null,
      fecha_habilitacion: f.fecha_habilitacion ?? null,
      fecha_aprobacion: f.fecha_aprobacion ?? null,
      fecha_rechazo: f.fecha_rechazo ?? (f.estado_firmante?.codigo === "RECHAZADO" ? (f.fecha_aprobacion ?? new Date().toISOString()) : null),
      observaciones: f.observaciones ?? f.observacion ?? null,
    }));
    const versionActual = flujo.version_actual ?? (flujo.archivo ? {
      id: flujo.archivo.version_id, flujo_id: flujo.id, numero_version: flujo.archivo.numero_version,
      es_version_actual: true, nombre_archivo: flujo.archivo.nombre_archivo || "Documento del flujo",
      mime_type: flujo.archivo.mime_type ?? null, tamano_bytes: flujo.archivo.tamano_bytes ?? null,
      storage_path: flujo.archivo.storage_path ?? null, usuario_carga_id: null, created_at: null,
    } : null);
    return { ...flujo, documentos_firmantes: documentosFirmantes.length ? documentosFirmantes : (flujo.documentos_firmantes ?? []), flujos_versiones: versionActual ? [versionActual] : (flujo.flujos_versiones ?? []) };
  };

  /* ==========================================================
     CARGAR FLUJOS
  ========================================================== */

  const cargarFlujos = async () => {
    if (!usuarioActualId) {
      return;
    }

    setLoading(true);

    try {
      const url =
        `/api/flujos/listar?tab=${encodeURIComponent(
          tabActiva
        )}` +
        `&usuario_id=${encodeURIComponent(
          usuarioActualId
        )}`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const data =
        await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "No fue posible cargar los flujos."
        );
      }

      const flujosRecibidos = Array.isArray(data.flujos) ? data.flujos : [];
      setFlujos(flujosRecibidos.map((flujo: Flujo) => normalizarFlujoParaV2(flujo)));
    } catch (error: any) {
      console.error(
        "Error cargando flujos:",
        error
      );

      setFlujos([]);

      alert(
        error?.message ||
          "No fue posible cargar los flujos."
      );
    } finally {
      setLoading(false);
    }
  };

  const flujosVisibles = useMemo(() => {
    if (tabActiva !== "historial") return flujos;
    const q = normalizarTexto(busquedaHistorial);
    if (!q) return flujos;
    return flujos.filter((flujo: any) => {
      const doc = flujo.documento || flujo.documentos || {};
      const creador = normalizarTexto(flujo.creador_nombre);
      const fecha = `${flujo.fecha_fin || flujo.fecha_inicio || doc.fecha_documento || ""}`.toLowerCase();
      const texto = [
        flujo.numero_flujo, flujo.titulo, flujo.descripcion, flujo.proposito,
        doc.titulo, doc.descripcion, doc.palabras_clave, doc.codigo_publicacion,
        flujo.creador_nombre, creador, fecha,
      ].map((v) => normalizarTexto(v)).join(" ");
      return texto.includes(q);
    });
  }, [flujos, tabActiva, busquedaHistorial]);

  /* ==========================================================
     CREAR / EDITAR FLUJO
  ========================================================== */

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setFlujoEditandoId(null);
    setTitulo("");
    setDescripcion("");
    setTipoDocumentoId("");
    setArchivo(null);
    setFirmantesSeleccionados([]);
    setModalCrear(true);
  };

  const cerrarModalCrear = () => {
    if (enviando) return;

    setModalCrear(false);
    setModoEdicion(false);
    setFlujoEditandoId(null);
    setTitulo("");
    setDescripcion("");
    setTipoDocumentoId("");
    setArchivo(null);
    setFirmantesSeleccionados([]);
  };

  const flujoTieneFirmantesProcesados = (flujo: Flujo) => {
    return (flujo.documentos_firmantes || []).some(
      (firmante) =>
        Boolean(firmante.fecha_aprobacion) ||
        Boolean(firmante.fecha_rechazo)
    );
  };

  const puedeEditarFlujo = (flujo: Flujo) => {
    if (flujo.iniciado_por !== usuarioActualId) return false;
    if (flujo.estado_flujo_id === "20f8a732-9779-465f-af15-b4f62cd3745f") return false;
    if (flujo.estado_flujo_id === "597ddc01-1f85-4af7-a6d6-574d5bdde23b") return false;
    if (flujo.estado_flujo_id === "925e2cd5-62e5-4313-bb27-cf487af69bb2") return false;
    return !flujoTieneFirmantesProcesados(flujo);
  };

  const abrirModalEditar = (flujo: Flujo) => {
    if (!puedeEditarFlujo(flujo)) {
      alert(
        "Este flujo no puede editarse: solo puede editarse mientras ningún firmante haya procesado su paso y mientras el flujo siga activo."
      );
      return;
    }

    setModoEdicion(true);
    setFlujoEditandoId(flujo.id);
    setTitulo(flujo.documentos?.titulo || flujo.titulo || "");
    setDescripcion(flujo.documentos?.descripcion || flujo.descripcion || "");
    setTipoDocumentoId(
      flujo.documentos?.tipo_documento_id || flujo.tipo_documento_id || ""
    );
    setArchivo(null);
    setFirmantesSeleccionados(
      [...(flujo.documentos_firmantes || [])]
        .sort((a, b) => a.orden - b.orden)
        .map((firmante) => firmante.usuario_id)
    );
    setModalCrear(true);
  };

  const handleSubmitCrearOEditarFlujo = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!usuarioActualId) {
      alert("No se pudo identificar el usuario actual.");
      return;
    }

    const firmantesValidos = firmantesSeleccionados.filter((id) => id !== usuarioActualId);

    if (!titulo.trim() || !tipoDocumentoId || firmantesValidos.length === 0) {
      alert("Completa todos los campos obligatorios y selecciona al menos un firmante.");
      return;
    }

    if (!modoEdicion && !archivo) {
      alert("Debes adjuntar el documento que será sometido al flujo de aprobación.");
      return;
    }

    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append("titulo", titulo.trim());
      formData.append("descripcion", descripcion.trim());
      formData.append("tipo_documento_id", tipoDocumentoId);
      formData.append("creador_id", usuarioActualId);
      formData.append("firmantes_ids", JSON.stringify(firmantesValidos));

      if (archivo) {
        formData.append("archivo", archivo);
      }

      let endpoint = "/api/subir-documento-flujo";

      if (modoEdicion && flujoEditandoId) {
        formData.append("flujo_id", flujoEditandoId);
        endpoint = "/api/flujos/actualizar";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No fue posible guardar el flujo.");
      }

      alert(
        data.message ||
          (modoEdicion
            ? "Flujo actualizado correctamente."
            : "Flujo creado correctamente.")
      );

      cerrarModalCrear();
      await cargarFlujos();
    } catch (error: any) {
      console.error("Error guardando flujo:", error);
      alert(error?.message || "Ocurrió un error guardando el flujo.");
    } finally {
      setEnviando(false);
    }
  };

  /* ==========================================================
     GESTIÓN DEL CREADOR

     El endpoint /api/flujos/gestion-estado recibe exactamente:
     flujo_id, usuario_id y accion.
     Acciones válidas: desactivar, reanudar, reiniciar, eliminar.
  ========================================================== */

  type AccionGestion = "desactivar" | "reanudar" | "reiniciar" | "eliminar";

  const cambiarEstadoFlujo = async (flujo: Flujo, accion: AccionGestion) => {
    if (flujo.iniciado_por !== usuarioActualId) {
      alert("Solo el creador del flujo puede realizar esta operación.");
      return;
    }

    const mensajes: Record<AccionGestion, string> = {
      desactivar: "¿Deseas pausar temporalmente este flujo? Las firmas ya realizadas se conservarán.",
      reanudar: "¿Deseas reanudar este flujo desde el siguiente firmante pendiente?",
      reiniciar: "¿Deseas reiniciar el flujo desde el primer firmante? Esto restablecerá las aprobaciones realizadas.",
      eliminar: "¿Deseas eliminar permanentemente este flujo? Esta operación no se puede deshacer.",
    };

    if (!confirm(mensajes[accion])) return;

    setAccionGestionando(`${flujo.id}:${accion}`);

    try {
      const res = await fetch("/api/flujos/gestion-estado", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          flujo_id: flujo.id,
          usuario_id: usuarioActualId,
          accion,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No fue posible modificar el flujo.");
      }

      alert(data.message || "Operación realizada correctamente.");
      await cargarFlujos();
    } catch (error: any) {
      console.error(`Error en ${accion}:`, error);
      alert(error?.message || "Ocurrió un error modificando el flujo.");
    } finally {
      setAccionGestionando(null);
    }
  };

  /* ==========================================================
     OBTENER NOMBRE USUARIO
  ========================================================== */

  const obtenerNombreUsuario = (
    usuarioId: string
  ) => {
    const usuario =
      usuariosDisponibles.find(
        (item) =>
          item.id === usuarioId
      );

    if (!usuario) {
      return "Usuario";
    }

    return (
      usuario.razon_social ||
      `${usuario.nombres || ""} ${
        usuario.apellidos || ""
      }`.trim() ||
      "Usuario"
    );
  };

  /* ==========================================================
     OBTENER TIPO DOCUMENTO
  ========================================================== */

  const obtenerNombreTipoDocumento =
    (tipoId?: string | null) => {
      if (!tipoId) {
        return "Documento";
      }

      const tipo =
        tiposDocumento.find(
          (item) =>
            item.id === tipoId
        );

      return (
        tipo?.nombre ||
        "Documento"
      );
    };

  /* ==========================================================
     ABRIR GESTIÓN

     IMPORTANTE:
     Solamente se habilita el procesamiento cuando el usuario
     actual es realmente el firmante HABILITADO.

     Esto corrige el problema que teníamos con el creador
     apareciendo también como si pudiera firmar.
  ========================================================== */

  const abrirGestion = (
    flujo: Flujo,
    accionInicial: AccionTipo = "aprobar"
  ) => {
    if (!usuarioActualId) {
      return;
    }

    const miFirma =
      obtenerFirmanteUsuario(
        flujo,
        usuarioActualId
      );

    if (!miFirma) {
      alert(
        "Este flujo no tiene una firma asignada a tu usuario."
      );

      return;
    }

    if (
      !firmanteEstaHabilitado(
        miFirma
      )
    ) {
      alert(
        "Este flujo todavía no está habilitado para que realices una acción."
      );

      return;
    }

    setFlujoSeleccionado(flujo);

    setFirmanteActivoId(
      miFirma.id
    );

    setAccionTipo(accionInicial);

    setObservacion("");

    setArchivoFirmado(null);

    setModalProcesar(true);
  };

  const abrirGestionArchivoFirmado = (flujo: Flujo) => {
    abrirGestion(flujo, "aprobar");
  };

  /* ==========================================================
     CERRAR MODAL PROCESAR
  ========================================================== */

  const cerrarModalProcesar = () => {
    if (enviando) {
      return;
    }

    setModalProcesar(false);

    setFirmanteActivoId("");

    setObservacion("");

    setArchivoFirmado(null);

    setFlujoSeleccionado(null);
  };

  /* ==========================================================
     DESCARGAR ARCHIVO DEL FLUJO

     NUEVA ARQUITECTURA:

     GET /api/flujos/archivo?flujo_id=UUID

     El backend busca:

     flujos_versiones.storage_path

     y devuelve:

     data.archivo.url
  ========================================================== */

  const obtenerUrlArchivo = async (flujo: Flujo) => {
    const versionActual = obtenerVersionActualFlujo(flujo);
    const params = new URLSearchParams();
    params.set("flujo_id", flujo.id);
    if (versionActual?.id) params.set("version_id", versionActual.id);

    const res = await fetch(`/api/flujos/archivo?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data?.archivo?.url) {
      throw new Error(data.error || "El servidor no devolvió una URL válida para el archivo.");
    }

    return {
      url: data.archivo.url as string,
      nombre: data.archivo.nombre_archivo || versionActual?.nombre_archivo || "documento",
    };
  };

  const descargarArchivo = async (flujo: Flujo) => {
    setDescargandoArchivo(true);

    try {
      const { url, nombre } = await obtenerUrlArchivo(flujo);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`No fue posible descargar el archivo (${response.status}).`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error("Error descargando archivo:", error);
      alert(error?.message || "No fue posible descargar el archivo adjunto.");
    } finally {
      setDescargandoArchivo(false);
    }
  };

  const verArchivo = async (flujo: Flujo) => {
    setDescargandoArchivo(true);

    try {
      const { url } = await obtenerUrlArchivo(flujo);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      console.error("Error visualizando archivo:", error);
      alert(error?.message || "No fue posible visualizar el archivo.");
    } finally {
      setDescargandoArchivo(false);
    }
  };

  /* ==========================================================
     PROCESAR APROBACIÓN / RECHAZO
  ========================================================== */

  const handleSubmitProcesar =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      if (
        !flujoSeleccionado ||
        !firmanteActivoId
      ) {
        alert(
          "No se encontró un firmante habilitado para este usuario."
        );

        return;
      }

      const miFirma =
        obtenerFirmanteUsuario(
          flujoSeleccionado,
          usuarioActualId
        );

      if (
        !miFirma ||
        miFirma.id !==
          firmanteActivoId
      ) {
        alert(
          "El firmante seleccionado no corresponde al usuario actual."
        );

        return;
      }

      if (
        !firmanteEstaHabilitado(
          miFirma
        )
      ) {
        alert(
          "Este firmante no está habilitado actualmente."
        );

        return;
      }

      if (
        accionTipo === "rechazar" &&
        !observacion.trim()
      ) {
        alert(
          "Debes indicar una observación para rechazar el flujo."
        );

        return;
      }

      setEnviando(true);

      try {
        const formData =
          new FormData();

        formData.append(
          "firmante_id",
          firmanteActivoId
        );

        formData.append(
          "flujo_id",
          flujoSeleccionado.id
        );

        formData.append(
          "usuario_id",
          usuarioActualId
        );

        formData.append(
          "accion",
          accionTipo
        );

        formData.append(
          "observacion",
          observacion.trim()
        );

        if (archivoFirmado) {
          formData.append(
            "file",
            archivoFirmado
          );
        }

        const res = await fetch(
          "/api/procesar-flujo",
          {
            method: "POST",
            body: formData,
          }
        );

        const data =
          await res.json();

        if (!res.ok || !data.success) {
          throw new Error(
            data.error ||
              "No fue posible procesar el paso."
          );
        }

        alert(
          data.message ||
            "El paso del flujo fue procesado correctamente."
        );

        cerrarModalProcesar();

        await cargarFlujos();
      } catch (error: any) {
        console.error(
          "Error procesando flujo:",
          error
        );

        alert(
          error?.message ||
            "Ocurrió un error procesando el flujo."
        );
      } finally {
        setEnviando(false);
      }
    };

  /* ==========================================================
     ABRIR PUBLICACIÓN
  ========================================================== */

  const abrirPublicacion = async (
    flujo: Flujo
  ) => {
    if (!esFlujoFinalizado(flujo)) {
      alert(
        "El flujo todavía no está finalizado."
      );

      return;
    }

    setFlujoSeleccionado(
      flujo
    );

    setModuloDestino(
      "documentos"
    );

    setRolesPermitidos([]);
    setModalPublicar(true);
  };

  /* ==========================================================
     CERRAR PUBLICACIÓN
  ========================================================== */

  const cerrarModalPublicar = () => {
    if (enviando) {
      return;
    }

    setModalPublicar(false);

    setRolesPermitidos([]);
    setFlujoSeleccionado(null);
  };

  /* ==========================================================
     PUBLICAR
  ========================================================== */

  const handleSubmitPublicacion =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      if (!flujoSeleccionado) {
        alert(
          "No hay un flujo seleccionado."
        );

        return;
      }

      if (
        !esFlujoFinalizado(
          flujoSeleccionado
        )
      ) {
        alert(
          "El flujo todavía no está finalizado."
        );

        return;
      }

      /* ======================================================
         REPOSITORIO PRIVADO

         El Repositorio es una bóveda privada única.
         No se selecciona un subtipo ni un repositorio desde esta pantalla.
         El backend /api/flujos/publicar resuelve el destino privado.
      ====================================================== */

      if (moduloDestino === "repositorios") {
        setEnviando(true);

        try {
          const accessToken = await obtenerAccessToken();
          if (!accessToken) {
            throw new Error("La sesión autenticada no está disponible.");
          }

          const res = await fetch("/api/flujos/publicar", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              flujo_id: flujoSeleccionado.id,
              documento_id: flujoSeleccionado.documento_id,
              usuario_id: usuarioActualId,
              modulo: "repositorios",
            }),
          });

          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(
              data.error ||
                "No fue posible publicar el documento en el Repositorio."
            );
          }

          alert(data.message || "Documento publicado correctamente en el Repositorio.");
          cerrarModalPublicar();
          await cargarFlujos();
        } catch (error: any) {
          console.error("Error publicando en Repositorio:", error);
          alert(error?.message || "No fue posible publicar el documento en el Repositorio.");
        } finally {
          setEnviando(false);
        }

        return;
      }

      /* ======================================================
         DOCUMENTOS PÚBLICOS
      ====================================================== */

      if (
        moduloDestino ===
        "documentos"
      ) {
        if (
          rolesPermitidos.length ===
          0
        ) {
          alert(
            "Selecciona al menos un rol de visibilidad."
          );

          return;
        }

        setEnviando(true);

        try {
          const accessToken = await obtenerAccessToken();
          if (!accessToken) {
            throw new Error("La sesión autenticada no está disponible.");
          }
          const res =
            await fetch(
              "/api/flujos/publicar",
              {
                method: "POST",
                headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                  flujo_id:
                    flujoSeleccionado.id,

                  documento_id:
                    flujoSeleccionado.documento_id,

                  usuario_id:
                    usuarioActualId,

                  modulo:
                    "documentos",

                  roles:
                    rolesPermitidos,
                }),
              }
            );

          const data =
            await res.json();

          if (
            !res.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ||
                "No fue posible publicar el documento."
            );
          }

          alert(
            data.message ||
              "Documento publicado correctamente."
          );

          cerrarModalPublicar();

          await cargarFlujos();
        } catch (error: any) {
          console.error(
            "Error publicando documento:",
            error
          );

          alert(
            error?.message ||
              "No fue posible publicar el documento."
          );
        } finally {
          setEnviando(false);
        }
      }
    };

  /* ==========================================================
     SELECCIÓN DE FIRMANTES
  ========================================================== */

  const alternarFirmante = (
    usuarioId: string
  ) => {
    setFirmantesSeleccionados(
      (actuales) => {
        if (
          actuales.includes(
            usuarioId
          )
        ) {
          return actuales.filter(
            (id) =>
              id !== usuarioId
          );
        }

        return [
          ...actuales,
          usuarioId,
        ];
      }
    );
  };

  /* ==========================================================
     DATOS DERIVADOS
  ========================================================== */

  const flujoSeleccionadoMiFirma =
    useMemo(() => {
      if (
        !flujoSeleccionado ||
        !usuarioActualId
      ) {
        return null;
      }

      return obtenerFirmanteUsuario(
        flujoSeleccionado,
        usuarioActualId
      );
    }, [
      flujoSeleccionado,
      usuarioActualId,
    ]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ======================================================
          ENCABEZADO
      ====================================================== */}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Flujos de Aprobación
                </h1>

                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Gestión, revisión, aprobación y publicación documental.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirModalCrear}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo flujo
          </button>
        </div>

        {/* ====================================================
            PESTAÑAS
        ==================================================== */}

        <div className="mt-6 border-b border-gray-100 dark:border-slate-800 flex gap-6">

          <button
            type="button"
            onClick={() =>
              setTabActiva(
                "bandeja"
              )
            }
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              tabActiva ===
              "bandeja"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700"
            }`}
          >
            Bandeja de Pendientes
          </button>

          <button
            type="button"
            onClick={() =>
              setTabActiva(
                "creados"
              )
            }
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              tabActiva ===
              "creados"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700"
            }`}
          >
            Mis Flujos Creados
          </button>

          <button
            type="button"
            onClick={() =>
              setTabActiva(
                "historial"
              )
            }
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              tabActiva ===
              "historial"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700"
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {tabActiva === "historial" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Buscar en historial</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Título, creador, descripción, palabras clave, código o fecha.</p>
            </div>
            <input
              value={busquedaHistorial}
              onChange={(e) => setBusquedaHistorial(e.target.value)}
              placeholder="Buscar flujo histórico..."
              className="w-full sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* ======================================================
          CARGANDO
      ====================================================== */}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : flujosVisibles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600" />

          <h2 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">
            No hay flujos en esta sección
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            {tabActiva ===
            "bandeja"
              ? "No tienes flujos pendientes de revisión o firma."
              : tabActiva === "creados"
                ? "Todavía no has creado flujos de aprobación."
                : "Todavía no tienes flujos finalizados en tu historial."}
          </p>

          {tabActiva ===
            "creados" && (
            <button
              type="button"
              onClick={
                abrirModalCrear
              }
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="h-4 w-4" />
              Crear primer flujo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {flujosVisibles.map(
            (flujo) => {
              const esCreador =
                flujo.iniciado_por ===
                usuarioActualId;

              const finalizado =
                esFlujoFinalizado(
                  flujo
                );

              const rechazado =
                esFlujoRechazado(
                  flujo
                );

              const miFirma =
                obtenerFirmanteUsuario(
                  flujo,
                  usuarioActualId
                );

              const puedeFirmar =
                firmanteEstaHabilitado(
                  miFirma
                );

              const tituloFlujo =
                flujo.documentos
                  ?.titulo ||
                flujo.titulo ||
                "Sin título";

              const descripcionFlujo =
                flujo.documentos
                  ?.descripcion ||
                flujo.descripcion ||
                "Sin descripción";

              const numeroFlujo =
                flujo.numero_flujo ||
                flujo.documentos
                  ?.codigo_flujo ||
                "S/N";

              const tipoDocumento =
                obtenerNombreTipoDocumento(
                  flujo.documentos
                    ?.tipo_documento_id ||
                    flujo.tipo_documento_id
                );

              const version =
                obtenerVersionActualFlujo(
                  flujo
                );

              const firmantes =
                Array.isArray(
                  flujo.documentos_firmantes
                )
                  ? [
                      ...flujo.documentos_firmantes,
                    ].sort(
                      (a, b) =>
                        a.orden -
                        b.orden
                    )
                  : [];

              const desactivado = flujo.estado_flujo_id === "925e2cd5-62e5-4313-bb27-cf487af69bb2" || normalizarTexto(flujo.estado).includes("desactivado");
              const enCurso = !finalizado && !rechazado && !desactivado;
              const tieneFirmantesProcesados = flujoTieneFirmantesProcesados(flujo);
              const puedeEditar = puedeEditarFlujo(flujo);
              const puedeDesactivar = esCreador && enCurso;
              const puedeReanudar = esCreador && desactivado;
              const puedeReiniciar = esCreador && !finalizado;
              const puedeEliminar = esCreador && !finalizado && !rechazado;

              const bordeTarjeta = finalizado
                ? "border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-100 dark:ring-emerald-900/40"
                : rechazado
                ? "border-red-300 dark:border-red-700 ring-1 ring-red-100 dark:ring-red-900/40"
                : desactivado
                ? "border-slate-400 dark:border-slate-600 ring-1 ring-slate-200 dark:ring-slate-800"
                : puedeFirmar
                ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-100 dark:ring-amber-900/40"
                : "border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-50 dark:ring-indigo-950/30";

              const encabezadoTarjeta = finalizado
                ? "bg-emerald-50/70 dark:bg-emerald-950/20"
                : rechazado
                ? "bg-red-50/70 dark:bg-red-950/20"
                : desactivado
                ? "bg-slate-100/80 dark:bg-slate-800/70"
                : puedeFirmar
                ? "bg-amber-50/70 dark:bg-amber-950/20"
                : "bg-indigo-50/50 dark:bg-indigo-950/15";

              return (
                <div
                  key={flujo.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border-2 ${bordeTarjeta} shadow-sm hover:shadow-md transition overflow-hidden`}
                >

                  {/* ==================================================
                      CABECERA
                  ================================================== */}

                  <div className={`p-5 ${encabezadoTarjeta}`}>

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold">
                            {numeroFlujo}
                          </span>

                          {esCreador && (
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-semibold">
                              Creador
                            </span>
                          )}

                          {puedeFirmar && (
                            <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              Tu firma está habilitada
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 text-base font-bold text-gray-900 dark:text-white line-clamp-2">
                          {tituloFlujo}
                        </h2>

                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                          {descripcionFlujo}
                        </p>

                      </div>

                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          finalizado
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : rechazado
                            ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                        }`}
                      >
                        {obtenerTextoEstado(
                          flujo
                        ) || "En curso"}
                      </span>

                    </div>

                    {/* ==================================================
                        INFORMACIÓN
                    ================================================== */}

                    <div className="grid grid-cols-2 gap-3 mt-5">

                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                        <p className="text-[10px] uppercase font-semibold text-gray-400">
                          Tipo
                        </p>

                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mt-1">
                          {tipoDocumento}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                        <p className="text-[10px] uppercase font-semibold text-gray-400">
                          Inicio
                        </p>

                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mt-1">
                          {formatearFecha(
                            flujo.fecha_inicio ||
                              flujo.created_at
                          )}
                        </p>
                      </div>

                    </div>

                    {/* ==================================================
                        ARCHIVO
                    ================================================== */}

                    <div className="mt-4 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20">

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-3 min-w-0">

                          <div className="h-9 w-9 shrink-0 rounded-lg bg-white dark:bg-slate-900 text-indigo-600 flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
                            <FileText className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">

                            <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">
                              {version?.nombre_archivo ||
                                "Archivo del flujo"}
                            </p>

                            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                              {version
                                ? `Versión ${
                                    version.numero_version
                                  }${
                                    version.tamano_bytes
                                      ? ` · ${formatearTamano(
                                          version.tamano_bytes
                                        )}`
                                      : ""
                                  }`
                                : "Archivo disponible mediante el flujo"}
                            </p>

                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            descargarArchivo(
                              flujo
                            )
                          }
                          disabled={
                            descargandoArchivo
                          }
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          {descargandoArchivo ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}

                          Archivo
                        </button>

                      </div>
                    </div>

                    {/* ==================================================
                        FIRMANTES
                    ================================================== */}

                    {firmantes.length > 0 && (
                      <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">

                        <div className="flex items-center justify-between mb-2">

                          <p className="text-xs font-bold text-gray-700 dark:text-slate-200">
                            Firmantes
                          </p>

                          <span className="text-[10px] text-gray-400">
                            {firmantes.length}{" "}
                            {firmantes.length ===
                            1
                              ? "paso"
                              : "pasos"}
                          </span>

                        </div>

                        <div className="space-y-2">

                          {firmantes.map(
                            (firmante) => {
                              const aprobado =
                                !!firmante.fecha_aprobacion;

                              const rechazadoFirmante =
                                !!firmante.fecha_rechazo;

                              const habilitado =
                                firmanteEstaHabilitado(
                                  firmante
                                );

                              const esMiFirma =
                                firmante.usuario_id ===
                                usuarioActualId;

                              let texto =
                                "Pendiente";

                              let clase =
                                "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300";

                              if (
                                aprobado
                              ) {
                                texto =
                                  "Aprobado";

                                clase =
                                  "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";
                              } else if (
                                rechazadoFirmante
                              ) {
                                texto =
                                  "Rechazado";

                                clase =
                                  "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
                              } else if (
                                habilitado
                              ) {
                                texto =
                                  "Habilitado";

                                clase =
                                  "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400";
                              }

                              return (
                                <div
                                  key={
                                    firmante.id
                                  }
                                  className={`flex items-center justify-between gap-3 ${
                                    esMiFirma
                                      ? "rounded-lg bg-white dark:bg-slate-900 px-2 py-1.5"
                                      : ""
                                  }`}
                                >

                                  <div className="flex items-center gap-2 min-w-0">

                                    <span className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                                      {
                                        firmante.orden
                                      }
                                    </span>

                                    <div className="min-w-0">

                                      <p className="text-xs text-gray-700 dark:text-slate-300 truncate">
                                        {obtenerNombreUsuario(
                                          firmante.usuario_id
                                        )}

                                        {esMiFirma && (
                                          <span className="ml-1 text-indigo-600 dark:text-indigo-400">
                                            (tú)
                                          </span>
                                        )}
                                      </p>

                                      {firmante.fecha_aprobacion && (
                                        <p className="text-[9px] text-gray-400">
                                          {formatearFecha(
                                            firmante.fecha_aprobacion
                                          )}
                                        </p>
                                      )}

                                      {firmante.observaciones && (
                                        <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-400 italic whitespace-pre-wrap">
                                          “{firmante.observaciones}”
                                        </p>
                                      )}

                                    </div>

                                  </div>

                                  <span
                                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${clase}`}
                                  >
                                    {texto}
                                  </span>

                                </div>
                              );
                            }
                          )}

                        </div>
                      </div>
                    )}

                    {/* ==================================================
                        GESTIÓN CREADOR / FIRMANTE
                    ================================================== */}

                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">

                      {esCreador && (tabActiva === "creados" || tabActiva === "bandeja") && (
                        <div className="rounded-xl border border-sky-200 dark:border-sky-900/70 bg-sky-50/60 dark:bg-sky-950/20 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                            <div>
                              <p className="text-[11px] font-bold text-sky-800 dark:text-sky-300">Gestión del creador</p>
                              <p className="text-[9px] text-sky-700/70 dark:text-sky-400/70">Control del ciclo de vida del flujo.</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {puedeEditar && (
                              <button type="button" onClick={() => abrirModalEditar(flujo)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-[10px] font-semibold hover:bg-sky-100 dark:hover:bg-slate-800 transition">
                                <Edit3 className="h-3.5 w-3.5" /> Editar flujo
                              </button>
                            )}

                            {puedeDesactivar && (
                              <button type="button" disabled={!!accionGestionando} onClick={() => cambiarEstadoFlujo(flujo, "desactivar")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold hover:bg-amber-100 transition disabled:opacity-50">
                                <PauseCircle className="h-3.5 w-3.5" /> {accionGestionando === `${flujo.id}:desactivar` ? "Pausando..." : "Desactivar"}
                              </button>
                            )}

                            {puedeReanudar && (
                              <button type="button" disabled={!!accionGestionando} onClick={() => cambiarEstadoFlujo(flujo, "reanudar")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold hover:bg-emerald-100 transition disabled:opacity-50">
                                <Play className="h-3.5 w-3.5" /> {accionGestionando === `${flujo.id}:reanudar` ? "Reanudando..." : "Reanudar"}
                              </button>
                            )}

                            {puedeReiniciar && (
                              <button type="button" disabled={!!accionGestionando} onClick={() => cambiarEstadoFlujo(flujo, "reiniciar")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-[10px] font-semibold hover:bg-violet-100 transition disabled:opacity-50">
                                <RotateCcw className="h-3.5 w-3.5" /> {accionGestionando === `${flujo.id}:reiniciar` ? "Reiniciando..." : "Reiniciar"}
                              </button>
                            )}

                            {puedeEliminar && (
                              <button type="button" disabled={!!accionGestionando} onClick={() => cambiarEstadoFlujo(flujo, "eliminar")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-[10px] font-semibold hover:bg-red-100 transition disabled:opacity-50">
                                <Trash2 className="h-3.5 w-3.5" /> {accionGestionando === `${flujo.id}:eliminar` ? "Eliminando..." : "Eliminar"}
                              </button>
                            )}

                            {tieneFirmantesProcesados && !finalizado && !rechazado && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-[10px] font-medium">
                                <Lock className="h-3.5 w-3.5" /> Edición bloqueada por una firma procesada
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {miFirma && tabActiva === "bandeja" && (
                        <div className="rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <FileSignature className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <div>
                              <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Tu gestión como firmante</p>
                              <p className="text-[9px] text-amber-700/70 dark:text-amber-400/70">Solo puedes procesar el paso cuando está habilitado para ti.</p>
                            </div>
                          </div>

                          {puedeFirmar ? (
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => abrirGestionArchivoFirmado(flujo)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold transition">
                                <Upload className="h-3.5 w-3.5" /> Subir archivo firmado
                              </button>
                              <button type="button" onClick={() => abrirGestion(flujo, "aprobar")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold transition">
                                <CheckCircle className="h-3.5 w-3.5" /> Aprobar
                              </button>
                              <button type="button" onClick={() => abrirGestion(flujo, "rechazar")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold transition">
                                <XCircle className="h-3.5 w-3.5" /> Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 text-[10px] font-semibold">
                              <Clock className="h-3.5 w-3.5" /> Esperando habilitación
                            </span>
                          )}
                        </div>
                      )}

                      {puedePublicarComoCreador(
                        flujo,
                        usuarioActualId
                      ) && (
                        <button
                          type="button"
                          onClick={() => abrirPublicacion(flujo)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg transition"
                        >
                          <Send className="h-3.5 w-3.5" /> Publicar documento
                        </button>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => descargarArchivo(flujo)} disabled={descargandoArchivo} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold rounded-lg transition disabled:opacity-50">
                          {descargandoArchivo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Descargar archivo
                        </button>

                        <button type="button" onClick={() => verArchivo(flujo)} disabled={descargandoArchivo} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-[11px] font-semibold rounded-lg transition disabled:opacity-50">
                          <Eye className="h-3.5 w-3.5" /> Ver archivo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}

        </div>
      )}

      {/* ========================================================
          MODAL CREAR FLUJO
      ======================================================== */}

      {modalCrear && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800">

            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">

              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {modoEdicion ? "Editar flujo de aprobación" : "Nuevo flujo de aprobación"}
                </h2>

                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                  Adjunta el documento y define la secuencia de firmantes.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cerrarModalCrear
                }
                disabled={enviando}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <form
              onSubmit={
                handleSubmitCrearOEditarFlujo
              }
              className="p-6 space-y-5"
            >

              {/* TÍTULO */}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Título *
                </label>

                <input
                  type="text"
                  value={titulo}
                  onChange={(e) =>
                    setTitulo(
                      e.target.value
                    )
                  }
                  placeholder="Título del documento"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* DESCRIPCIÓN */}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Descripción
                </label>

                <textarea
                  value={descripcion}
                  onChange={(e) =>
                    setDescripcion(
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="Descripción del documento o propósito del flujo"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* TIPO */}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Tipo de documento *
                </label>

                <select
                  value={
                    tipoDocumentoId
                  }
                  onChange={(e) =>
                    setTipoDocumentoId(
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">
                    Selecciona un tipo
                  </option>

                  {tiposDocumento.map(
                    (tipo) => (
                      <option
                        key={tipo.id}
                        value={tipo.id}
                      >
                        {tipo.nombre}
                        {tipo.codigo
                          ? ` (${tipo.codigo})`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* ARCHIVO */}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Documento adjunto *
                </label>

                <label className="block cursor-pointer">

                  <input
                    type="file"
                    onChange={(e) =>
                      setArchivo(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                    className="hidden"
                  />

                  <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-indigo-400 rounded-xl p-6 text-center transition">

                    <Upload className="h-7 w-7 mx-auto text-indigo-500" />

                    {archivo ? (
                      <>
                        <p className="mt-2 text-xs font-semibold text-gray-800 dark:text-slate-200">
                          {archivo.name}
                        </p>

                        <p className="mt-1 text-[10px] text-gray-400">
                          {formatearTamano(
                            archivo.size
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-xs font-semibold text-gray-700 dark:text-slate-300">
                          Seleccionar archivo
                        </p>

                        <p className="mt-1 text-[10px] text-gray-400">
                          Este archivo será almacenado inicialmente dentro del flujo.
                        </p>
                      </>
                    )}

                  </div>

                </label>
              </div>

              {/* FIRMANTES */}

              <div>
                <div className="flex items-center justify-between mb-2">

                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                    Firmantes *
                  </label>

                  <span className="text-[10px] text-gray-400">
                    Seleccionados:{" "}
                    {
                      firmantesSeleccionados.length
                    }
                  </span>

                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">

                  {usuariosDisponibles.length ===
                  0 ? (
                    <div className="p-5 text-center text-xs text-gray-500">
                      No hay usuarios disponibles.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">

                      {usuariosDisponibles
                        .filter(
                          (usuario) =>
                            usuario.id !==
                            usuarioActualId
                        )
                        .map(
                          (usuario) => {
                            const seleccionado =
                              firmantesSeleccionados.includes(
                                usuario.id
                              );

                            const orden =
                              firmantesSeleccionados.indexOf(
                                usuario.id
                              ) + 1;

                            return (
                              <button
                                type="button"
                                key={
                                  usuario.id
                                }
                                onClick={() =>
                                  alternarFirmante(
                                    usuario.id
                                  )
                                }
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                                  seleccionado
                                    ? "bg-indigo-50 dark:bg-indigo-950/30"
                                    : "hover:bg-gray-50 dark:hover:bg-slate-800"
                                }`}
                              >

                                <div
                                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                    seleccionado
                                      ? "bg-indigo-600 text-white"
                                      : "bg-gray-100 dark:bg-slate-700 text-gray-500"
                                  }`}
                                >
                                  {seleccionado ? (
                                    <span className="text-xs font-bold">
                                      {orden}
                                    </span>
                                  ) : (
                                    <UserCheck className="h-4 w-4" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">

                                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                                    {obtenerNombreUsuario(
                                      usuario.id
                                    )}
                                  </p>

                                  {usuario.razon_social && (
                                    <p className="text-[10px] text-gray-400 truncate">
                                      {
                                        usuario.razon_social
                                      }
                                    </p>
                                  )}

                                </div>

                                {seleccionado && (
                                  <CheckCircle className="h-4 w-4 text-indigo-600" />
                                )}

                              </button>
                            );
                          }
                        )}

                    </div>
                  )}

                </div>

                <p className="mt-2 text-[10px] text-gray-400">
                  El orden de selección determina el orden de aprobación.
                </p>
              </div>

              {/* BOTONES */}

              <div className="pt-3 flex justify-end gap-2">

                <button
                  type="button"
                  onClick={
                    cerrarModalCrear
                  }
                  disabled={enviando}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={enviando}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  {enviando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}

                  Crear flujo
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PROCESAR
      ======================================================== */}

      {modalProcesar &&
        flujoSeleccionado && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800">

              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">

                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Revisar flujo
                  </h2>

                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    {
                      flujoSeleccionado.numero_flujo
                    }{" "}
                    ·{" "}
                    {flujoSeleccionado.titulo ||
                      flujoSeleccionado.documentos
                        ?.titulo}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    cerrarModalProcesar
                  }
                  disabled={enviando}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <form
                onSubmit={
                  handleSubmitProcesar
                }
                className="p-6 space-y-5"
              >

                {/* ARCHIVO */}

                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">

                  <div className="flex items-center gap-3">

                    <div className="h-9 w-9 rounded-lg bg-white dark:bg-slate-900 text-indigo-600 flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">
                        {
                          obtenerVersionActualFlujo(
                            flujoSeleccionado
                          )?.nombre_archivo ||
                          "Documento del flujo"
                        }
                      </p>

                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Revisa el archivo antes de tomar una decisión.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        verArchivo(flujoSeleccionado)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-semibold border border-indigo-100 dark:border-indigo-800"
                    >
                      <Download className="h-3 w-3" />
                      Ver
                    </button>

                  </div>
                </div>

                {/* DECISIÓN */}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Decisión
                  </label>

                  <div className="grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setAccionTipo(
                          "aprobar"
                        )
                      }
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition ${
                        accionTipo ===
                        "aprobar"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "border-gray-200 dark:border-slate-700 text-gray-500"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aprobar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAccionTipo(
                          "rechazar"
                        )
                      }
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition ${
                        accionTipo ===
                        "rechazar"
                          ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                          : "border-gray-200 dark:border-slate-700 text-gray-500"
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </button>

                  </div>
                </div>

                {/* OBSERVACIÓN */}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Observación{" "}
                    {accionTipo ===
                      "rechazar" &&
                      "*"}
                  </label>

                  <textarea
                    value={
                      observacion
                    }
                    onChange={(e) =>
                      setObservacion(
                        e.target.value
                      )
                    }
                    rows={4}
                    placeholder={
                      accionTipo ===
                      "rechazar"
                        ? "Indica el motivo del rechazo..."
                        : "Puedes agregar una observación..."
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    required={
                      accionTipo ===
                      "rechazar"
                    }
                  />
                </div>

                {/* ARCHIVO FIRMADO */}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Archivo firmado{" "}
                    <span className="text-gray-400 font-normal">
                      (opcional)
                    </span>
                  </label>

                  <input
                    type="file"
                    onChange={(e) =>
                      setArchivoFirmado(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 file:font-semibold"
                  />
                </div>

                {/* BOTONES */}

                <div className="pt-2 flex justify-end gap-2">

                  <button
                    type="button"
                    onClick={
                      cerrarModalProcesar
                    }
                    disabled={enviando}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      enviando
                    }
                    className={`inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-semibold rounded-xl disabled:opacity-50 ${
                      accionTipo ===
                      "rechazar"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {enviando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : accionTipo ===
                      "rechazar" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}

                    {accionTipo ===
                    "rechazar"
                      ? "Rechazar flujo"
                      : "Aprobar flujo"}
                  </button>

                </div>

              </form>

            </div>
          </div>
        )}

      {/* ========================================================
          MODAL PUBLICACIÓN
      ======================================================== */}

      {modalPublicar &&
        flujoSeleccionado && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800">

              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">

                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Publicar documento
                  </h2>

                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    {
                      flujoSeleccionado.numero_flujo
                    }{" "}
                    ·{" "}
                    {flujoSeleccionado.titulo ||
                      flujoSeleccionado.documentos
                        ?.titulo}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    cerrarModalPublicar
                  }
                  disabled={enviando}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <form
                onSubmit={
                  handleSubmitPublicacion
                }
                className="p-6 space-y-5"
              >

                {/* INFORMACIÓN */}

                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">

                  <div className="flex items-start gap-3">

                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />

                    <div>

                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Flujo finalizado
                      </p>

                      <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                        El documento definitivo está disponible y puede ser publicado.
                      </p>

                    </div>

                  </div>
                </div>

                {/* DESTINO */}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Módulo de destino
                  </label>

                  <div className="grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setModuloDestino(
                          "documentos"
                        )
                      }
                      className={`p-4 rounded-xl border text-left transition ${
                        moduloDestino ===
                        "documentos"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                          : "border-gray-200 dark:border-slate-700"
                      }`}
                    >

                      <Globe
                        className={`h-5 w-5 ${
                          moduloDestino ===
                          "documentos"
                            ? "text-indigo-600"
                            : "text-gray-400"
                        }`}
                      />

                      <p className="mt-2 text-xs font-bold text-gray-800 dark:text-slate-200">
                        Documentos
                      </p>

                      <p className="mt-1 text-[10px] text-gray-500 dark:text-slate-400">
                        Repositorio documental público.
                      </p>

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setModuloDestino(
                          "repositorios"
                        )
                      }
                      className={`p-4 rounded-xl border text-left transition ${
                        moduloDestino ===
                        "repositorios"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                          : "border-gray-200 dark:border-slate-700"
                      }`}
                    >

                      <Lock
                        className={`h-5 w-5 ${
                          moduloDestino ===
                          "repositorios"
                            ? "text-indigo-600"
                            : "text-gray-400"
                        }`}
                      />

                      <p className="mt-2 text-xs font-bold text-gray-800 dark:text-slate-200">
                        Repositorio
                      </p>

                      <p className="mt-1 text-[10px] text-gray-500 dark:text-slate-400">
                        Documentos privados para usuarios autorizados.
                      </p>

                    </button>

                  </div>
                </div>

                {/* DOCUMENTOS */}
                {moduloDestino === "documentos" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">
                      Visibilidad por roles
                    </label>

                    <div className="space-y-2">
                      {rolesDisponibles.length === 0 ? (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300">
                          No hay roles activos disponibles para configurar la visibilidad.
                        </div>
                      ) : (
                        rolesDisponibles.map((rol) => {
                          const seleccionado = rolesPermitidos.includes(rol.id);

                          return (
                            <label
                              key={rol.id}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                                seleccionado
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                  : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={seleccionado}
                                onChange={() =>
                                  setRolesPermitidos((actuales) =>
                                    actuales.includes(rol.id)
                                      ? actuales.filter((id) => id !== rol.id)
                                      : [...actuales, rol.id]
                                  )
                                }
                                className="h-4 w-4 accent-indigo-600"
                              />
                              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                                {rol.nombre}
                                {rol.codigo ? ` (${rol.codigo})` : ""}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* REPOSITORIO PRIVADO */}
                {moduloDestino === "repositorios" && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-slate-600 dark:text-slate-300 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Bóveda privada</p>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          El documento será publicado en el módulo Repositorio como información privada. No debes seleccionar un subtipo de repositorio.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOTONES */}

                <div className="pt-2 flex justify-end gap-2">

                  <button
                    type="button"
                    onClick={
                      cerrarModalPublicar
                    }
                    disabled={enviando}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      enviando ||
                      (moduloDestino ===
                        "documentos" &&
                        rolesPermitidos.length ===
                          0)
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                  >
                    {enviando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : moduloDestino ===
                      "repositorios" ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}

                    Publicar
                  </button>

                </div>

              </form>

            </div>
          </div>
        )}

    </div>
  );
}