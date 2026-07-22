"use client";

export default function DashboardPage() {
return ( <div className="space-y-6">

  {/* Encabezado del Dashboard */}
  <div>
    <h2 className="text-2xl font-bold text-gray-900">
      Bienvenido al Portal CSNF
    </h2>

    <p className="mt-2 text-gray-600">
      Has iniciado sesión correctamente.
    </p>
  </div>


  {/* Tarjetas principales */}
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

    {/* Documentos */}
    <div className="rounded-lg bg-white p-5 shadow">

      <h3 className="text-lg font-semibold text-gray-800">
        Documentos
      </h3>

      <p className="mt-2 text-3xl font-bold text-teal-700">
        0
      </p>

      <p className="mt-1 text-sm text-gray-500">
        Documentos gestionados
      </p>

    </div>


    {/* Pendientes */}
    <div className="rounded-lg bg-white p-5 shadow">

      <h3 className="text-lg font-semibold text-gray-800">
        Pendientes
      </h3>

      <p className="mt-2 text-3xl font-bold text-orange-500">
        0
      </p>

      <p className="mt-1 text-sm text-gray-500">
        Actividades pendientes
      </p>

    </div>


    {/* Usuarios */}
    <div className="rounded-lg bg-white p-5 shadow">

      <h3 className="text-lg font-semibold text-gray-800">
        Usuarios
      </h3>

      <p className="mt-2 text-3xl font-bold text-blue-600">
        1
      </p>

      <p className="mt-1 text-sm text-gray-500">
        Usuarios registrados
      </p>

    </div>

  </div>


  {/* Sección futura */}
  <div className="rounded-lg bg-white p-6 shadow">

    <h3 className="text-lg font-semibold text-gray-800">
      Resumen general
    </h3>

    <p className="mt-2 text-gray-600">
      En esta sección se podrán incorporar indicadores,
      gráficas y reportes del portal.
    </p>

  </div>

</div>

);
}
