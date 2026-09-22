// Theme choice, kept per phone in localStorage. "system" follows the phone's own setting.
// The dark palette is class-based (`.dark`), which is what shadcn's dark: variant matches,
// so a media query alone wouldn't switch the components.

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_KEY = "gymbuddy:theme";

// Runs before the page paints (inlined in the root layout), so there's no flash of the
// wrong theme. Kept as a string because it has to be a plain <script>, not React.
export const THEME_SCRIPT = `(function(){try{
  var t = localStorage.getItem(${JSON.stringify(THEME_KEY)}) || "system";
  var dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}catch(e){}})()`;

export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  // Tells the browser to darken native controls and scrollbars too.
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return THEMES.includes(stored as Theme) ? (stored as Theme) : "system";
  } catch {
    return "system";
  }
}

// Subscription so components can read the stored choice without a state-setting effect.
const listeners = new Set<() => void>();
export function subscribeTheme(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function writeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private browsing: the choice just won't survive a reload.
  }
  applyTheme(theme);
  listeners.forEach((l) => l());
}
