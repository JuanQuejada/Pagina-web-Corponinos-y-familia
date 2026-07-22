"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Search,
  Bell,
  HelpCircle,
} from "lucide-react";

interface HeaderProps {
  titulo: string;

  breadcrumb?: {
    label: string;
    href?: string;
  }[];
}

export default function Header({
  titulo,
  breadcrumb,
}: HeaderProps) {

  const [busqueda, setBusqueda] =
    useState("");

  return (

    <header
      className="
        h-[68px]
        border-b
        border-gray-200
        bg-white
        px-8
        flex
        items-center
        justify-between
        flex-shrink-0
      "
    >

      {/* ======================================================
          LADO IZQUIERDO
      ====================================================== */}

      <div className="flex flex-col">

        <h1 className="text-2xl font-bold text-gray-900">

          {titulo}

        </h1>

        {breadcrumb &&
          breadcrumb.length > 0 && (

          <nav className="mt-1 flex items-center gap-2 text-xs">

            {breadcrumb.map((item, index) => (

              <div
                key={index}
                className="flex items-center gap-2"
              >

                {index > 0 && (

                  <span className="text-gray-300">

                    /

                  </span>

                )}

                {item.href ? (

                  <Link
                    href={item.href}
                    className="
                      text-gray-500
                      hover:text-primary
                      transition-colors
                    "
                  >

                    {item.label}

                  </Link>

                ) : (

                  <span className="font-medium text-gray-700">

                    {item.label}

                  </span>

                )}

              </div>

            ))}

          </nav>

        )}

      </div>

      {/* ======================================================
          LADO DERECHO
      ====================================================== */}

      <div className="flex items-center gap-4">

        {/* Buscador */}

        <div
          className="
            flex
            items-center
            gap-3
            w-[320px]
            rounded-2xl
            border
            border-gray-200
            bg-gray-50
            px-4
            py-2.5
            transition-all
            focus-within:border-primary
            focus-within:bg-white
          "
        >

          <Search className="h-4 w-4 text-gray-400" />

          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            className="
              w-full
              bg-transparent
              text-sm
              outline-none
              placeholder:text-gray-400
            "
          />

        </div>
                {/* Notificaciones */}

                <button
          title="Notificaciones"
          className="
            relative
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-2xl
            border
            border-gray-200
            bg-white
            transition-all
            hover:border-primary
            hover:bg-primary-50
          "
        >

          <Bell className="h-5 w-5 text-gray-600" />

          <span
            className="
              absolute
              right-2
              top-2
              h-2.5
              w-2.5
              rounded-full
              bg-red-500
              ring-2
              ring-white
            "
          />

        </button>

        {/* Ayuda */}

        <button
          title="Centro de ayuda"
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-2xl
            border
            border-gray-200
            bg-white
            transition-all
            hover:border-primary
            hover:bg-primary-50
          "
        >

          <HelpCircle className="h-5 w-5 text-gray-600" />

        </button>

      </div>

    </header>

  );

}