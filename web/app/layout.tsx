import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Albahaca · humedad en vivo",
  description: "Monitor IoT de la humedad de la tierra de una albahaca, en tiempo real.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16211b" },
    { media: "(prefers-color-scheme: light)", color: "#e4ebe0" },
  ],
};

// Aplica el tema guardado antes de pintar, para que no parpadee.
const temaInicial = `try{var t=localStorage.getItem("tema");if(t!=="claro"&&t!=="oscuro")t=matchMedia("(prefers-color-scheme: light)").matches?"claro":"oscuro";document.documentElement.dataset.tema=t}catch(e){document.documentElement.dataset.tema="oscuro"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
