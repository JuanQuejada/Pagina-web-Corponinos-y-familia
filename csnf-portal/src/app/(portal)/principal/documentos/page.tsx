"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download, FileText, Loader2, Search, RefreshCw, Plus, X, Upload,
  Globe2, Workflow, Save, Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Rol = { id: string; nombre: string; activo?: boolean };
type TipoDocumento = { id: string; nombre: string; codigo: string | null };
type Documento = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_documento: string;
  codigo_flujo: string | null;
  codigo_publicacion: string | null;
  palabras_clave: string | null;
  observaciones?: string | null;
  visibilidad?: string | null;
  estado?: string | null;
  creador_id?: string | null;
  tipo_documento?: TipoDocumento | null;
  origen?: "flujo" | "manual";
  es_publicacion_manual?: boolean;
  es_publicacion_flujo?: boolean;
  version_actual?: {
    nombre_archivo: string;
    mime_type: string | null;
    tamano_bytes?: number | null;
    drive_url?: string | null;
  } | null;
  publicacion_activa?: { codigo_publicacion: string; fecha_publicacion?: string | null } | null;
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

function fechaLocal(valor?: string | null) {
  if (!valor) return "—";
  return new Date(valor).toLocaleDateString("es-CO");
}

export default function DocumentosPage() {
  const [items, setItems] = useState<Documento[]>([]);
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaDocumento, setFechaDocumento] = useState(new Date().toISOString().slice(0, 10));
  const [palabrasClave, setPalabrasClave] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [tipoDocumentoId, setTipoDocumentoId] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>([]);
  const [todaEntidad, setTodaEntidad] = useState(false);

  async function cargar() {
    setLoading(true); setError("");
    try {
      const rawHeaders = await authHeaders();

      const headers: Record<string, string> = rawHeaders.Authorization
        ? { Authorization: rawHeaders.Authorization }
        : {};
      const [docsRes, tiposRes] = await Promise.all([
        fetch("/api/documentos/listar", { cache: "no-store", headers }),
        fetch("/api/tipos-documento", { cache: "no-store" }),
      ]);
      const docs = await docsRes.json().catch(() => ({}));
      const tiposData = await tiposRes.json().catch(() => ({}));
      if (!docsRes.ok || !docs.success) throw new Error(docs.error || "No fue posible cargar Documentos.");
      setItems(Array.isArray(docs.documentos) ? docs.documentos : []);
      setRoles(Array.isArray(docs.roles) ? docs.roles : []);
      setTipos(Array.isArray(tiposData.tipos) ? tiposData.tipos : []);
    } catch (e: any) {
      setItems([]); setError(e?.message || "No fue posible cargar los documentos.");
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((d) => {
      const texto = `${d.titulo} ${d.descripcion || ""} ${d.codigo_flujo || ""} ${d.codigo_publicacion || ""} ${d.palabras_clave || ""} ${d.tipo_documento?.nombre || ""}`.toLowerCase();
      return (!q || texto.includes(q)) && (tipo === "todos" || d.tipo_documento?.id === tipo);
    });
  }, [items, query, tipo]);

  function limpiarFormulario() {
    setTitulo(""); setDescripcion(""); setFechaDocumento(new Date().toISOString().slice(0, 10));
    setPalabrasClave(""); setObservaciones(""); setTipoDocumentoId(""); setArchivo(null);
    setRolesSeleccionados([]); setTodaEntidad(false);
  }

  function abrirCrear() { limpiarFormulario(); setModal(true); }
  function cerrarCrear() { if (!saving) setModal(false); }

  function toggleRol(id: string) {
    setRolesSeleccionados((actual) => actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]);
  }

  async function crearDocumento(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !tipoDocumentoId || !archivo) {
      alert("Completa título, tipo de documento y archivo."); return;
    }
    if (!todaEntidad && rolesSeleccionados.length === 0) {
      alert("Selecciona al menos un rol o marca 'Todos los roles'."); return;
    }
    setSaving(true);
    try {
      const headers = await authHeaders();
      if (!headers.Authorization) throw new Error("Sesión no válida.");
      const form = new FormData();
      form.append("titulo", titulo.trim());
      form.append("descripcion", descripcion.trim());
      form.append("fecha_documento", fechaDocumento);
      form.append("palabras_clave", palabrasClave.trim());
      form.append("observaciones", observaciones.trim());
      form.append("tipo_documento_id", tipoDocumentoId);
      form.append("archivo", archivo);
      form.append("roles", JSON.stringify(rolesSeleccionados));
      form.append("acceso_toda_entidad", String(todaEntidad));
      const res = await fetch("/api/documentos/crear", { method: "POST", headers, body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "No fue posible crear el documento.");
      alert(data.message || "Documento publicado correctamente.");
      cerrarCrear(); await cargar();
    } catch (e: any) { alert(e?.message || "Error creando el documento."); }
    finally { setSaving(false); }
  }

  async function descargar(id: string) {
    const rawHeaders = await authHeaders();

    const headers: Record<string, string> =
      rawHeaders.Authorization
        ? { Authorization: rawHeaders.Authorization }
        : {};
    const res = await fetch(`/api/documentos/archivo?id=${encodeURIComponent(id)}`, { headers, cache: "no-store" });
    if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.error || "No fue posible descargar el documento."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "documento"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold"><FileText className="h-6 w-6" /> Documentos</h1>
            <p className="mt-1 text-xs text-slate-500">Publicaciones provenientes de flujos de aprobación y publicaciones manuales.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={cargar} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold dark:bg-slate-800"><RefreshCw className="mr-1 inline h-3.5 w-3.5" /> Actualizar</button>
            <button onClick={abrirCrear} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-4 w-4" /> Nueva publicación</button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-[1fr_280px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título, descripción, código o palabras clave..." className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm dark:border-slate-800 dark:bg-slate-900" /></div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-xl border bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900"><option value="todos">Todos los tipos</option>{tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
      </section>

      {error && <div className="rounded-xl bg-red-50 p-4 text-xs text-red-700">{error}</div>}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : (
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((d) => {
            const manual = d.es_publicacion_manual ?? !d.codigo_flujo;
            return <article key={d.id} className={`rounded-2xl border p-5 shadow-sm ${manual ? "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20" : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"}`}>
              <div className="flex items-center justify-between gap-2"><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${manual ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}`}>{manual ? "PUBLICACIÓN MANUAL" : "PUBLICADO DESDE FLUJO"}</span>{manual ? <Globe2 className="h-4 w-4 text-blue-600" /> : <Workflow className="h-4 w-4 text-emerald-600" />}</div>
              <span className="mt-3 inline-block rounded-lg bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">{d.tipo_documento?.nombre || "Documento"}</span>
              <h2 className="mt-3 line-clamp-2 text-sm font-bold">{d.titulo}</h2>
              <p className="mt-1 line-clamp-3 text-xs text-slate-600 dark:text-slate-400">{d.descripcion || "Sin descripción."}</p>
              <div className="mt-4 space-y-1 rounded-xl bg-white/80 p-3 text-[10px] dark:bg-slate-900/70"><div className="flex justify-between gap-3"><span>Código publicación</span><b>{d.codigo_publicacion || "—"}</b></div><div className="flex justify-between gap-3"><span>Código flujo</span><span>{d.codigo_flujo || "Manual"}</span></div><div className="flex justify-between gap-3"><span>Fecha</span><span>{fechaLocal(d.fecha_documento)}</span></div><div className="flex justify-between gap-3"><span>Archivo</span><span className="truncate">{d.version_actual?.nombre_archivo || "—"}</span></div></div>
              <button onClick={() => descargar(d.id)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white ${manual ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}><Download className="h-4 w-4" /> Descargar</button>
            </article>;
          })}
        </section>
      )}
      {!loading && filtrados.length === 0 && <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">No se encontraron documentos visibles para tu usuario.</div>}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

            {/* Encabezado */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Nueva publicación manual
                    </h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Registra y publica un documento directamente en el módulo Documentos.
                      Completa la información para facilitar su identificación, búsqueda y control de acceso.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cerrarCrear}
                  disabled={saving}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Cerrar formulario"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={crearDocumento} className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-6">

                {/* Identificación */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-6 w-1 rounded-full bg-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Identificación del documento</h3>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Título del documento <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={titulo}
                        onChange={e => setTitulo(e.target.value)}
                        placeholder="Ej.: Acta de reunión del Comité Directivo"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                      <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                        Nombre oficial con el que los usuarios identificarán el documento.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Descripción o propósito
                      </label>
                      <textarea
                        value={descripcion}
                        onChange={e => setDescripcion(e.target.value)}
                        placeholder="Explique brevemente qué contiene el documento, para qué sirve o en qué contexto debe consultarse."
                        rows={3}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                        Esta información ayuda a los usuarios a comprender el contenido sin abrir el archivo.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                          Tipo de documento <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={tipoDocumentoId}
                          onChange={e => setTipoDocumentoId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        >
                          <option value="">Seleccione un tipo...</option>
                          {tipos.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.nombre}{t.codigo ? ` (${t.codigo})` : ""}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                          Clasificación documental. También determina el código de publicación generado por el sistema.
                        </p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                          Fecha del documento <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={fechaDocumento}
                          onChange={e => setFechaDocumento(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                        <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                          Fecha en la que fue elaborado, emitido o formalizado el documento. No corresponde a la fecha de publicación.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Código de publicación</p>
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                        Se generará automáticamente al publicar, por ejemplo:
                        <span className="ml-1 font-bold text-blue-600 dark:text-blue-400">PB-RES-2026-001</span>.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Archivo y metadatos */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-6 w-1 rounded-full bg-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Archivo y metadatos</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Documento que será publicado <span className="text-red-500">*</span>
                      </label>
                      <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-600 dark:hover:bg-blue-950/20">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                            {archivo ? archivo.name : "Seleccione el archivo que desea publicar"}
                          </p>
                          <p className="mt-1 text-[10px] leading-4 text-slate-500">
                            El archivo se almacenará en Google Drive dentro de la carpeta de Documentos del portal.
                          </p>
                        </div>
                        <span className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white">
                          Examinar
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => setArchivo(e.target.files?.[0] || null)}
                          required
                        />
                      </label>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Palabras clave
                      </label>
                      <input
                        value={palabrasClave}
                        onChange={e => setPalabrasClave(e.target.value)}
                        placeholder="Ej.: comité, acta, reunión, decisiones, 2026"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                        Separe las palabras por comas. Se utilizarán para facilitar búsquedas posteriores.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Observaciones
                      </label>
                      <textarea
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                        placeholder="Ingrese información adicional que deba conocer el usuario antes de consultar el documento."
                        rows={3}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                        Información complementaria sobre la publicación, restricciones, contexto o instrucciones de consulta.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Visibilidad */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-6 w-1 rounded-full bg-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Visibilidad y acceso</h3>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          ¿Quién podrá visualizar este documento?
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500">
                          Seleccione los roles que tendrán acceso. Si marca "Todos los roles", el documento será visible para todos los roles habilitados por el sistema.
                        </p>
                      </div>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                      <input
                        type="checkbox"
                        checked={todaEntidad}
                        onChange={e => {
                          setTodaEntidad(e.target.checked);
                          if (e.target.checked) setRolesSeleccionados([]);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        <span className="block text-xs font-bold text-emerald-800 dark:text-emerald-200">Todos los roles</span>
                        <span className="block text-[10px] text-emerald-700 dark:text-emerald-300">Cualquier usuario con un rol habilitado podrá visualizar la publicación.</span>
                      </span>
                    </label>

                    {!todaEntidad && (
                      <div className="mt-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Seleccione uno o varios roles
                        </p>
                        {roles.length === 0 ? (
                          <div className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                            No se encontraron roles disponibles. Verifique la configuración de roles en el sistema.
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {roles.map(r => {
                              const seleccionado = rolesSeleccionados.includes(r.id);
                              return (
                                <label
                                  key={r.id}
                                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                                    seleccionado
                                      ? "border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                                      : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={seleccionado}
                                    onChange={() => toggleRol(r.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{r.nombre}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <p className="mt-2 text-[10px] text-slate-500">
                          Debe seleccionar al menos un rol cuando no se utilice la opción "Todos los roles".
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Acciones */}
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <p className="hidden text-[10px] leading-4 text-slate-500 sm:block">
                  <span className="text-red-500">*</span> Campos obligatorios
                </p>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={cerrarCrear}
                    disabled={saving}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 inline h-4 w-4" />
                        Crear y publicar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}