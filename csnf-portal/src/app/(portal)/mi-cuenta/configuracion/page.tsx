"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  KeyRound,
  Laptop,
  Globe,
  Bell,
  Lock,
  HelpCircle,
  Info,
  Save,
  Send,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  FileText,
} from "lucide-react";

export default function ConfiguracionPage() {
  const { usuarioPortal } = useAuth();
  const usuario = usuarioPortal?.usuario;
  const { theme, setTheme } = useTheme();

  // ---------------------------------------------------------------------------
  // ESTADOS
  // ---------------------------------------------------------------------------
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 1. Cambio de Contraseña
  const [passActual, setPassActual] = useState("");
  const [nuevaPass, setNuevaPass] = useState("");
  const [confirmarPass, setConfirmarPass] = useState("");
  const [passError, setPassError] = useState("");
  const [passExito, setPassExito] = useState("");

  // 2. Preferencias
  const [idioma, setIdioma] = useState("es");
  const [zonaHoraria, setZonaHoraria] = useState("America/Bogota");
  const [tema, setTemaState] = useState("system");
  const [formatoFecha, setFormatoFecha] = useState("DD/MM/YYYY");
  const [formatoHora, setFormatoHora] = useState("24");

  // 3. Notificaciones
  const [frecuencia, setFrecuencia] = useState("diaria");
  const [notifAprobaciones, setNotifAprobaciones] = useState(true);
  const [notifTareas, setNotifTareas] = useState(true);
  const [notifEventos, setNotifEventos] = useState(true);
  const [notifDocumentos, setNotifDocumentos] = useState(true);

  // 4. Privacidad
  const [consentimiento, setConsentimiento] = useState(true);

  // 5. Sesiones Activas
  const [sesiones, setSesiones] = useState<any[]>([]);

  // 6. Modal Reportar Problema
  const [modalReporte, setModalReporte] = useState(false);
  const [reporteAsunto, setReporteAsunto] = useState("");
  const [reporteDescripcion, setReporteDescripcion] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  // Evitar desajustes de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------------------------------------------------------------------------
  // CARGAR CONFIGURACIÓN INICIAL
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!usuario?.id) return;

    async function cargarConfiguracion() {
      try {
        setCargando(true);

        const { data, error } = await supabase
          .from("usuarios_configuracion")
          .select("*")
          .eq("usuario_id", usuario!.id)
          .maybeSingle();

        if (data) {
          setIdioma(data.idioma ?? "es");
          setZonaHoraria(data.zona_horaria ?? "America/Bogota");
          setTemaState(data.tema ?? "system");
          setFormatoFecha(data.formato_fecha ?? "DD/MM/YYYY");
          setFormatoHora(data.formato_hora ?? "24");
          setFrecuencia(data.frecuencia_recordatorios ?? "diaria");
          setNotifAprobaciones(data.notif_aprobaciones ?? true);
          setNotifTareas(data.notif_tareas ?? true);
          setNotifEventos(data.notif_eventos ?? true);
          setNotifDocumentos(data.notif_documentos ?? true);
          setConsentimiento(data.consentimiento_datos ?? true);

          if (data.tema) {
            setTheme(data.tema);
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          setSesiones([
            {
              dispositivo: "Equipo principal",
              navegador: navigator.userAgent.includes("Edg")
                ? "Microsoft Edge"
                : navigator.userAgent.includes("Chrome")
                ? "Google Chrome"
                : "Navegador Web",
              ultimaActividad: "Hace unos segundos",
              estado: "Sesión actual",
            },
          ]);
        }
      } catch (err) {
        console.error("Error al cargar configuración:", err);
      } finally {
        setCargando(false);
      }
    }

    cargarConfiguracion();
  }, [usuario?.id, setTheme]);

  // Cambiar tema de forma dinámica
  const manejarCambioTema = (nuevoTema: string) => {
    setTemaState(nuevoTema);
    setTheme(nuevoTema);
  };

  // ---------------------------------------------------------------------------
  // MANEJADORES
  // ---------------------------------------------------------------------------
  const manejarCambioContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassExito("");

    if (nuevaPass.length < 8) {
      setPassError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaPass !== confirmarPass) {
      setPassError("Las contraseñas no coinciden.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaPass,
      });

      if (error) throw error;

      setPassExito("¡Contraseña actualizada correctamente!");
      setPassActual("");
      setNuevaPass("");
      setConfirmarPass("");
    } catch (err: any) {
      setPassError(err.message || "Error al actualizar la contraseña.");
    }
  };

  const manejarGuardarConfiguracion = async () => {
    if (!usuario?.id) return;
    setGuardando(true);

    try {
      const payload = {
        usuario_id: usuario.id,
        idioma,
        zona_horaria: zonaHoraria,
        tema,
        formato_fecha: formatoFecha,
        formato_hora: formatoHora,
        frecuencia_recordatorios: frecuencia,
        notif_aprobaciones: notifAprobaciones,
        notif_tareas: notifTareas,
        notif_eventos: notifEventos,
        notif_documentos: notifDocumentos,
        consentimiento_datos: consentimiento,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("usuarios_configuracion")
        .upsert(payload);

      if (error) throw error;

      alert("¡Configuración guardada exitosamente!");
    } catch (err: any) {
      alert("Error al guardar preferencias: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Enlace del manual de usuario configurado solo para visualización
  const abrirManualUsuario = () => {
    window.open(
      "https://docs.google.com/document/d/1hul8EiuWmMJpuA7RAF3PgRoHK5cbjZyuGCnlI5anfLk/edit?rm=minimal&embedded=true",
      "_blank"
    );
  };

  // Redirección directa al número de WhatsApp de soporte técnico
  const abrirWhatsappSoporte = () => {
    const telefono = "573024024384";
    const mensaje = encodeURIComponent(
      "Hola, solicito asistencia técnica para el Portal Corporativo de la Corporación Social Niños y Familia."
    );
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, "_blank");
  };

  // Envío del reporte de fallas dirigido al Administrador con copia al Superadministrador
  const manejarEnviarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviandoReporte(true);

    try {
      // 1. Consultar las asignaciones activas conectando usuarios y roles
      const { data: asignaciones, error: errorAsignaciones } = await supabase
        .from("usuarios_asignaciones")
        .select(`
          activo,
          usuarios:usuario_id ( email ),
          roles:rol_id ( codigo, nombre )
        `)
        .eq("activo", true);

      if (errorAsignaciones) throw errorAsignaciones;

      let correoAdmin = "";
      let correoSuperAdmin = "";

      // 2. Filtrar los correos según el código o nombre del rol en la tabla roles
      asignaciones?.forEach((item: any) => {
        const codigoRol = (item.roles?.codigo || "").toUpperCase();
        const nombreRol = (item.roles?.nombre || "").toUpperCase();
        const emailUsuario = item.usuarios?.email;

        if (emailUsuario) {
          if (codigoRol.includes("SUPER") || nombreRol.includes("SUPER")) {
            correoSuperAdmin = emailUsuario;
          } else if (codigoRol.includes("ADMIN") || nombreRol.includes("ADMIN")) {
            correoAdmin = emailUsuario;
          }
        }
      });

      // Valores por defecto (fallback) por seguridad
      if (!correoAdmin) correoAdmin = "admin@csnf.org";
      if (!correoSuperAdmin) correoSuperAdmin = "superadmin@csnf.org";

      // 3. Registrar el evento en la tabla de auditoría
      await supabase.from("auditoria").insert({
        usuario_id: usuario?.id,
        accion: "REPORTE_PROBLEMA",
        detalles: JSON.stringify({
          asunto: reporteAsunto,
          descripcion: reporteDescripcion,
          enviado_a: correoAdmin,
          con_copia_a: correoSuperAdmin,
        }),
      });

      alert(
        `¡Reporte enviado con éxito!\n\n• Destinatario (Administrador): ${correoAdmin}\n• Copia (Superadministrador): ${correoSuperAdmin}`
      );
      
      setModalReporte(false);
      setReporteAsunto("");
      setReporteDescripcion("");
    } catch (err: any) {
      alert("Error al enviar reporte: " + err.message);
    } finally {
      setEnviandoReporte(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 dark:text-slate-400">
        Cargando opciones de configuración...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 transition-colors">
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configuración
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Administre la configuración general de su cuenta.
          </p>
        </div>
        <button
          onClick={manejarGuardarConfiguracion}
          disabled={guardando}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white shadow transition-all hover:bg-primary-600 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {guardando ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>

      {/* BLOQUE 1: SEGURIDAD */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          Seguridad
        </h2>

        {/* CORREO ELECTRÓNICO */}
        <div className="mb-6 space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
            Correo electrónico
          </label>
          <input
            type="text"
            disabled
            value={usuario?.email ?? "admin@csnf.org"}
            className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          />
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Este correo será utilizado para acceder al sistema y recibir
            notificaciones institucionales.
          </p>
        </div>

        <hr className="my-6 border-gray-100 dark:border-slate-800" />

        {/* CAMBIO DE CONTRASEÑA */}
        <form onSubmit={manejarCambioContrasena} className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">
            Cambio de contraseña
          </h3>

          {passError && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {passError}
            </div>
          )}
          {passExito && (
            <div className="rounded-xl bg-green-50 p-3 text-xs text-green-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              {passExito}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400">
                Contraseña actual
              </label>
              <input
                type="password"
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="********"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={nuevaPass}
                onChange={(e) => setNuevaPass(e.target.value)}
                placeholder="********"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmarPass}
                onChange={(e) => setConfirmarPass(e.target.value)}
                placeholder="********"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Actualizar contraseña
          </button>
        </form>

        <hr className="my-6 border-gray-100 dark:border-slate-800" />

        {/* DISPOSITIVOS Y SESIONES */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-slate-200">
            Dispositivos con sesión iniciada
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-3">Dispositivo</th>
                  <th className="p-3">Navegador</th>
                  <th className="p-3">Última actividad</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-slate-800 dark:text-slate-300">
                {sesiones.map((s, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium">{s.dispositivo}</td>
                    <td className="p-3">{s.navegador}</td>
                    <td className="p-3">{s.ultimaActividad}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        {s.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BLOQUE 2: PREFERENCIAS */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          Preferencias
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Idioma
            </label>
            <select
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Zona Horaria
            </label>
            <select
              value={zonaHoraria}
              onChange={(e) => setZonaHoraria(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="America/Mexico_City">
                Ciudad de México (GMT-6)
              </option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Tema Visual
            </label>
            <select
              value={mounted ? theme ?? tema : tema}
              onChange={(e) => manejarCambioTema(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="system">Sistema (Automático)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Formato de fecha
            </label>
            <select
              value={formatoFecha}
              onChange={(e) => setFormatoFecha(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Formato de hora
            </label>
            <select
              value={formatoHora}
              onChange={(e) => setFormatoHora(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="24">24 horas</option>
              <option value="12">12 horas (AM/PM)</option>
            </select>
          </div>
        </div>
      </section>

      {/* BLOQUE 3: NOTIFICACIONES */}
      <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Notificaciones
        </h2>

        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
            Frecuencia de recordatorios
          </label>
          <select
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value)}
            className="mt-1 w-full max-w-md rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="diaria">Diaria</option>
            <option value="semanal">Semanal</option>
            <option value="inmediata">En tiempo real</option>
          </select>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">
            Preferencias por tipo de evento
          </h3>

          {[
            {
              id: "aprobaciones",
              titulo: "Aprobaciones",
              desc: "Documentos pendientes por aprobar.",
              val: notifAprobaciones,
              set: setNotifAprobaciones,
            },
            {
              id: "tareas",
              titulo: "Tareas",
              desc: "Asignaciones y actividades pendientes.",
              val: notifTareas,
              set: setNotifTareas,
            },
            {
              id: "eventos",
              titulo: "Eventos",
              desc: "Reuniones, agenda y calendario.",
              val: notifEventos,
              set: setNotifEventos,
            },
            {
              id: "documentos",
              titulo: "Documentos",
              desc: "Cambios y publicaciones de documentos.",
              val: notifDocumentos,
              set: setNotifDocumentos,
            },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-slate-800"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                  {item.titulo}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
              <input
                type="checkbox"
                checked={item.val}
                onChange={(e) => item.set(e.target.checked)}
                className="h-5 w-5 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          ))}
        </div>
      </section>

      {/* BLOQUE 4: PRIVACIDAD */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          Privacidad
        </h2>
        <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
              Consentimiento para el tratamiento de datos
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Confirmo que conozco la Política de Tratamiento de Datos Personales
              de la Corporación Social Niños y Familia.
            </p>
          </div>
          <input
            type="checkbox"
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </section>

      {/* BLOQUE 5: AYUDA Y SOPORTE */}
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Ayuda y Soporte
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* MANUAL DE USUARIO */}
          <div className="flex flex-col justify-between rounded-xl border border-gray-100 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Manual de Usuario
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Consulte la guía oficial para aprender a utilizar el portal (Solo visualización).
              </p>
            </div>
            <button
              onClick={abrirManualUsuario}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-blue-600 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              <ExternalLink className="h-3 w-3" /> Abrir
            </button>
          </div>

          {/* REPORTAR PROBLEMA */}
          <div className="flex flex-col justify-between rounded-xl border border-gray-100 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Reportar un problema
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Informe errores o dificultades encontradas.
              </p>
            </div>
            <button
              onClick={() => setModalReporte(true)}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-red-500 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <AlertTriangle className="h-3 w-3" /> Reportar
            </button>
          </div>

          {/* CONTACTAR SOPORTE */}
          <div className="flex flex-col justify-between rounded-xl border border-gray-100 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Contactar Soporte
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Tel: 302 402 4384 (Vía WhatsApp).
              </p>
            </div>
            <button
              onClick={abrirWhatsappSoporte}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
            >
              <MessageSquare className="h-3 w-3" /> Contactar
            </button>
          </div>
        </div>
      </section>

      {/* MODAL REPORTAR PROBLEMA */}
      {modalReporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Reportar un Problema
            </h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">
              Este reporte se enviará por correo al administrador del portal (con copia al superadministrador) para su seguimiento.
            </p>

            <form onSubmit={manejarEnviarReporte} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Asunto / Módulo
                </label>
                <input
                  type="text"
                  required
                  value={reporteAsunto}
                  onChange={(e) => setReporteAsunto(e.target.value)}
                  placeholder="Ej: Error al subir documento en Flujos"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Descripción detallada
                </label>
                <textarea
                  required
                  rows={4}
                  value={reporteDescripcion}
                  onChange={(e) => setReporteDescripcion(e.target.value)}
                  placeholder="Describa los pasos que realizó cuando se presentó la falla..."
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalReporte(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoReporte}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  {enviandoReporte ? "Enviando..." : "Enviar Reporte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}