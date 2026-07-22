"use client";

import { ReactNode } from "react";
import LoginBackground from "@/components/auth/background/LoginBackground";

interface LoginLayoutProps{
  children:ReactNode;
}

export default function LoginLayout({
  children,
}:LoginLayoutProps){

  return(

    <main className="relative min-h-screen overflow-hidden">
      
      <div className="relative z-10 flex min-h-screen items-center justify-center p-8">

        {children}

      </div>

    </main>

  );

}