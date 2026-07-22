"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { Usuario } from "@/types";


interface AuthContextType {

  usuario: Usuario | null;

  actualizarUsuario: (
    usuario: Usuario
  ) => void;

  cerrarSesion: () => void;

  cargando: boolean;

}


const AuthContext =
createContext<AuthContextType | undefined>(
  undefined
);



export function AuthProvider({
  children,
}:{
  children: React.ReactNode;
}) {


  const [usuario,setUsuario] =
    useState<Usuario | null>(null);


  const [cargando,setCargando] =
    useState(true);



  useEffect(()=>{


    const usuarioGuardado =
      localStorage.getItem("usuario");


    if(usuarioGuardado){

      setUsuario(
        JSON.parse(usuarioGuardado)
      );

    }


    setCargando(false);


  },[]);



  const actualizarUsuario = (
    nuevoUsuario: Usuario
  )=>{


    setUsuario(nuevoUsuario);


    localStorage.setItem(
      "usuario",
      JSON.stringify(nuevoUsuario)
    );


  };



  const cerrarSesion = ()=>{


    localStorage.removeItem(
      "usuario"
    );


    localStorage.removeItem(
      "token"
    );


    setUsuario(null);


  };



  return (

    <AuthContext.Provider
      value={{
        usuario,
        actualizarUsuario,
        cerrarSesion,
        cargando,
      }}
    >

      {children}

    </AuthContext.Provider>

  );

}



export function useAuth(){


  const context =
    useContext(AuthContext);


  if(!context){

    throw new Error(
      "useAuth debe usarse dentro de AuthProvider"
    );

  }


  return context;

}