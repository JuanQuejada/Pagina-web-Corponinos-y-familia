"use client";

import Image from "next/image";

export default function LoginBackground() {

  return (

    <div className="absolute inset-0 overflow-hidden">

      <Image
        src="/images/login/fachada-login.png"
        alt="Corporación Social Niños y Familia"
        width={2000}
        height={480}
        priority
        className="object-cover object-center"
      />

      {/* Overlay */}

      <div className="absolute inset-0 bg-black/10" />

    </div>

  );

}