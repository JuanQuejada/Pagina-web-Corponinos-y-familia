'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, obtenerIniciales, obtenerColorAvatar } from '@/lib/utils';
import { Usuario } from '@/types';
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  CalendarDays,
  Kanban,
  Users,
  Shield,
  Building2,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
} from 'lucide-react';

interface SidebarProps {
  usuario: Usuario | null;
  onLogout: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', section: 'principal' },
  { icon: FileText, label: 'Documentos', href: '/documentos', section: 'principal', badge: '12' },
  { icon: GitBranch, label: 'Flujos de Firma', href: '/flujos', section: 'principal' },
  { icon: CalendarDays, label: 'Agenda y Tareas', href: '/agenda', section: 'principal', badge: '3' },
  { icon: Kanban, label: 'Tablero Kanban', href: '/kanban', section: 'principal' },
];

const adminItems = [
  { icon: Users, label: 'Usuarios', href: '/usuarios', section: 'admin' },
  { icon: Shield, label: 'Permisos y Roles', href: '/permisos', section: 'admin' },
  { icon: Building2, label: 'Áreas y Departamentos', href: '/areas', section: 'admin' },
  { icon: Clock, label: 'Auditoría', href: '/auditoria', section: 'admin' },
];

const accountItems = [
  { icon: UserCircle, label: 'Mi Perfil', href: '/perfil', section: 'cuenta' },
  { icon: Settings, label: 'Configuración', href: '/configuracion', section: 'cuenta' },
];

export default function Sidebar({ usuario, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isAdmin = usuario?.rol?.nivel !== undefined && usuario.rol.nivel <= 2;

  const renderNavItem = (item: typeof navItems[0]) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative',
          'text-sm font-medium',
          isActive
            ? 'bg-primary-100 text-primary font-semibold'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
        )}
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300 relative z-50',
        collapsed ? 'w-[72px]' : 'w-[270px]'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Header */}
      <div className="h-[68px] flex items-center px-4 border-b border-gray-100 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-extrabold text-gray-900 leading-tight">CSNiños y Familia</div>
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Gestión Documental</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* Principal */}
        <div className="mb-4">
          {!collapsed && (
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
              Principal
            </div>
          )}
          <div className="space-y-0.5">
            {navItems.map(renderNavItem)}
          </div>
        </div>

        {/* Admin */}
        {isAdmin && (
          <div className="mb-4">
            {!collapsed && (
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
                Administración
              </div>
            )}
            <div className="space-y-0.5">
              {adminItems.map(renderNavItem)}
            </div>
          </div>
        )}

        {/* Mi Cuenta */}
        <div className="mb-4">
          {!collapsed && (
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
              Mi Cuenta
            </div>
          )}
          <div className="space-y-0.5">
            {accountItems.map(renderNavItem)}
          </div>
        </div>
      </nav>

      {/* User Card */}
      <div className="p-3 border-t border-gray-100">
        <Link
          href="/perfil"
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
        >
          <div title="Mi Perfil"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: usuario ? obtenerColorAvatar(usuario.id) : 'linear-gradient(135deg, #1B6B6B, #2A9D8F)' }}
          >
            {usuario ? obtenerIniciales(usuario.nombres, usuario.apellidos) : '?'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">
                {usuario?.nombres} {usuario?.apellidos}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                {usuario?.area?.nombre} · {usuario?.departamento?.nombre}
              </div>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={onLogout}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-accent hover:bg-accent-light rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        )}
      </div>
    </aside>
  );
}