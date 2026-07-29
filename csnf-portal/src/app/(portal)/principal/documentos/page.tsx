"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  Plus,
  Calendar,
  Loader2,
  FileCheck,
  X,
  User,
  Clock,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DocumentoPublico {
  id: string;
  titulo: string;
  descripcion: string;
  codigo_flujo: string;
  codigo_publicacion: string;
  fecha_documento: string;
  palabras_clave: string;
  tipo_documento_nombre: string;
  drive_url: string;
  nombre_archivo: string;
  alcance: string;
  publicado_por: string;
  fecha_publicacion: string;
  creador_id: string | null;
}

export default function DocumentosPublicosPage() {
  const [documentos, setDocumentos] = useState<DocumentoPublico[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<any[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [currentPerfilId, setCurrentPerfilId] = useState<string | null>(null);

  // Estados de Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

  // Estado del Modal de Eliminación
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [docAEliminar, setDocAEliminar] = useState<string | null>(null);
  const [causaEliminacion, setCausaEliminacion] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const [nuevoDoc, setNuevoDoc] = useState({
    titulo: "",
    descripcion: "",
    tipo_documento_id: "",
    codigo_flujo: "",
    palabras_clave: "",
    fecha_documento: new Date().toISOString().split("T")[0],
    alcance: "toda_entidad",
    rolesSeleccionados: [] as string[],
  });

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setCargando(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: perfil } = await supabase
          .from("usuarios")
          .select("id")
          .eq("auth_user_id", authData.user.id)
          .single();
        if (perfil) setCurrentPerfilId(perfil.id);
      }

      const { data: tipos } = await supabase
        .from("tipos_documento")
        .select("id, nombre, codigo")
        .order("nombre", { ascending: true });

      if (tipos) setTiposDocumento(tipos);

      const { data: roles } = await supabase
        .from("roles")
        .select("id, nombre, codigo")
        .order("nombre", { ascending: true });

      if (roles) setRolesDisponibles(roles);

      const { data: docsData, error: errDocs } = await supabase
        .from("documentos")
        .select(`
          id,
          titulo,
          descripcion,
          codigo_flujo,
          codigo_publicacion,
          fecha_documento,
          palabras_clave,
          created_at,
          creador_id,
          tipos_documento(nombre),
          documentos_versiones(drive_url, nombre_archivo, es_version_actual),
          documentos_destinatarios(acceso_toda_entidad, rol_id),
          usuarios:creador_id(nombres, apellidos, razon_social)
        `)
        .order("created_at", { ascending: false });

      if (errDocs) {
        console.error("Error al consultar documentos:", errDocs);
      } else if (docsData) {
        const formateados: DocumentoPublico[] = docsData.map((d: any) => {
          const autorObj = d.usuarios;
          const nombreAutor = autorObj
            ? `${autorObj.nombres || ""} ${autorObj.apellidos || ""}`.trim() || autorObj.razon_social || "Sistema Corporativo"
            : "Administración";

          const esTodaEntidad = d.documentos_destinatarios?.[0]?.acceso_toda_entidad;

          const listaVersiones = d.documentos_versiones || [];
          const versionActual =
            listaVersiones.find((v: any) => v.es_version_actual && v.drive_url) ||
            listaVersiones.find((v: any) => v.drive_url) ||
            listaVersiones[0];

          return {
            id: d.id,
            titulo: d.titulo,
            descripcion: d.descripcion,
            codigo_flujo: d.codigo_flujo || "N/A",
            codigo_publicacion: d.codigo_publicacion || "Pendiente",
            fecha_documento: d.fecha_documento,
            palabras_clave: d.palabras_clave,
            tipo_documento_nombre: d.tipos_documento?.nombre || "Documento General",
            drive_url: versionActual?.drive_url || versionActual?.url || "#",
            nombre_archivo: versionActual?.nombre_archivo || "Archivo adjunto",
            alcance: esTodaEntidad ? "Toda la Empresa" : "Multi-roles Autorizados",
            publicado_por: nombreAutor,
            fecha_publicacion: new Date(d.created_at).toLocaleString(),
            creador_id: d.creador_id,
          };
        });
        setDocumentos(formateados);
      }
    } catch (err) {
      console.error("Error inesperado al cargar datos:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleCheckboxRol = (rolId: string) => {
    setNuevoDoc((prev) => {
      const existe = prev.rolesSeleccionados.includes(rolId);
      return {
        ...prev,
        rolesSeleccionados: existe
          ? prev.rolesSeleccionados.filter((id) => id !== rolId)
          : [...prev.rolesSeleccionados, rolId],
      };
    });
  };

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoSeleccionado) {
      alert("Por favor selecciona un archivo.");
      return;
    }

    setGuardando(true);

    try {
      const dataForm = new FormData();
      dataForm.append("file", archivoSeleccionado);

      const resApi = await fetch("/api/upload-drive", {
        method: "POST",
        body: dataForm,
      });

      const resultadoDrive = await resApi.json();
      if (!resultadoDrive.success) {
        throw new Error(resultadoDrive.error || "Error al subir a Google Drive");
      }

      const urlDriveReal = resultadoDrive.webViewLink || resultadoDrive.url;

      const tipoSeleccionado = tiposDocumento.find((t) => t.id === nuevoDoc.tipo_documento_id);
      const prefijoTipo = tipoSeleccionado?.codigo || "DOC";

      const { count } = await supabase
        .from("documentos")
        .select("*", { count: "exact", head: true })
        .eq("tipo_documento_id", nuevoDoc.tipo_documento_id);

      const siguienteNumero = (count || 0) + 1;
      const numeroFormateado = String(siguienteNumero).padStart(3, "0");
      const anioActual = new Date().getFullYear();
      const codigoPub = `PB-${prefijoTipo.toUpperCase()}-${anioActual}-${numeroFormateado}`;

      const creadorUuid = currentPerfilId ?? "";

      const { data: docCreado, error: errorDoc } = await supabase
        .from("documentos")
        .insert([
          {
            titulo: nuevoDoc.titulo,
            descripcion: nuevoDoc.descripcion,
            tipo_documento_id: nuevoDoc.tipo_documento_id,
            codigo_flujo: nuevoDoc.codigo_flujo || null,
            codigo_publicacion: codigoPub,
            fecha_documento: nuevoDoc.fecha_documento,
            palabras_clave: nuevoDoc.palabras_clave,
            requiere_publicacion: true,
            creador_id: creadorUuid,
            estado_documento_id: "3bcfc838-cf94-48a6-993e-d8eff31cbc90",
          },
        ])
        .select()
        .single();

      if (errorDoc) throw errorDoc;

      if (docCreado) {
        const { error: errorVersion } = await supabase.from("documentos_versiones").insert([
          {
            documento_id: docCreado.id,
            numero_version: 1,
            es_version_actual: true,
            nombre_archivo: archivoSeleccionado.name,
            mime_type: archivoSeleccionado.type,
            tamano_bytes: archivoSeleccionado.size,
            drive_url: urlDriveReal,
            usuario_carga_id: creadorUuid,
          },
        ]);

        if (errorVersion) {
          console.error("Error al registrar versión:", errorVersion);
          alert("Error al registrar la versión en la base de datos: " + errorVersion.message);
          return;
        }

        if (nuevoDoc.alcance === "toda_entidad") {
          await supabase.from("documentos_destinatarios").insert([
            {
              documento_id: docCreado.id,
              acceso_toda_entidad: true,
            },
          ]);
        } else {
          const registrosRoles = nuevoDoc.rolesSeleccionados.map((rId) => ({
            documento_id: docCreado.id,
            acceso_toda_entidad: false,
            rol_id: rId,
          }));
          await supabase.from("documentos_destinatarios").insert(registrosRoles);
        }

        const fechaActualISO = new Date().toISOString();

        await supabase.from("documentos_publicaciones").insert([
          {
            documento_id: docCreado.id,
            codigo_publicacion: codigoPub,
            publicada: true,
            publicada_por: creadorUuid,
            fecha_inicio: fechaActualISO,
            fecha_publicacion: fechaActualISO,
          },
        ]);
      }

      setModalAbierto(false);
      setArchivoSeleccionado(null);
      setNuevoDoc({
        titulo: "",
        descripcion: "",
        tipo_documento_id: "",
        codigo_flujo: "",
        palabras_clave: "",
        fecha_documento: new Date().toISOString().split("T")[0],
        alcance: "toda_entidad",
        rolesSeleccionados: [],
      });
      cargarDatosIniciales();
    } catch (err: any) {
      console.error("Error al publicar:", err);
      alert("Error al guardar: " + (err.message || "Desconocido"));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docAEliminar || !causaEliminacion.trim()) {
      alert("Debe especificar la causa de la eliminación.");
      return;
    }

    setEliminando(true);
    try {
      const { error } = await supabase
        .from("documentos")
        .delete()
        .eq("id", docAEliminar);

      if (error) throw error;

      setModalEliminarAbierto(false);
      setDocAEliminar(null);
      setCausaEliminacion("");
      cargarDatosIniciales();
    } catch (err: any) {
      console.error("Error al eliminar documento:", err);
      alert("No se pudo eliminar el documento: " + (err.message || "Error"));
    } finally {
      setEliminando(false);
    }
  };

  const documentosFiltrados = documentos.filter((doc) => {
    const coincideTexto =
      doc.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      doc.codigo_publicacion.toLowerCase().includes(busqueda.toLowerCase()) ||
      doc.palabras_clave?.toLowerCase().includes(busqueda.toLowerCase());

    const coincideTipo = filtroTipo === "todos" || doc.tipo_documento_nombre === filtroTipo;

    return coincideTexto && coincideTipo;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Documentos Públicos y Oficiales
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Repositorio con integración segura a Google Drive API, multi-roles y trazabilidad completa.
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Publicar Documento</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título, código o palabras clave..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 outline-none shadow-sm"
          />
        </div>
        <div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 outline-none shadow-sm font-medium"
          >
            <option value="todos">Todos los Tipos de Documento</option>
            {tiposDocumento.map((t) => (
              <option key={t.id} value={t.nombre}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listado */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-gray-400">Cargando documentos...</p>
        </div>
      ) : documentosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-12 text-center space-y-3 shadow-sm">
          <FileText className="h-10 w-10 text-gray-300 mx-auto" />
          <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200">No se encontraron documentos</h3>
          <p className="text-[11px] text-gray-400">No hay registros públicos disponibles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documentosFiltrados.map((doc) => {
            const puedeBorrar = currentPerfilId && doc.creador_id === currentPerfilId;

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative"
              >
                {/* Botón de eliminación exclusivo para el creador */}
                {puedeBorrar && (
                  <button
                    onClick={() => {
                      setDocAEliminar(doc.id);
                      setModalEliminarAbierto(true);
                    }}
                    title="Eliminar documento"
                    className="absolute top-4 right-4 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                <div className="space-y-3 pr-8">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 dark:border-blue-900">
                      {doc.tipo_documento_nombre}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {doc.fecha_documento}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2">
                      {doc.titulo}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {doc.descripcion || "Sin descripción."}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl space-y-1 font-mono text-[10px]">
                    <div className="flex justify-between text-gray-600 dark:text-slate-300">
                      <span className="font-semibold text-gray-400">Publicación:</span>
                      <span className="font-bold text-blue-600">{doc.codigo_publicacion}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-slate-300">
                      <span className="font-semibold text-gray-400">Alcance:</span>
                      <span className="text-emerald-600 font-sans font-medium">{doc.alcance}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col gap-1 text-[10px] text-gray-400 border-t border-gray-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-blue-500" /> Publicado por: <strong className="text-gray-700 dark:text-slate-300">{doc.publicado_por}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-indigo-500" /> Fecha y hora: {doc.fecha_publicacion}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800 gap-2">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[130px] font-medium" title={doc.nombre_archivo}>
                    📄 {doc.nombre_archivo}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.drive_url && doc.drive_url !== "#" ? (
                      <>
                        <a
                          href={doc.drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-200 text-[11px] font-semibold rounded-lg transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Ver</span>
                        </a>
                        <a
                          href={doc.drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg shadow-sm transition-all"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Descargar</span>
                        </a>
                      </>
                    ) : (
                      <span className="text-[10px] text-red-500 font-medium">Sin archivo en Drive</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Publicar Documento */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-600" /> Publicar Documento Oficial
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublicar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Título del Documento *</label>
                <input
                  type="text"
                  required
                  value={nuevoDoc.titulo}
                  onChange={(e) => setNuevoDoc({ ...nuevoDoc, titulo: e.target.value })}
                  placeholder="Ej. Resolución General 2026"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Tipo de Documento *</label>
                <select
                  required
                  value={nuevoDoc.tipo_documento_id}
                  onChange={(e) => setNuevoDoc({ ...nuevoDoc, tipo_documento_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none font-medium"
                >
                  <option value="">Seleccione tipo de documento...</option>
                  {tiposDocumento.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold">Cargar Archivo del Documento *</label>
                <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center bg-gray-50/50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    required
                    onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-2">
                    El archivo se enviará de forma segura a Google Drive corporativo a través de la API.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold">Alcance y Destinatarios *</label>
                <select
                  value={nuevoDoc.alcance}
                  onChange={(e) => setNuevoDoc({ ...nuevoDoc, alcance: e.target.value, rolesSeleccionados: [] })}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none font-medium"
                >
                  <option value="toda_entidad">Toda la Empresa</option>
                  <option value="multiroles">Múltiples Roles Específicos</option>
                </select>

                {nuevoDoc.alcance === "multiroles" && (
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 max-h-36 overflow-y-auto space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400">Selecciona los roles aplicables:</p>
                    {rolesDisponibles.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nuevoDoc.rolesSeleccionados.includes(r.id)}
                          onChange={() => handleCheckboxRol(r.id)}
                          className="rounded text-blue-600"
                        />
                        <span>{r.nombre}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Fecha del Documento *</label>
                  <input
                    type="date"
                    required
                    value={nuevoDoc.fecha_documento}
                    onChange={(e) => setNuevoDoc({ ...nuevoDoc, fecha_documento: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Palabras Clave</label>
                  <input
                    type="text"
                    value={nuevoDoc.palabras_clave}
                    onChange={(e) => setNuevoDoc({ ...nuevoDoc, palabras_clave: e.target.value })}
                    placeholder="resolucion, gerencia"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descripción Breve</label>
                <textarea
                  rows={2}
                  value={nuevoDoc.descripcion}
                  onChange={(e) => setNuevoDoc({ ...nuevoDoc, descripcion: e.target.value })}
                  placeholder="Detalles clave..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Subir y Publicar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Eliminación con Causa Obligatoria */}
      {modalEliminarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Eliminar Documento Oficial</h3>
                <p className="text-[11px] text-gray-500">Esta acción retirará el documento del portal.</p>
              </div>
            </div>

            <form onSubmit={confirmarEliminacion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-red-600 dark:text-red-400">
                  Causa u Motivo de Eliminación (Obligatorio) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={causaEliminacion}
                  onChange={(e) => setCausaEliminacion(e.target.value)}
                  placeholder="Explique detalladamente por qué se retira o elimina este documento..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setModalEliminarAbierto(false);
                    setDocAEliminar(null);
                    setCausaEliminacion("");
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={eliminando}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  {eliminando && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Confirmar Eliminación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}