'use client';
import { Check, Moon, RotateCcw, Sun } from 'lucide-react';
import type { ColorMode, ThemePalette } from '@/lib/appearance';
import { useLocale } from './locale';
import { Panel } from './ui';

export function AppearanceSettings({
  mode,
  palette,
  setMode,
  setPalette,
}: {
  mode: ColorMode;
  palette: ThemePalette;
  setMode: (mode: ColorMode) => void;
  setPalette: (palette: ThemePalette) => void;
}) {
  const { t } = useLocale();
  return (
    <Panel
      title={t('appearance')}
      subtitle={t('appearanceSub')}
      className="appearance-panel"
    >
      <div className="appearance-controls">
        <fieldset className="appearance-mode">
          <legend>{t('colorMode')}</legend>
          <div className="mode-options">
            <button
              aria-pressed={mode === 'light'}
              onClick={() => setMode('light')}
            >
              <Sun size={18} />
              {t('light')}
            </button>
            <button
              aria-pressed={mode === 'dark'}
              onClick={() => setMode('dark')}
            >
              <Moon size={18} />
              {t('dark')}
            </button>
          </div>
        </fieldset>
        <button
          className="text-button"
          onClick={() => {
            setMode('light');
            setPalette('sage');
          }}
        >
          <RotateCcw size={16} />
          {t('appearanceReset')}
        </button>
      </div>
      <fieldset className="theme-options">
        <legend>{t('visualTheme')}</legend>
        <div className="theme-grid">
          {(['sage', 'glass'] as const).map((choice) => (
            <button
              key={choice}
              className="theme-choice"
              aria-pressed={palette === choice}
              onClick={() => setPalette(choice)}
            >
              <div
                className={`theme-preview preview-${choice}`}
                aria-hidden="true"
              >
                <div className="preview-nav">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="preview-body">
                  <div className="preview-heading" />
                  <div className="preview-metrics">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="preview-chart">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
              <div className="theme-choice-heading">
                <strong>{t(`theme${choice}`)}</strong>
                {palette === choice && <Check size={19} aria-hidden="true" />}
              </div>
              <p>{t(`theme${choice}Sub`)}</p>
            </button>
          ))}
        </div>
      </fieldset>
      <p className="note">{t('appearanceNote')}</p>
    </Panel>
  );
}
