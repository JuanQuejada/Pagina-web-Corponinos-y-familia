'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Usuario } from '@/types';
import { Search, Bell, HelpCircle } from 'lucide-react';

interface HeaderProps {
  usuario: Usuario | null;
  titulo: string;
  breadcrumb?: { label: string; href?: string }[];
}

export default function Header({ usuario, titulo, breadcrumb }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="h-[68px] bg-white border-b border-gray-200 flex items-center justify-between px-7 flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{titulo}</h1>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-2 text-xs text-gray-400">
            {breadcrumb.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                {item.href ? (
                  <Link href={item.href} className="text-gray-500 hover:text-gray-700 font-medium">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-600 font-medium">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5 w-[300px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar documentos, eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
          />
        </div>

        {/* Notifications */}
        <button title="Notificaciones" className="relative w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-all">
          <Bell className="w-[18px] h-[18px] text-gray-500" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white" />
        </button>

        {/* Help */}
        <button title="Ayuda" className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-all">
          <HelpCircle className="w-[18px] h-[18px] text-gray-500" />
        </button>
      </div>
    </header>
  );
}