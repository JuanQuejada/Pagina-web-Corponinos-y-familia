'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Usuario } from '@/types';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('usuario');
    if (userData) {
      try {
        setUsuario(JSON.parse(userData));
      } catch (e) {
        console.error("Error al parsear el usuario:", e);
      }
    }
  }, []);

  // Opcional: Define un breadcrumb predeterminado o dinámico
  const breadcrumb = [
    { label: 'Portal', href: '/dashboard' },
    { label: 'Principal' }
  ];

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