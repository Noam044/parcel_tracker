"use client";

import { useTheme } from "@/lib/theme";

// Deux glyphes de 12 px, dessinés au trait comme le logo : le curseur montre le mode actif
function Sun() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="6" cy="6" r="2.2" />
      <path d="M6 .8v1.4M6 9.8v1.4M.8 6h1.4M9.8 6h1.4M2.3 2.3l1 1M8.7 8.7l1 1M9.7 2.3l-1 1M3.3 8.7l-1 1" strokeLinecap="round" />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M10.4 7.6A4.8 4.8 0 0 1 4.4 1.6a.4.4 0 0 0-.5-.5A5.2 5.2 0 1 0 10.9 8.1a.4.4 0 0 0-.5-.5Z" />
    </svg>
  );
}

/**
 * Curseur clair / sombre. Son apparence dépend de l'attribut data-theme (variante « dark: »), pas de
 * l'état React : le curseur est donc déjà à la bonne place au premier affichage, sans saut à l'hydratation.
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Mode sombre"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // py-2.5 agrandit la zone tactile (28 px de curseur → 48 px) sans changer l'apparence
      className="flex items-center gap-2.5 py-2.5"
    >
      <span className="label hidden text-ink-soft md:inline">Mode sombre</span>
      <span className="relative h-7 w-[3.25rem] shrink-0 rounded border-2 border-ink bg-sheet">
        <span className="absolute left-[3px] top-[3px] grid size-[18px] place-items-center rounded-[2px] bg-ink text-paper transition-transform duration-200 dark:translate-x-6">
          <span className="dark:hidden">
            <Sun />
          </span>
          <span className="hidden dark:block">
            <Moon />
          </span>
        </span>
      </span>
    </button>
  );
}
