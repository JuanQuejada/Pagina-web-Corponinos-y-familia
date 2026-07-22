"use client";

import LoginBackground from "../background/LoginBackground";

interface AuthLayoutProps{
  children:React.ReactNode;
}

export default function AuthLayout({
  children,
}:AuthLayoutProps){

  return(
    <main
      className="
      relative
      min-h-screen
      overflow-hidden
      "
    >

      <LoginBackground/>

      <section
        className="
        relative
        z-10
        flex
        min-h-screen
        items-center
        justify-center
        px-6
        py-10
        "
      >

        {children}

      </section>

    </main>
  );

}