import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";

// ============================================================
// FUENTE
// ============================================================

const inter = Inter({
  subsets: ["latin"],
});

// ============================================================
// METADATA
// ============================================================

export const metadata: Metadata = {
  title: "CSNF Portal",
  description: "Portal de administración",
};

// ============================================================
// ROOT LAYOUT
// ============================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className="h-full"
    >
      <body
        className={`
          ${inter.className}
          h-full
          overflow-hidden
          m-0
          p-0
        `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}