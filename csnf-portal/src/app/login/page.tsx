"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  function ingresar(e: React.FormEvent) {
    e.preventDefault();

    if (usuario === "admin" && password === "1234") {

      localStorage.setItem(
        "token",
      JSON.stringify("portal-csnf")
    );

      localStorage.setItem(
        "usuario",
        JSON.stringify({
          id: "1",

          email: "admin@csnf.com",

          nombres: "Administrador",

          apellidos: "General",

          area: {
            nombre: "Dirección"
          },

          departamento: {
            nombre: "Sistemas"
          },

          rol: {
            nombre: "Administrador",
            nivel: 1
          }
        })
      );

      router.push("/dashboard");
    } else {
      alert("Usuario o contraseña incorrectos");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">

      <form
        onSubmit={ingresar}
        className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md"
      >

        <h1 className="text-3xl font-bold text-center mb-8">
          Portal CSNF
        </h1>

        <input
          className="border rounded-lg w-full p-3 mb-4"
          placeholder="Usuario"
          value={usuario}
          onChange={(e)=>setUsuario(e.target.value)}
        />

        <input
          type="password"
          className="border rounded-lg w-full p-3 mb-6"
          placeholder="Contraseña"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          className="w-full bg-teal-700 hover:bg-teal-800 text-white rounded-lg p-3"
        >
          Ingresar
        </button>

      </form>

    </main>
  );
}