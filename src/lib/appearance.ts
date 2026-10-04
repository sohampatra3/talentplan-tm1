export type ColorMode = 'light' | 'dark';
export type ThemePalette = 'sage' | 'glass';

// The old preference could have been saved automatically from the device's
// dark mode. Start fresh so only an explicit choice enables dark mode.
export const APPEARANCE_STORAGE_KEY = 'talentplan-appearance-v1';

export const appearanceInitScript = `(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('${APPEARANCE_STORAGE_KEY}') || 'null');
    if (saved?.mode === 'light' || saved?.mode === 'dark') document.documentElement.dataset.theme = saved.mode;
    if (saved?.palette === 'sage' || saved?.palette === 'glass') document.documentElement.dataset.palette = saved.palette;
  } catch {}
})();`;
