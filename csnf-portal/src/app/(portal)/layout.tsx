'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

import { Usuario } from '@/types';

export default function PortalLayout({
children,
}: {
children: React.ReactNode;
}) {

const router = useRouter();

const [usuario, setUsuario] =
useState<Usuario | null>(null);

const [cargando, setCargando] =
useState(true);

// ======================================================
// Cargar sesión actual
// ======================================================

useEffect(() => {

const token =
  localStorage.getItem('token');


const usuarioGuardado =
  localStorage.getItem('usuario');



if (!token || !usuarioGuardado) {

  router.push('/login');

  return;

}

try {

  const usuarioActual =
    JSON.parse(usuarioGuardado);

  setUsuario(usuarioActual);

} catch(error) {


  console.error(
    'Error cargando usuario:',
    error
  );


  localStorage.removeItem('usuario');

  localStorage.removeItem('token');

  router.push('/login');

}
finally {

  setCargando(false);

}

}, [router]);

// ======================================================
// Cerrar sesión
// ======================================================

const cerrarSesion = () => {

localStorage.removeItem('token');

localStorage.removeItem('usuario');

setUsuario(null);

router.push('/login');

};

// ======================================================
// Pantalla de carga
// ======================================================

if (cargando) {

return (

  <div className="
    h-screen
    flex
    items-center
    justify-center
    bg-gray-50
  ">

    <div className="
      text-sm
      text-gray-500
    ">

      Cargando portal...

    </div>

  </div>

);

}

if (!usuario) {

return null;

}

// ======================================================
// Portal
// ======================================================

return (

<div className="
  flex
  h-screen
  bg-gray-50
">

  {/* Sidebar único */}

  <Sidebar

    usuario={usuario}

    onLogout={cerrarSesion}

  />

  {/* Área principal */}

  <div className="
    flex
    flex-1
    flex-col
    overflow-hidden
  ">

    {/* Header */}

    <Header

      usuario={usuario}
      titulo="Portal CSNF"

    />

    {/* Contenido */}

    <main className="
      flex-1
      overflow-y-auto
      p-6
      lg:p-8
    ">

      {children}

    </main>

  </div>

</div>

);

}