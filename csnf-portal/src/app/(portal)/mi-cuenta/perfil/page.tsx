"use client";

import { useEffect, useState } from "react";

import PerfilAvatar from "@/components/perfil/PerfilAvatar";
import InformacionPersonal from "@/components/perfil/InformacionPersonal";
import EstadoPerfil from "@/components/perfil/EstadoPerfil";
import BotonesPerfil from "@/components/perfil/BotonesPerfil";

import { Usuario } from "@/types";

export default function PerfilPage() {

  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const [guardando, setGuardando] = useState(false);

  const [fotoPreview, setFotoPreview] =
    useState<string | null>(null);

  const [fotoSeleccionada, setFotoSeleccionada] =
    useState<File | null>(null);

  //======================================================
  // Cargar usuario autenticado
  //======================================================

  useEffect(() => {

    const usuarioStorage =
      localStorage.getItem("usuario");

    if (usuarioStorage) {

      setUsuario(JSON.parse(usuarioStorage));

    }

  }, []);

  //======================================================
  // Actualizar campos
  //======================================================

  const actualizarCampo = (
    campo: keyof Usuario,
    valor: string | null
  ) => {
  
    if (!usuario) return;
  
    setUsuario({
      ...usuario,
      [campo]: valor,
    });
  
  };

  //======================================================
  // Seleccionar fotografía
  //======================================================

  const seleccionarFoto = (
    archivo: File | null
  ) => {

    if (!archivo || !usuario) return;

    setFotoSeleccionada(archivo);

    const url = URL.createObjectURL(archivo);

    setFotoPreview(url);

  };

  //======================================================
  // Eliminar fotografía
  //======================================================

  const eliminarFoto = () => {

    if (!usuario) return;

    setFotoSeleccionada(null);

    setFotoPreview(null);

    setUsuario({

      ...usuario,

      foto_url: null,

    });

  };

  //======================================================
  // Guardar perfil
  //======================================================

  const guardarPerfil = async () => {

    if (!usuario) return;

    setGuardando(true);

    setTimeout(() => {

      localStorage.setItem(
        "usuario",
        JSON.stringify(usuario)
      );

      setGuardando(false);

      alert("Perfil actualizado correctamente.");

    }, 1000);

  };

  //======================================================
  // Cancelar
  //======================================================

  const cancelarCambios = () => {

    window.location.reload();

  };

  //======================================================
  // Pantalla de carga
  //======================================================

  if (!usuario) {

    return (

      <div className="flex h-96 items-center justify-center">

        <p className="text-gray-500">

          Cargando información del usuario...

        </p>

      </div>

    );

  }

  //======================================================
  // Render
  //======================================================

  return (

    <div className="space-y-8">

      {/* Encabezado */}

      <div>

        <h1 className="text-3xl font-bold text-gray-900">

          Mi Perfil

        </h1>

        <p className="mt-2 text-gray-600">

          Consulte la información registrada de su cuenta institucional.

        </p>

      </div>

      {/* Contenido */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

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

        <div className="space-y-6 xl:col-span-2">

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

    </div>

  );

}