import React from "react";
import { themes } from "../../../stores/themeDefs";
import { logger } from "../../../../services/logger";
import {
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
} from "../../../stores/fontStore";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";

interface AppearanceSectionProps {
  selectedFont: string;
  onFontChange: (font: string) => void;
  localTheme: string;
  setLocalTheme: (theme: string) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
}

const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  selectedFont,
  onFontChange,
  localTheme,
  setLocalTheme,
  fontSize,
  setFontSize,
}) => {
  const selectedFontOption = FONT_OPTIONS.find(
    (font) => font.value === selectedFont,
  );
  const selectedSize =
    FONT_SIZE_OPTIONS.find((size) => size.value === fontSize) ??
    FONT_SIZE_OPTIONS[1];

  const changeSize = (size: string) => {
    logger.logUI("SettingsPage", "font_size_change", {
      from: fontSize,
      to: size,
    });
    setFontSize(size);
  };

  return (
    <div className="settings-stack">
      <SectionCard>
        <SectionHeader
          icon="Aa"
          title="Typography"
          desc="Typeface and interface scale"
          accent="rgba(var(--accent-rgb),0.1)"
          badge="Live"
        />
        <div className="settings-card-body">
          <div className="settings-field">
            <div className="settings-field-head">
              <span className="settings-field-label">Font family</span>
              <span className="settings-field-value">
                {selectedFontOption?.category ?? "Custom"}
              </span>
            </div>
            <div className="settings-font-grid">
              {FONT_OPTIONS.map((font) => {
                const isActive = selectedFont === font.value;
                return (
                  <button
                    key={font.value}
                    className={`settings-font-option ${isActive ? "active" : ""}`}
                    onClick={() => onFontChange(font.value)}
                    style={{ fontFamily: font.fontFamily }}
                  >
                    <span className="settings-font-aa">Aa</span>
                    <span className="settings-font-name">{font.label}</span>
                    <span className="settings-font-check">✓</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="settings-field">
            <div className="settings-field-head">
              <span className="settings-field-label">Interface size</span>
              <span className="settings-field-value">
                {Math.round(selectedSize.scale * 100)}%
              </span>
            </div>
            <div className="settings-size-grid">
              {FONT_SIZE_OPTIONS.map((size, index) => {
                const isActive = fontSize === size.value;
                return (
                  <button
                    key={size.value}
                    className={`settings-size-option ${isActive ? "active" : ""}`}
                    onClick={() => changeSize(size.value)}
                  >
                    <span
                      className="settings-size-glyph"
                      style={{ fontSize: `${10 + index * 3}px` }}
                    >
                      A
                    </span>
                    <span className="settings-size-label">{size.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="settings-hint">
              Scales text and controls across the entire app instantly.
            </p>
          </div>

          <div
            className="settings-font-preview"
            style={{ fontFamily: selectedFontOption?.fontFamily }}
          >
            <div className="settings-preview-head">
              <span>Live preview</span>
              <span className="settings-preview-aa">Aa</span>
            </div>
            <div className="settings-preview-title">
              The quick brown fox jumps over the lazy dog
            </div>
            <div className="settings-preview-body">
              1234567890 · ABCDEFGHIJKLMNOPQRSTUVWXYZ ·
              abcdefghijklmnopqrstuvwxyz
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon="◈"
          title="Theme"
          desc="Choose your palette"
          accent="rgba(255,255,255,0.06)"
        />
        <div className="settings-card-body">
          <div className="settings-theme-grid">
            {themes.map((theme) => {
              const isActive = localTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  className={`settings-theme-option ${isActive ? "active" : ""}`}
                  onClick={() => {
                    logger.logUI("SettingsPage", "theme_change", {
                      from: localTheme,
                      to: theme.id,
                    });
                    setLocalTheme(theme.id);
                  }}
                >
                  <span
                    className="settings-theme-swatch"
                    style={{
                      background: `radial-gradient(circle at 32% 24%, rgba(255,255,255,0.4), transparent 38%), linear-gradient(135deg, ${theme.colors["--accent"]}, ${theme.colors["--accent2"]})`,
                    }}
                  >
                    <span
                      style={{ background: theme.colors["--surface"] }}
                    />
                  </span>
                  <span className="settings-theme-copy">
                    <strong>{theme.name}</strong>
                    <small>Palette</small>
                  </span>
                  <span className="settings-theme-check">✓</span>
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default AppearanceSection;
