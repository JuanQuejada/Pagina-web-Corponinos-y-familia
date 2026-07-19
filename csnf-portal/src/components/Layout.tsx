'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { storage } from '@/lib/utils';
import { Usuario } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
  titulo: string;
  breadcrumb?: { label: string; href?: string }[];
}

export default function Layout({ children, titulo, breadcrumb }: LayoutProps) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const token = storage.get('token');
    const userData = storage.get('usuario');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUsuario(userData);
    }

    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    storage.remove('token');
    storage.remove('usuario');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">
            Cargando portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar usuario={usuario} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header usuario={usuario} titulo={titulo} breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}