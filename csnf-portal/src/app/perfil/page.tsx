'use client';

import { useState } from 'react';

import Layout from '@/components/Layout';
import PerfilAvatar from '@/components/perfil/PerfilAvatar';
import InformacionPersonal from '@/components/perfil/InformacionPersonal';
import EstadoPerfil from '@/components/perfil/EstadoPerfil';
import BotonesPerfil from '@/components/perfil/BotonesPerfil';

import { Usuario } from '@/types';

export default function PerfilPage() {
  const [guardando, setGuardando] = useState(false);

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoSeleccionada, setFotoSeleccionada] = useState<File | null>(null);

  const [usuario, setUsuario] = useState<Usuario>({
    id: '1',

    email: 'admin@csnf.com',

    tipo_persona: 'juridica',

    tipo_usuario: 'Ejecutivo',

    razon_social: 'Departamento de Sistemas',

    nombres: null,

    apellidos: null,

    tipo_documento: 'Nit',

    numero_documento: '123456789',

    telefono: '3001234567',

    direccion: 'Calle 1 # 10 - 20',

    fecha_nacimiento: null,

    foto_url: null,

    rol_id: '1',

    area_id: '1',

    departamento_id: '1',

    cargo: 'Administrador General',

    fecha_vinculacion: '2024-01-01',

    tipo_contrato: 'Indefinido',

    jefe_directo_id: null,

    perfil_completo: true,

    password_cambiada: true,

    activo: true,

    ultimo_login: null,

    created_at: '',

    updated_at: '',
  });

  //----------------------------------------------------------
  // Cambios de información
  //----------------------------------------------------------

  const actualizarCampo = (
    campo: string,
    valor: string
  ) => {
    setUsuario((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  //----------------------------------------------------------
  // Foto
  //----------------------------------------------------------

  const seleccionarFoto = (archivo: File | null) => {
    if (!archivo) return;

    setFotoSeleccionada(archivo);

    const url = URL.createObjectURL(archivo);

    setFotoPreview(url);
  };

  const eliminarFoto = () => {
    setFotoSeleccionada(null);

    setFotoPreview(null);

    setUsuario((prev) => ({
      ...prev,
      foto_url: null,
    }));
  };

  //----------------------------------------------------------
  // Guardar
  //----------------------------------------------------------

  const guardarPerfil = async () => {
    setGuardando(true);

    // Aquí posteriormente irá Supabase

    setTimeout(() => {
      setGuardando(false);

      alert('Perfil actualizado correctamente.');
    }, 1200);
  };

  //----------------------------------------------------------
  // Cancelar
  //----------------------------------------------------------

  const cancelarCambios = () => {
    location.reload();
  };

  //----------------------------------------------------------

  return (
    <Layout
      titulo="Mi Perfil"
      breadcrumb={[
        {
          label: 'Mi Cuenta',
        },
        {
          label: 'Mi Perfil',
        },
      ]}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Columna izquierda */}

        <div className="space-y-6">

          <PerfilAvatar
            usuario={usuario}
            fotoPreview={fotoPreview}
            onFotoSeleccionada={seleccionarFoto}
            onEliminarFoto={eliminarFoto}
          />

          <EstadoPerfil
            perfilCompleto={usuario.perfil_completo}
            passwordCambiada={usuario.password_cambiada}
          />

        </div>

        {/* Columna derecha */}

        <div className="xl:col-span-2 space-y-6">

          <InformacionPersonal
            usuario={usuario}
            onChange={actualizarCampo}
          />

          <BotonesPerfil
            guardando={guardando}
            onGuardar={guardarPerfil}
            onCancelar={cancelarCambios}
          />

        </div>

      </div>
    </Layout>
  );
}