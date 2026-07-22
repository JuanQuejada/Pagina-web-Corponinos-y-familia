'use client';

import { useState } from 'react';

import SeguridadCard from '@/components/configuracion/SeguridadCard';
import PreferenciasCard from '@/components/configuracion/PreferenciasCard';
import NotificacionesCard from '@/components/configuracion/NotificacionesCard';
import PrivacidadCard from '@/components/configuracion/PrivacidadCard';
import AyudaCard from '@/components/configuracion/AyudaCard';
import SistemaCard from '@/components/configuracion/SistemaCard';

interface SeguridadConfig {
  correo: string;
}

interface PreferenciasConfig {
  idioma: string;
  zonaHoraria: string;
  tema: string;
  formatoFecha: string;
  formatoHora: string;
}

interface NotificacionesConfig {
  frecuencia: string;

  eventos: {
    aprobaciones: boolean;
    tareas: boolean;
    mensajes: boolean;
    eventos: boolean;
    documentos: boolean;
  };
}

interface PrivacidadConfig {
  consentimientoDatos: boolean;
}

export default function ConfiguracionPage() {

  // ======================================================
  // Seguridad
  // ======================================================

  const [seguridad, setSeguridad] =
    useState<SeguridadConfig>({
      correo: 'admin@csnf.org',
    });

  // ======================================================
  // Preferencias
  // ======================================================

  const [preferencias, setPreferencias] =
    useState<PreferenciasConfig>({
      idioma: 'Español',
      zonaHoraria: 'America/Bogota',
      tema: 'claro',
      formatoFecha: 'DD/MM/YYYY',
      formatoHora: '24',
    });

  // ======================================================
  // Notificaciones
  // ======================================================

  const [notificaciones, setNotificaciones] =
    useState<NotificacionesConfig>({
      frecuencia: 'Diaria',

      eventos: {
        aprobaciones: true,
        tareas: true,
        mensajes: true,
        eventos: true,
        documentos: true,
      },
    });

  // ======================================================
  // Privacidad
  // ======================================================

  const [privacidad, setPrivacidad] =
    useState<PrivacidadConfig>({
      consentimientoDatos: true,
    });

  // ======================================================
  // Métodos
  // ======================================================

  const actualizarSeguridad = (
    campo: keyof SeguridadConfig,
    valor: string
  ) => {
    setSeguridad((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const actualizarPreferencias = (
    campo: keyof PreferenciasConfig,
    valor: string
  ) => {
    setPreferencias((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const actualizarFrecuencia = (valor: string) => {
    setNotificaciones((prev) => ({
      ...prev,
      frecuencia: valor,
    }));
  };

  const actualizarEvento = (
    evento: keyof NotificacionesConfig['eventos'],
    valor: boolean
  ) => {
    setNotificaciones((prev) => ({
      ...prev,

      eventos: {
        ...prev.eventos,
        [evento]: valor,
      },
    }));
  };

  const actualizarConsentimiento = (
    valor: boolean
  ) => {
    setPrivacidad({
      consentimientoDatos: valor,
    });
  };

  const guardarConfiguracion = () => {

    const configuracionCompleta = {

      seguridad,

      preferencias,

      notificaciones,

      privacidad,

    };

    console.log(configuracionCompleta);

    // Aquí posteriormente se conectará Supabase

  };

  return (

    <div className="space-y-6">

      {/* Encabezado */}

      <div>

        <h1 className="text-3xl font-bold text-gray-900">

          Configuración

        </h1>

        <p className="mt-2 text-gray-600">

          Administre la configuración general de su cuenta.

        </p>

      </div>

      {/* Seguridad */}

      <SeguridadCard
        configuracion={seguridad}
        onChange={(campo, valor) =>
          actualizarSeguridad(campo as keyof SeguridadConfig, valor)
        }
      />

      {/* Preferencias */}

      <PreferenciasCard
        configuracion={preferencias}
        onChange={(campo, valor) =>
          actualizarPreferencias(campo as keyof PreferenciasConfig, valor)
        }
      />

      {/* Notificaciones */}

      <NotificacionesCard
        configuracion={{
          eventos: notificaciones.eventos,
        }}
        frecuencia={notificaciones.frecuencia}
        onChangeFrecuencia={actualizarFrecuencia}
        onChangeEvento={actualizarEvento}
      />

      {/* Privacidad */}

      <PrivacidadCard
        consentimientoDatos={
          privacidad.consentimientoDatos
        }
        onChangeConsentimiento={
          actualizarConsentimiento
        }
      />

      {/* Ayuda */}

      <AyudaCard />

      {/* Sistema */}

      <SistemaCard />

      {/* Botón */}

      <div className="flex justify-end">

        <button
          onClick={guardarConfiguracion}
          className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
        >

          Guardar configuración

        </button>

      </div>

    </div>

  );
}