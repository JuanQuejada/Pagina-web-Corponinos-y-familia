"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderTree,
  Briefcase,
  Users,
  ShieldCheck,
  Settings,
  History,
  User,
  LogOut,
  Sliders,
  Loader2,
  FileText,
  GitCommit,
  Lock,
  Kanban,
  CalendarDays,
  BellRing,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Usuario } from "@/types";

interface PerfilUsuario {
  nombre: string;
  rol: string;
  avatarUrl?: string | null;
  iniciales: string;
}

interface SidebarProps {
  usuario?: Usuario | null;
  onLogout?: () => void;
}

export default function Sidebar({ usuario: usuarioProp, onLogout: onLogoutProp }: SidebarProps) {
  const pathname = usePathname();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [falloImagen, setFalloImagen] = useState(false);

  useEffect(() => {
    if (usuarioProp) {
      const uProp = usuarioProp as any;
      const nombreCompleto = uProp.razon_social || 
        `${uProp.nombres || ''} ${uProp.apellidos || ''}`.trim() || 
        "DEPARTAMENTO DE SISTEMAS";
      
      const rawFoto = uProp.foto_url || uProp.avatar_url || uProp.foto;
      const avatarFinalUrl = procesarUrlAvatar(rawFoto);
      
      setPerfil({
        nombre: nombreCompleto,
        rol: uProp.rol || "Super Administrador",
        avatarUrl: avatarFinalUrl,
        iniciales: obtenerIniciales(nombreCompleto),
      });
      setCargando(false);
    } else {
      cargarPerfilUsuario();
    }
  }, [usuarioProp]);

  const obtenerIniciales = (nombreCompleto: string): string => {
    if (!nombreCompleto || nombreCompleto.trim() === "") return "??";
    const palabras = nombreCompleto.trim().split(/\s+/);
    if (palabras.length === 0) return "??";
    if (palabras.length === 1) return palabras[0].substring(0, 2).toUpperCase();
    return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
  };

  const procesarUrlAvatar = (pathOrUrl: string | null | undefined): string | null => {
    if (!pathOrUrl) return null;
    const urlLimpia = pathOrUrl.trim();
    if (urlLimpia.startsWith("http://") || urlLimpia.startsWith("https://")) {
      return urlLimpia;
    }
    const pathSinDiagonal = urlLimpia.startsWith("/") ? urlLimpia.substring(1) : urlLimpia;
    const { data } = supabase.storage.from("avatars").getPublicUrl(pathSinDiagonal);
    return data.publicUrl;
  };

  const cargarPerfilUsuario = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setCargando(false);
        return;
      }

      const authId = session.user.id;

      const { data: usuarioData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authId)
        .maybeSingle();

      if (userError) {
        console.error("Error al consultar la tabla usuarios:", userError.message);
      }

      const uData = usuarioData as any;
      let nombreCompleto = "DEPARTAMENTO DE SISTEMAS";
      let rawFotoUrl = uData?.foto_url || uData?.avatar_url || uData?.foto;

      if (usuarioData) {
        if (uData.razon_social) {
          nombreCompleto = uData.razon_social;
        } else if (uData.nombres) {
          nombreCompleto = `${uData.nombres} ${uData.apellidos || ""}`.trim();
        }
      }

      if (!rawFotoUrl && session.user.user_metadata) {
        const meta = session.user.user_metadata as any;
        rawFotoUrl =
          meta.avatar_url ||
          meta.picture ||
          meta.foto_url;
      }

      const avatarFinalUrl = procesarUrlAvatar(rawFotoUrl);
      const inicialesCalculadas = obtenerIniciales(nombreCompleto);

      setFalloImagen(false);

      setPerfil({
        nombre: nombreCompleto,
        rol: "Super Administrador",
        avatarUrl: avatarFinalUrl,
        iniciales: inicialesCalculadas,
      });
    } catch (error) {
      console.error("Error en sidebar:", error);
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = async () => {
    if (onLogoutProp) {
      onLogoutProp();
    } else {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
  };

  const modulosPrincipal = [
    { nombre: "Documentos", href: "/principal/documentos", icono: FileText },
    { nombre: "Flujo de Aprobaciones", href: "/principal/flujo-aprobaciones", icono: GitCommit },
    { nombre: "Repositorio", href: "/principal/repositorio-privado", icono: Lock },
    { nombre: "Tablero Kanban", href: "/principal/kanban", icono: Kanban },
    { nombre: "Agenda Institucional", href: "/principal/eventos", icono: CalendarDays },
    { nombre: "Notificaciones y Alertas", href: "/principal/notificaciones-alertas", icono: BellRing },
  ];

  const modulosAdmin = [
    { nombre: "Áreas y Departamentos", href: "/administracion/areas-departamentos", icono: FolderTree },
    { nombre: "Cargos", href: "/administracion/cargos", icono: Briefcase },
    { nombre: "Usuarios", href: "/administracion/usuarios", icono: Users },
    { nombre: "Roles y Permisos", href: "/administracion/roles-permisos", icono: ShieldCheck },
    { nombre: "Auditoría", href: "/administracion/auditoria", icono: History },
    { nombre: "Ajustes del Sistema", href: "/administracion/ajustes-sistema", icono: Settings },
  ];

  const modulosMiCuenta = [
    { nombre: "Mi Perfil", href: "/mi-cuenta/perfil", icono: User },
    { nombre: "Configuración", href: "/mi-cuenta/configuracion", icono: Sliders },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 min-h-screen flex flex-col justify-between p-4 shrink-0 transition-all">
      <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-1 custom-scrollbar">
        {/* Logo / Encabezado */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-gray-100 dark:border-slate-800">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20">
            CSNF
          </div>
          <div>
            <h2 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
              Portal CSNF
            </h2>
            <p className="text-[11px] text-gray-400">Corporación Social</p>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="space-y-4">
          <div>
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Dashboard
            </p>
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                pathname === "/dashboard"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Principal
            </p>
            <div className="space-y-1">
              {modulosPrincipal.map((modulo) => {
                const Icono = modulo.icono;
                const activo = pathname === modulo.href;

                return (
                  <Link
                    key={modulo.href}
                    href={modulo.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activo
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icono className="h-4 w-4 shrink-0" />
                    <span className="truncate">{modulo.nombre}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Administración
            </p>
            <div className="space-y-1">
              {modulosAdmin.map((modulo) => {
                const Icono = modulo.icono;
                const activo = pathname === modulo.href;

                return (
                  <Link
                    key={modulo.href}
                    href={modulo.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activo
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icono className="h-4 w-4 shrink-0" />
                    <span className="truncate">{modulo.nombre}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Mi Cuenta
            </p>
            <div className="space-y-1">
              {modulosMiCuenta.map((modulo) => {
                const Icono = modulo.icono;
                const activo = pathname === modulo.href;

                return (
                  <Link
                    key={modulo.href}
                    href={modulo.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activo
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icono className="h-4 w-4 shrink-0" />
                    <span className="truncate">{modulo.nombre}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Footer / Mini Perfil */}
      <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
        {cargando ? (
          <div className="flex justify-center p-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl space-y-2">
            <div className="flex items-center gap-2.5">
              {perfil?.avatarUrl && !falloImagen ? (
                <img
                  src={perfil.avatarUrl}
                  alt="Avatar"
                  onError={() => setFalloImagen(true)}
                  className="h-9 w-9 rounded-lg object-cover border-2 border-white dark:border-slate-700 shrink-0 shadow-sm"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border-2 border-white dark:border-slate-700 shadow-sm">
                  {perfil?.iniciales || "??"}
                </div>
              )}

              <div className="overflow-hidden min-w-0 flex-1">
                <p
                  className="text-xs font-bold text-gray-900 dark:text-white leading-tight line-clamp-2"
                  title={perfil?.nombre || "DEPARTAMENTO DE SISTEMAS"}
                >
                  {perfil?.nombre || "DEPARTAMENTO DE SISTEMAS"}
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate mt-0.5">
                  {perfil?.rol || "Super Administrador"}
                </p>
              </div>
            </div>

            <button
              onClick={cerrarSesion}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}