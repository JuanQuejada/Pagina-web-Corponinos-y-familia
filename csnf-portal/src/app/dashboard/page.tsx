"use client";

import Layout from "@/components/Layout";

export default function DashboardPage() {
  return (
    <Layout titulo="Dashboard">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Bienvenido al Portal CSNF
        </h2>

        <p className="text-gray-600">
          Has iniciado sesión correctamente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-lg">Documentos</h3>
            <p className="text-3xl font-bold text-teal-700 mt-2">0</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-lg">Pendientes</h3>
            <p className="text-3xl font-bold text-orange-500 mt-2">0</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-lg">Usuarios</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">1</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}