'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface PreferenciasCardProps {
  configuracion: {
    idioma: string;
    zonaHoraria: string;
    tema: string;
    formatoFecha: string;
    formatoHora: string;
  };

  onChange: (campo: string, valor: string) => void;
}

export default function PreferenciasCard({
  configuracion,
  onChange,
}: PreferenciasCardProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const manejarCambioTema = (nuevoTema: string) => {
    setTheme(nuevoTema);
    onChange('tema', nuevoTema);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
        Preferencias
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Idioma */}
        <div>
          <label
            htmlFor="idioma"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Idioma
          </label>

          <select
            id="idioma"
            value={configuracion.idioma}
            onChange={(e) => onChange('idioma', e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>

          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Idioma utilizado por la plataforma.
          </p>
        </div>

        {/* Zona Horaria */}
        <div>
          <label
            htmlFor="zonaHoraria"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Zona Horaria
          </label>

          <select
            id="zonaHoraria"
            value={configuracion.zonaHoraria}
            onChange={(e) => onChange('zonaHoraria', e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="America/Bogota">Bogotá (GMT-5)</option>
            <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
            <option value="America/Lima">Lima (GMT-5)</option>
            <option value="America/Santiago">Santiago (GMT-4)</option>
          </select>

          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Todas las fechas del sistema utilizarán esta zona horaria.
          </p>
        </div>

        {/* Tema */}
        <div>
          <label
            htmlFor="tema"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Tema Visual
          </label>

          <select
            id="tema"
            value={mounted ? theme ?? configuracion.tema : configuracion.tema}
            onChange={(e) => manejarCambioTema(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
            <option value="system">Sistema (Automático)</option>
          </select>

          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Seleccione la apariencia visual de la plataforma.
          </p>
        </div>

        {/* Formato Fecha */}
        <div>
          <label
            htmlFor="formatoFecha"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Formato de fecha
          </label>

          <select
            id="formatoFecha"
            value={configuracion.formatoFecha}
            onChange={(e) => onChange('formatoFecha', e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY (Ej: 26/07/2026)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (Ej: 07/26/2026)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (Ej: 2026-07-26)</option>
          </select>

          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Formato en el que se mostrarán los registros en tablas e informes.
          </p>
        </div>

        {/* Formato Hora */}
        <div>
          <label
            htmlFor="formatoHora"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Formato de hora
          </label>

          <select
            id="formatoHora"
            value={configuracion.formatoHora}
            onChange={(e) => onChange('formatoHora', e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="12">12 horas (Ej: 04:30 PM)</option>
            <option value="24">24 horas (Ej: 16:30)</option>
          </select>

          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Visualización horaria de eventos y logs.
          </p>
        </div>
      </div>
    </div>
  );
}