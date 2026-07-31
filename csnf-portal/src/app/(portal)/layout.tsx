'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Usuario } from '@/types';
import { supabase } from '@/lib/supabase';
import { databaseRepository } from '@/lib/database/repositories';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarUsuarioPortal() {
      try {
        // 1. Obtener la sesión actual de Supabase Auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          // Si no hay sesión, redirigir al login
          window.location.href = '/login';
          return;
        }

        // 2. Usar el repositorio centralizado para traer el usuario, catálogos y perfil activo
        const { data: resultado, error: repoError } = await databaseRepository.obtenerUsuarioPortal(session.user.id);

        if (repoError || !resultado) {
          console.error("Error al obtener el usuario portal:", repoError);
          return;
        }

        // 3. Construir el objeto de usuario manejando asignacion como arreglo o objeto único de forma segura
        const asignacionActiva = Array.isArray(resultado.asignaciones)
          ? resultado.asignaciones[0]
          : resultado.asignaciones;

        const usuarioCompleto: Usuario = {
          ...resultado.usuario,
          cargo: asignacionActiva?.cargo?.nombre || "",
        };

        setUsuario(usuarioCompleto);
      } catch (e) {
        // <-- El bloque try debe cerrar aquí, seguido inmediatamente de su catch
        console.error("Error inesperado al cargar el layout del portal:", e);
      } finally {
        // <-- Y el finally al final
        setCargando(false);
      }
    }

    cargarUsuarioPortal();
  }, []);

  const breadcrumb = [
    { label: 'Portal', href: '/dashboard' },
    { label: 'Principal' }
  ];

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar usuario={usuario} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          usuario={usuario}
          titulo="Portal CSNF"
          breadcrumb={breadcrumb}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}