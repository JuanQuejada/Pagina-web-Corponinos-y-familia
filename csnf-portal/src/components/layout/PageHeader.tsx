'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  titulo: string;
  breadcrumb?: BreadcrumbItem[];
}

export default function PageHeader({
  titulo,
  breadcrumb = [],
}: PageHeaderProps) {
  const [busqueda, setBusqueda] = useState('');

  return (
    <header className="h-[68px] bg-white border-b border-gray-200 flex items-center justify-between px-7">

      {/* Lado izquierdo */}

      <div>

        <h1 className="text-2xl font-bold text-gray-900">
          {titulo}
        </h1>

        {breadcrumb.length > 0 && (

          <nav className="mt-1 flex items-center gap-2 text-sm text-gray-500">

            {breadcrumb.map((item, index) => (

              <div
                key={index}
                className="flex items-center gap-2"
              >

                {index > 0 && (
                  <span>/</span>
                )}

                {item.href ? (

                  <Link
                    href={item.href}
                    className="hover:text-primary"
                  >
                    {item.label}
                  </Link>

                ) : (

                  <span className="font-medium text-gray-700">
                    {item.label}
                  </span>

                )}

              </div>

            ))}

          </nav>

        )}

      </div>

      {/* Lado derecho */}

      <div className="flex items-center gap-3">

        {/* Buscar */}

        <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 w-72">

          <Search className="h-4 w-4 text-gray-400" />

          <input
            type="text"
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            placeholder="Buscar..."
            className="w-full bg-transparent text-sm outline-none"
          />

        </div>

        {/* Notificaciones */}

        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50">

          <Bell className="h-5 w-5 text-gray-500" />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>

        </button>

        {/* Ayuda */}

        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50">

          <HelpCircle className="h-5 w-5 text-gray-500" />

        </button>

      </div>

    </header>
  );
}