import { useSyncExternalStore } from 'react';
import { DARK_QUERY, THEME_STORAGE_KEY } from './theme-script';

export type Theme = 'light' | 'dark';

function hasStoredTheme(): boolean {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark';
  } catch {
    return false;
  }
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function subscribe(onChange: () => void) {
  // L'attribut est la source de vérité : le script, le bouton et le réglage système passent tous par lui
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Tant que l'utilisateur n'a rien choisi, on suit le système, y compris ses changements en direct
  // (ex: bascule jour/nuit). La synchro initiale rattrape un changement survenu avant l'hydratation.
  const media = matchMedia(DARK_QUERY);
  const followSystem = (isDark: boolean) => {
    if (!hasStoredTheme()) document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  };
  const onSystemChange = (event: MediaQueryListEvent) => followSystem(event.matches);
  followSystem(media.matches);
  media.addEventListener('change', onSystemChange);

  return () => {
    observer.disconnect();
    media.removeEventListener('change', onSystemChange);
  };
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour cette visite seulement
  }
}

export function useTheme() {
  // Côté serveur le thème est inconnu : « light » sert de valeur initiale, corrigée dès l'hydratation
  const theme = useSyncExternalStore(subscribe, getSnapshot, (): Theme => 'light');
  return { theme, setTheme };
}
