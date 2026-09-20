import type { Metadata } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import "./globals.css";

// Archivo est une police variable dont l'axe de largeur (wdth) donne toute la personnalité des titres
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Réservée aux données : numéros de suivi, heures, libellés
const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Parcel Tracker",
  description: "Suivez vos colis en temps réel et visualisez leur itinéraire sur une carte.",
  authors: [{ name: "Noam Bouriche", url: "https://noambouriche.fr" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${archivo.variable} ${martianMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
