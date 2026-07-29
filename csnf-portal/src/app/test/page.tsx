"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabase() {

  const [resultado, setResultado] = useState("");

  async function probarConexion() {

    const { data, error } =
      await supabase.auth.getSession();

    if (error) {

      setResultado(
        "ERROR: " + error.message
      );

      return;

    }

    if (data.session) {

      setResultado(
        "Hay una sesión activa."
      );

    } else {

      setResultado(
        "Conexión correcta. No existe sesión."
      );

    }

  }

  return (

    <div className="p-10">

      <button
        onClick={probarConexion}
        className="
          rounded-lg
          bg-blue-600
          px-6
          py-3
          text-white
        "
      >
        Probar Supabase
      </button>

      <p className="mt-6">

        {resultado}

      </p>

    </div>

  );

}