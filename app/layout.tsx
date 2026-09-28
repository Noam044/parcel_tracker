import type { Metadata } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import { LOCALE_SCRIPT } from "@/lib/locale-script";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { DEEPLINK_SCRIPT } from "@/lib/url-script";
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
    // suppressHydrationWarning : les scripts du <body> changent lang, data-theme, data-lang et data-deeplink sur
    // <html> avant que React ne s'hydrate (voir plus bas)
    <html lang="fr" className={`${archivo.variable} ${martianMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        {/*
          Scripts du thème, de la langue et du lien direct : premiers enfants du <body>, donc exécutés
          avant que le contenu ne soit affiché (pas de flash de mauvais thème, de mauvaise langue, ni de
          l'accueil sur un lien vers un colis). Volontairement PAS dans le <head> : l'edge de Netlify y injecte des <meta> (hosting-provider, netlify-deploy)
          et React, qui apparie à la main les éléments non « hissables » du <head>, n'y retrouvait plus
          le script (erreur d'hydratation #418).
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LOCALE_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: DEEPLINK_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
