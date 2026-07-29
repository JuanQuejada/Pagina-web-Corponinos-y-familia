"use client";

import { useEffect, useState } from "react";
import { GitCommit, FileText, CheckCircle2, Clock, Download, Upload, Loader2, AlertCircle, PlusCircle, CheckCircle, XCircle, MessageSquare, SkipForward, Ban } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function FlujoAprobacionesPage() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [historialFlujos, setHistorialFlujos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [currentPerfilId, setCurrentPerfilId] = useState<string | null>(null);
  const [puedeIniciar, setPuedeIniciar] = useState(false);
  
  // Estados para el Modal de Nuevo Flujo (Subida de archivo inicial)
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<any[]>([]);
  
  const [nuevoFlujoForm, setNuevoFlujoForm] = useState({
    titulo: "",
    proposito: "",
    fecha_limite: "",
    firmantes_ids: [] as string[],
    archivo: null as File | null,
  });
  const [creandoFlujo, setCreandoFlujo] = useState(false);

  // Estados para procesar el paso actual (firmar, rechazar, omitir, etc.)
  const [procesandoPaso, setProcesandoPaso] = useState<string | null>(null);
  const [observacionPaso, setObservacionPaso] = useState("");

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setCargando(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("id, puede_iniciar_flujos")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (!perfil) return;
      setCurrentPerfilId(perfil.id);
      setPuedeIniciar(!!perfil.puede_iniciar_flujos);

      // 1. Bandeja de pendientes por firmar/aprobar
      const { data: firmasData } = await supabase
        .from("documentos_firmantes")
        .select(`
          id,
          orden,
          fecha_habilitacion,
          fecha_aprobacion,
          documentos_flujos(
            id,
            numero_flujo,
            estado,
            proposito,
            fecha_limite,
            creador_id,
            documentos(id, titulo, descripcion, documentos_versiones(drive_url, nombre_archivo, es_version_actual))
          )
        `)
        .eq("usuario_id", perfil.id)
        .is("fecha_aprobacion", null)
        .order("created_at", { ascending: false });

      if (firmasData) setPendientes(firmasData);

      // 2. Historial de flujos
      const { data: historialData } = await supabase
        .from("documentos_flujos")
        .select(`
          id,
          numero_flujo,
          estado,
          proposito,
          fecha_limite,
          destino_final,
          consecutivo_repositorio_privado,
          created_at,
          documentos(titulo),
          documentos_flujos_historial(id, accion, observacion, created_at, usuarios(nombres, apellidos))
        `)
        .order("created_at", { ascending: false });

      if (historialData) setHistorialFlujos(historialData);

    } catch (err) {
      console.error("Error:", err);
    } finally {
      setCargando(false);
    }
  };

  const abrirModalCrearFlujo = async () => {
    try {
      const { data: users } = await supabase.from("usuarios").select("id, nombres, apellidos, razon_social").order("nombres", { ascending: true });
      if (users) setUsuariosDisponibles(users);
      setModalCrearAbierto(true);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    }
  };

  const iniciarNuevoFlujoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoFlujoForm.archivo || !nuevoFlujoForm.titulo || nuevoFlujoForm.firmantes_ids.length === 0) {
      alert("Debes ingresar un título, adjuntar el archivo y seleccionar al menos un firmante.");
      return;
    }

    setCreandoFlujo(true);
    try {
      // 1. Subir documento y crear versión inicial (simulado mediante API o inserción directa)
      const formData = new FormData();
      formData.append("file", nuevoFlujoForm.archivo);
      formData.append("titulo", nuevoFlujoForm.titulo);
      formData.append("descripcion", nuevoFlujoForm.proposito);

      const resUpload = await fetch("/api/subir-documento-flujo", {
        method: "POST",
        body: formData,
      });
      const resJson = await resUpload.json();
      if (!resJson.success) throw new Error(resJson.error || "Error al subir el archivo del flujo.");

      const documentoId = resJson.documentoId;
      // CORRECCIÓN 1: Generar numero_flujo como tipo number
      const numeroFlujo = Math.floor(100000 + Math.random() * 900000);

      // 2. Crear Registro en documentos_flujos
const { data: flujoIns, error: errFlujo } = await supabase
  .from("documentos_flujos")
  .insert([{
    // Ajusta estos nombres según los campos reales que te exige tu base de datos:
    // Si tu esquema pide columnas específicas para relacionar el documento o el usuario que inicia, colócalas aquí:
    iniciado_por: currentPerfilId, 
    estado_flujo_id: "ID_DEL_ESTADO_INICIAL", // Reemplaza por el ID correspondiente o valor por defecto que use tu tabla para 'En Trámite'
    numero_flujo: numeroFlujo,
    proposito: nuevoFlujoForm.proposito,
    fecha_limite: nuevoFlujoForm.fecha_limite || null,
  } as any]) // Usar 'as any' temporalmente evita el bloqueo estricto de tipos de Supabase si la estructura difiere de la tabla cruda
  .select()
  .single();

if (errFlujo) throw errFlujo;

      // CORRECCIÓN 2: Ajustar filas de firmantes añadiendo los campos requeridos por el tipo (como estado_firmante_id si aplica)
      const firmantesRows = nuevoFlujoForm.firmantes_ids.map((uid, index) => ({
        documento_flujo_id: flujoIns.id,
        usuario_id: uid,
        orden: index + 1,
        fecha_habilitacion: index === 0 ? new Date().toISOString() : null,
        estado_firmante_id: "PENDIENTE_O_ID_CORRESPONDIENTE" // Reemplaza por el ID/valor por defecto válido según tu BD si es obligatorio
      }));

      const { error: errFirmantes } = await supabase.from("documentos_firmantes").insert(firmantesRows as any);
      if (errFirmantes) throw errFirmantes;

      // 4. Historial Inicial
      await supabase.from("documentos_flujos_historial").insert([{
        documento_flujo_id: flujoIns.id,
        usuario_id: currentPerfilId,
        accion: "Creado",
        observacion: `Flujo iniciado. Propósito: ${nuevoFlujoForm.proposito || "Sin propósito especificado"}`
      }]);

      alert("¡Flujo iniciado exitosamente con el documento cargado!");
      setModalCrearAbierto(false);
      setNuevoFlujoForm({ titulo: "", proposito: "", fecha_limite: "", firmantes_ids: [], archivo: null });
      cargarDatosIniciales();

    } catch (err: any) {
      alert("Error al crear el flujo: " + err.message);
    } finally {
      setCreandoFlujo(false);
    }
  };

  // Procesar las opciones de aprobación del firmante (Aprobar, Rechazar, Omitir, Con Observación)
  const ejecutarAccionPaso = async (accion: "Aprobar" | "Aprobar con observación" | "Omitir" | "Rechazar", firmanteId: string, flujoId: string) => {
    if ((accion === "Aprobar con observación" || accion === "Rechazar") && !observacionPaso.trim()) {
      alert("Debes escribir una observación obligatoria para esta acción.");
      return;
    }

    setProcesandoPaso(firmanteId);
    try {
      const res = await fetch("/api/procesar-paso-flujo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmanteId,
          flujoId,
          usuarioId: currentPerfilId,
          accion,
          observacion: observacionPaso || `Acción realizada: ${accion}`
        })
      });

      const resultado = await res.json();
      if (!resultado.success) throw new Error(resultado.error);

      alert(`Acción registrada exitosamente: ${accion}`);
      setObservacionPaso("");
      cargarDatosIniciales();

    } catch (err: any) {
      alert("Error al procesar paso: " + err.message);
    } finally {
      setProcesandoPaso(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitCommit className="h-6 w-6 text-indigo-600" />
            Flujo de Aprobación y Firmas Secuenciales
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Gestión documental, control de plazos límites, trazabilidad y opciones de tránsito avanzado.
          </p>
        </div>

        {puedeIniciar && (
          <button
            onClick={abrirModalCrearFlujo}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Iniciar Nuevo Flujo (Cargar Archivo)</span>
          </button>
        )}
      </div>

      {/* BANDEJA DE PENDIENTES */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Documentos Pendientes por mi Aprobación</h2>
        {cargando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : pendientes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-100 dark:border-slate-800 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-gray-900 dark:text-white">Al día</p>
            <p className="text-xs text-gray-500">No tienes documentos pendientes en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendientes.map((item) => {
              const flujo = item.documentos_flujos;
              const doc = flujo?.documentos;
              const versionActual = doc?.documentos_versiones?.find((v: any) => v.es_version_actual) || doc?.documentos_versiones?.[0];

              return (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md">
                          Flujo #{flujo?.numero_flujo}
                        </span>
                        {flujo?.fecha_limite && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                            <Clock className="h-3 w-3" /> Límite: {new Date(flujo.fecha_limite).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1">{doc?.titulo}</h3>
                      <p className="text-xs text-gray-500 mt-0.5"><strong>Propósito:</strong> {flujo?.proposito || "Sin propósito especificado"}</p>
                    </div>
                    {versionActual?.drive_url && (
                      <a
                        href={versionActual.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Ver Archivo</span>
                      </a>
                    )}
                  </div>

                  {/* Panel de decisiones del firmante */}
                  <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1">
                        Observaciones o Comentarios del Paso:
                      </label>
                      <input
                        type="text"
                        value={observacionPaso}
                        onChange={(e) => setObservacionPaso(e.target.value)}
                        placeholder="Escribe tus observaciones aquí (obligatorio para rechazar o aprobar con observación)..."
                        className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => ejecutarAccionPaso("Aprobar", item.id, flujo.id)}
                        disabled={procesandoPaso === item.id}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Aprobar</span>
                      </button>

                      <button
                        onClick={() => ejecutarAccionPaso("Aprobar con observación", item.id, flujo.id)}
                        disabled={procesandoPaso === item.id}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Con Observación</span>
                      </button>

                      <button
                        onClick={() => ejecutarAccionPaso("Omitir", item.id, flujo.id)}
                        disabled={procesandoPaso === item.id}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        <span>Omitir</span>
                      </button>

                      <button
                        onClick={() => ejecutarAccionPaso("Rechazar", item.id, flujo.id)}
                        disabled={procesandoPaso === item.id}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HISTORIAL Y TRAZABILIDAD */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Historial y Trazabilidad de Flujos</h2>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
          {historialFlujos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No hay registros en el historial.</p>
          ) : (
            historialFlujos.map((flujo) => (
              <div key={flujo.id} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">Flujo #{flujo.numero_flujo}</span>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{flujo.documentos?.titulo}</h3>
                    <p className="text-[11px] text-gray-500">Propósito: {flujo.proposito || "N/A"}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    flujo.estado === 'Aprobado' || flujo.estado === 'Finalizado' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' 
                      : flujo.estado === 'Rechazado'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                  }`}>
                    {flujo.estado}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-slate-700">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Trazabilidad de Comentarios</p>
                  {flujo.documentos_flujos_historial?.map((h: any) => (
                    <div key={h.id} className="text-xs flex justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-gray-100 dark:border-slate-800">
                      <div>
                        <strong className="text-indigo-600 dark:text-indigo-400">{h.accion}:</strong> <span className="text-gray-700 dark:text-slate-300">{h.observacion}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {h.usuarios?.nombres} {h.usuarios?.apellidos} • {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL INICIAR NUEVO FLUJO (SUBIDA DE ARCHIVO) */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-600" />
              Iniciar Nuevo Flujo (Cargar Archivo)
            </h3>

            <form onSubmit={iniciarNuevoFlujoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nombre / Título del Archivo *</label>
                <input
                  type="text"
                  value={nuevoFlujoForm.titulo}
                  onChange={(e) => setNuevoFlujoForm({...nuevoFlujoForm, titulo: e.target.value})}
                  placeholder="Ej: Contrato de Prestación de Servicios 2026"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Propósito del Flujo *</label>
                <textarea
                  value={nuevoFlujoForm.proposito}
                  onChange={(e) => setNuevoFlujoForm({...nuevoFlujoForm, proposito: e.target.value})}
                  placeholder="Explica detalladamente para qué se aprueba este documento..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Fecha Límite de Aprobación *</label>
                  <input
                    type="date"
                    value={nuevoFlujoForm.fecha_limite}
                    onChange={(e) => setNuevoFlujoForm({...nuevoFlujoForm, fecha_limite: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Adjuntar Archivo (PDF/Doc) *</label>
                  <input
                    type="file"
                    onChange={(e) => setNuevoFlujoForm({...nuevoFlujoForm, archivo: e.target.files?.[0] || null})}
                    className="w-full text-xs text-gray-500 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Firmantes en Orden Secuencial *</label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                  {usuariosDisponibles.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-xs p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nuevoFlujoForm.firmantes_ids.includes(u.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...nuevoFlujoForm.firmantes_ids, u.id]
                            : nuevoFlujoForm.firmantes_ids.filter(id => id !== u.id);
                          setNuevoFlujoForm({...nuevoFlujoForm, firmantes_ids: ids});
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{u.razon_social || `${u.nombres || ""} ${u.apellidos || ""}`}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoFlujo}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md"
                >
                  {creandoFlujo && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Iniciar Flujo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}