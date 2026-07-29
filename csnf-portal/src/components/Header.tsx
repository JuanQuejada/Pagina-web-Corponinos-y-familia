"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Bell, 
  HelpCircle, 
  Loader2, 
  User, 
  CheckCircle2, 
  Info 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Usuario } from "@/types";

interface HeaderProps {
  usuario: Usuario | null;
  titulo: string;
  breadcrumb?: {
    label: string;
    href?: string;
  }[];
}

export default function Header({ titulo, breadcrumb }: HeaderProps) {
  const router = useRouter();
  
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [menuNotifAbierto, setMenuNotifAbierto] = useState(false);
  const [cargandoNotif, setCargandoNotif] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const buscadorRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const inicializarDatos = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (perfil) {
        setCurrentUserId(perfil.id);
        cargarNotificaciones(perfil.id);
      }
    };

    inicializarDatos();

    const handleClickOutside = (event: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target as Node)) {
        setMostrarResultados(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setMenuNotifAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const buscarEnSupabase = async () => {
      if (!busqueda.trim() || busqueda.length < 2) {
        setResultadosBusqueda([]);
        setBuscando(false);
        return;
      }

      setBuscando(true);
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nombres, apellidos, razon_social, email, numero_identificacion")
          .or(`nombres.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%,razon_social.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
          .limit(5);

        if (!error && data) {
          setResultadosBusqueda(data);
        }
      } catch (err) {
        console.error("Error en búsqueda:", err);
      } finally {
        setBuscando(false);
      }
    };

    const timer = setTimeout(buscarEnSupabase, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarNotificaciones = async (usuarioId: string) => {
    setCargandoNotif(true);
    try {
      const { data, error } = await supabase
        .from("notificaciones_sistema")
        .select("*")
        .eq("usuario_id", usuarioId)
        .order("created_at", { ascending: false })
        .limit(6);

      if (!error && data) {
        setNotificaciones(data);
      }
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    } finally {
      setCargandoNotif(false);
    }
  };

  const tieneNoLeidas = notificaciones.some((n) => !n.leida);

  const marcarComoLeidas = async () => {
    if (!currentUserId) return;
    setMenuNotifAbierto(!menuNotifAbierto);
    
    try {
      await supabase
        .from("notificaciones_sistema")
        .update({ leida: true })
        .eq("usuario_id", currentUserId)
        .eq("leida", false);

      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (err) {
      console.error("Error al marcar notificaciones:", err);
    }
  };

  const irASoporte = () => {
    router.push("/mi-cuenta/configuracion");
  };

  return (
    <header className="h-[72px] border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between flex-shrink-0 relative z-30 shadow-xs">
      
      {/* LADO IZQUIERDO */}
      <div className="flex flex-col">
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-500 inline-block"></span>
          PORTAL Comunidad Corponiños 360
        </h1>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mt-0.5 flex items-center gap-2 text-xs">
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-slate-300">/</span>}
                {item.href ? (
                  <Link href={item.href} className="text-slate-500 hover:text-teal-600 transition-colors font-medium">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-700">{item.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}
      </div>

      {/* LADO DERECHO */}
      <div className="flex items-center gap-4">

        {/* Buscador */}
        <div className="relative" ref={buscadorRef}>
          <div className="flex items-center gap-3 w-[280px] sm:w-[320px] rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2 transition-all focus-within:border-teal-500 focus-within:bg-white shadow-xs">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar usuarios, correos..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setMostrarResultados(true);
              }}
              onFocus={() => setMostrarResultados(true)}
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400 text-slate-900 font-medium"
            />
            {buscando && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600 shrink-0" />}
          </div>

          {mostrarResultados && busqueda.length >= 2 && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resultados</span>
                <span className="text-[10px] text-teal-600 font-semibold">{resultadosBusqueda.length} encontrados</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {resultadosBusqueda.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No se encontraron coincidencias.
                  </div>
                ) : (
                  resultadosBusqueda.map((u) => {
                    const nombre = u.razon_social || `${u.nombres || ""} ${u.apellidos || ""}`;
                    return (
                      <div 
                        key={u.id}
                        onClick={() => {
                          setMostrarResultados(false);
                          setBusqueda("");
                          router.push("/principal/usuarios");
                        }}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                      >
                        <div className="h-8 w-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate">{nombre}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email || "Sin correo"}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={marcarComoLeidas}
            title="Notificaciones"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white transition-all hover:border-teal-500 hover:bg-teal-50/40 shadow-xs cursor-pointer"
          >
            <Bell className="h-4 w-4 text-slate-600" />
            {tieneNoLeidas && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {menuNotifAbierto && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900">Notificaciones y Alertas</h3>
                <span className="text-[10px] bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full font-semibold">
                  {notificaciones.length} recientes
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {cargandoNotif ? (
                  <div className="p-6 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600 mx-auto" />
                  </div>
                ) : notificaciones.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">¡Estás al día!</p>
                    <p className="text-[11px] text-slate-400">No hay nuevas notificaciones en este momento.</p>
                  </div>
                ) : (
                  notificaciones.map((notif) => (
                    <div key={notif.id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-start gap-3">
                      <div className="h-7 w-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Info className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900">{notif.titulo}</p>
                          <span className="text-[9px] text-slate-400">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{notif.mensaje}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-slate-100 text-center bg-slate-50/50">
                <Link 
                  href="/principal/notificaciones" 
                  onClick={() => setMenuNotifAbierto(false)}
                  className="text-[11px] font-bold text-teal-600 hover:underline"
                >
                  Ver todas las notificaciones
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Ayuda */}
        <button
          onClick={irASoporte}
          title="Centro de ayuda y soporte técnico"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white transition-all hover:border-teal-500 hover:bg-teal-50/40 shadow-xs cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 text-slate-600" />
        </button>

      </div>
    </header>
  );
}