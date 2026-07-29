"use client";

import { useEffect, useState, useRef } from "react";
import { Lock, KeyRound, ShieldCheck, FileText, Download, Loader2, AlertCircle, Settings, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RepositorioPrivadoPage() {
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [claveIngresada, setClaveIngresada] = useState("");
  const [cargandoClave, setCargandoClave] = useState(false);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  
  // Estados de los documentos privados
  const [documentosPrivados, setDocumentosPrivados] = useState<any[]>([]);
  const [cargandoDocs, setCargandoDocs] = useState(false);

  // Configuración de Inactividad (en minutos, por defecto 5 minutos)
  const [tiempoInactividadMin, setTiempoInactividadMin] = useState<number>(5);
  const [mostrarModalConfig, setMostrarModalConfig] = useState(false);
  const [tiempoRestanteSeg, setTiempoRestanteSeg] = useState<number>(300);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Validar estado de sesión al cargar
  useEffect(() => {
    const sesionPrivada = sessionStorage.getItem("repositorio_autorizado");
    const minutosGuardados = localStorage.getItem("repositorio_inactividad_min");
    
    if (minutosGuardados) {
      const mins = parseInt(minutosGuardados);
      setTiempoInactividadMin(mins);
      setTiempoRestanteSeg(mins * 60);
    } else {
      localStorage.setItem("repositorio_inactividad_min", "5");
    }

    if (sesionPrivada === "true") {
      setAccesoConcedido(true);
      cargarDocumentosPrivados();
    }
  }, []);

  // 2. Control del temporizador de inactividad cuando hay acceso concedido
  useEffect(() => {
    if (!accesoConcedido) return;

    const reiniciarTemporizador = () => {
      const totalSegundos = tiempoInactividadMin * 60;
      setTiempoRestanteSeg(totalSegundos);

      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      // Cuenta regresiva visual de respaldo por segundo
      countdownRef.current = setInterval(() => {
        setTiempoRestanteSeg((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Temporizador principal que bloquea el repositorio por inactividad
      timerRef.current = setTimeout(() => {
        bloquearRepositorioPorInactividad();
      }, totalSegundos * 1000);
    };

    // Eventos que detectan actividad del usuario
    const eventos = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarTemporizador));

    reiniciarTemporizador();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      eventos.forEach((evento) => window.removeEventListener(evento, reiniciarTemporizador));
    };
  }, [accesoConcedido, tiempoInactividadMin]);

  const bloquearRepositorioPorInactividad = () => {
    sessionStorage.removeItem("repositorio_autorizado");
    setAccesoConcedido(false);
    alert("El repositorio se ha bloqueado automáticamente por inactividad.");
  };

  const guardarConfiguracionInactividad = (nuevoMinuto: number) => {
    setTiempoInactividadMin(nuevoMinuto);
    setTiempoRestanteSeg(nuevoMinuto * 60);
    localStorage.setItem("repositorio_inactividad_min", nuevoMinuto.toString());
    setMostrarModalConfig(false);
  };

  const verificarClavePrivada = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargandoClave(true);
    setErrorClave(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: usuario, error } = await supabase
        .from("usuarios")
        .select("clave_repositorio")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (error || !usuario) {
        throw new Error("No se pudo verificar el perfil del usuario.");
      }

      if (!usuario.clave_repositorio) {
        setErrorClave("No tienes una clave de repositorio asignada. Contacta al Administrador.");
        return;
      }

      if (usuario.clave_repositorio !== claveIngresada) {
        setErrorClave("La clave de acceso es incorrecta. Inténtalo nuevamente.");
        return;
      }

      sessionStorage.setItem("repositorio_autorizado", "true");
      setAccesoConcedido(true);
      cargarDocumentosPrivados();

    } catch (err: any) {
      setErrorClave(err.message || "Error al validar la clave.");
    } finally {
      setCargandoClave(false);
    }
  };

  const cargarDocumentosPrivados = async () => {
    setCargandoDocs(true);
    try {
      const { data, error } = await supabase
        .from("documentos")
        .select(`
          id,
          titulo,
          descripcion,
          fecha_documento,
          documentos_versiones(drive_url, nombre_archivo, es_version_actual)
        `)
        .eq("requiere_publicacion", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setDocumentosPrivados(data);
    } catch (err) {
      console.error("Error al cargar repositorio privado:", err);
    } finally {
      setCargandoDocs(false);
    }
  };

  // Formato para mostrar el tiempo restante (Minutos:Segundos)
  const formatearTiempo = (segundos: number) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Si no ha ingresado la clave, mostrar pantalla de bloqueo por PIN
  if (!accesoConcedido) {
    return (
      <div className="flex items-center justify-center min-h-[75vh] p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Repositorio Documental Privado</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Esta sección contiene información confidencial. Ingresa tu **clave de seguridad independiente** para continuar.
            </p>
          </div>

          <form onSubmit={verificarClavePrivada} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">
                Clave de Repositorio:
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={claveIngresada}
                  onChange={(e) => setClaveIngresada(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {errorClave && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorClave}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={cargandoClave}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {cargandoClave ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span>Desbloquear Repositorio</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Contenido del Repositorio Privado con Botón Flotante y Temporizador
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative min-h-[80vh]">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="h-6 w-6 text-indigo-600" />
            Repositorio Documental Privado y Confidencial
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Archivos internos protegidos por clave de seguridad corporativa.</span>
            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono font-medium">
              <Clock className="h-3 w-3" /> Bloqueo inactivo en: {formatearTiempo(tiempoRestanteSeg)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarModalConfig(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl transition-all"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Configurar Inactividad</span>
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem("repositorio_autorizado");
              setAccesoConcedido(false);
            }}
            className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all"
          >
            Bloquear Sesión
          </button>
        </div>
      </div>

      {cargandoDocs ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : documentosPrivados.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-gray-100 dark:border-slate-800 text-center space-y-3">
          <FileText className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Sin documentos privados</h2>
          <p className="text-xs text-gray-500">No hay archivos internos registrados en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentosPrivados.map((doc) => {
            const versionActual = doc.documentos_versiones?.find((v: any) => v.es_version_actual) || doc.documentos_versiones?.[0];

            return (
              <div key={doc.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
                <div>
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-md">
                    Confidencial / Uso Interno
                  </span>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white mt-2">{doc.titulo}</h2>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.descripcion || "Sin descripción"}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Fecha: {doc.fecha_documento}</span>
                  {versionActual?.drive_url && (
                    <a
                      href={versionActual.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-semibold rounded-lg transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Descargar Archivo</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ICONO FLOTANTE DE CONFIGURACIÓN RÁPIDA */}
      <button
        onClick={() => setMostrarModalConfig(true)}
        className="fixed bottom-6 right-6 h-12 w-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-40"
        title="Configurar tiempo de inactividad"
      >
        <Settings className="h-6 w-6" />
      </button>

      {/* MODAL DE CONFIGURACIÓN DE INACTIVIDAD */}
      {mostrarModalConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Configurar Inactividad
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Selecciona el tiempo transcurrido sin interacción para que el repositorio se bloquee de forma automática:
            </p>

            <div className="space-y-2">
              {[1, 2, 5, 10, 15, 30].map((min) => (
                <button
                  key={min}
                  onClick={() => guardarConfiguracionInactividad(min)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                    tiempoInactividadMin === min
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{min} {min === 1 ? "minuto" : "minutos"}</span>
                  {tiempoInactividadMin === min && <span className="text-[10px] uppercase font-bold tracking-wider">Activo</span>}
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setMostrarModalConfig(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}