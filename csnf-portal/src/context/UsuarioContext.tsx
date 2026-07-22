'use client';

import {
  createContext,
  useContext,
  useState,
} from 'react';

import { Usuario } from '@/types';


interface UsuarioContextType {

  usuario: Usuario | null;

  actualizarUsuario: (
    usuario: Usuario
  ) => void;

}


const UsuarioContext =
  createContext<UsuarioContextType | undefined>(
    undefined
  );


export function UsuarioProvider({
  children,
}: {
  children: React.ReactNode;
}) {


  const [usuario, setUsuario] =
    useState<Usuario | null>({
      // aquí irá tu usuario demo actual
    });


  const actualizarUsuario = (
    nuevoUsuario: Usuario
  ) => {

    setUsuario(nuevoUsuario);

  };


  return (

    <UsuarioContext.Provider
      value={{
        usuario,
        actualizarUsuario,
      }}
    >

      {children}

    </UsuarioContext.Provider>

  );

}



export function useUsuario(){

  const context =
    useContext(UsuarioContext);


  if (!context){

    throw new Error(
      'useUsuario debe usarse dentro de UsuarioProvider'
    );

  }


  return context;

}