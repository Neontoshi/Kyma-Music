// Kyma_Frontend/src/presentation/pages/Settings/sections/AppearanceSection.tsx
import React from "react";
import { themes } from "../../../stores/themeDefs";
import { logger } from "../../../../services/logger";
import { FONT_OPTIONS } from "../../../stores/fontStore";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";
import StyledSelect from "../components/StyledSelect";

interface AppearanceSectionProps {
  selectedFont: string;
  onFontChange: (font: string) => void;
  localTheme: string;
  setLocalTheme: (theme: string) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
}

// Type for theme
interface ThemeType {
  id: string;
  name: string;
  mode: "dark" | "light";
  colors: Record<string, string>;
}

const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  selectedFont,
  onFontChange,
  localTheme,
  setLocalTheme,
  fontSize,
  setFontSize,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Font Selection Section */}
      <SectionCard>
        <SectionHeader
          icon="🔤"
          title="Typography"
          desc="Customize the app's typeface"
          accent="rgba(124,106,245,0.1)"
        />
        <div style={{ padding: "20px 24px" }}>
          {/* Font Family Selection - Full Width */}
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                color: "var(--text3)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              Font Family
            </div>
            <StyledSelect
              value={selectedFont}
              onChange={onFontChange}
              setting="fontFamily"
              options={FONT_OPTIONS.map((f) => ({
                value: f.value,
                label: f.label,
                fontFamily: f.fontFamily,
              }))}
            />

            {/* Live Preview Box */}
            <div
              style={{
                marginTop: "16px",
                padding: "16px 20px",
                background: "var(--surface2)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                fontFamily: FONT_OPTIONS.find((f) => f.value === selectedFont)
                  ?.fontFamily,
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                  color: "var(--accent2)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Live Preview
              </div>
              <div
                style={{
                  fontSize:
                    fontSize === "small"
                      ? "16px"
                      : fontSize === "large"
                        ? "22px"
                        : fontSize === "x-large"
                          ? "26px"
                          : "19px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
              <div
                style={{
                  fontSize:
                    fontSize === "small"
                      ? "11px"
                      : fontSize === "large"
                        ? "15px"
                        : fontSize === "x-large"
                          ? "17px"
                          : "13px",
                  color: "var(--text2)",
                  fontStyle: "italic",
                }}
              >
                1234567890 • ABCDEFGHIJKLMNOPQRSTUVWXYZ •
                abcdefghijklmnopqrstuvwxyz
              </div>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                color: "var(--text3)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              Font Size
            </div>
            <StyledSelect
              value={fontSize}
              onChange={setFontSize}
              setting="fontSize"
              options={[
                { value: "small", label: "Small — 12px" },
                { value: "medium", label: "Medium — 14px" },
                { value: "large", label: "Large — 16px" },
                { value: "x-large", label: "Extra Large — 18px" },
              ]}
            />
          </div>
        </div>
      </SectionCard>

      {/* Theme Selection Section */}
      <SectionCard>
        <SectionHeader
          icon="🎨"
          title="Theme"
          desc="Choose your visual style"
          accent="rgba(192,132,252,0.1)"
        />
        <div style={{ padding: "20px 24px" }}>
          {/* Dark Themes */}
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
              color: "var(--text3)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🌙</span> Dark Themes
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "12px",
              marginBottom: "28px",
            }}
          >
            {(themes as ThemeType[])
              .filter((t: ThemeType) => t.mode === "dark")
              .map((t: ThemeType) => {
                const isActive = localTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      logger.logUI("SettingsPage", "theme_change", {
                        from: localTheme,
                        to: t.id,
                      });
                      setLocalTheme(t.id);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 8px",
                      borderRadius: "var(--radius-lg)",
                      border: isActive
                        ? "2px solid var(--accent)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: isActive
                        ? "rgba(124,106,245,0.1)"
                        : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      outline: "none",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "var(--radius-circle)",
                        background: `linear-gradient(135deg, ${t.colors["--accent"]}, ${t.colors["--accent2"]})`,
                        border: `3px solid ${t.colors["--surface2"]}`,
                        boxShadow: isActive
                          ? `0 0 12px ${t.colors["--accent"]}80`
                          : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        fontFamily:
                          "var(--font-family-mono, 'DM Mono', monospace)",
                        color: isActive ? "var(--accent2)" : "var(--text2)",
                        fontWeight: isActive ? 600 : 400,
                        textAlign: "center",
                      }}
                    >
                      {t.name}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Light Themes */}
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
              color: "var(--text3)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>☀️</span> Light Themes
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "12px",
            }}
          >
            {(themes as ThemeType[])
              .filter((t: ThemeType) => t.mode === "light")
              .map((t: ThemeType) => {
                const isActive = localTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      logger.logUI("SettingsPage", "theme_change", {
                        from: localTheme,
                        to: t.id,
                      });
                      setLocalTheme(t.id);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 8px",
                      borderRadius: "var(--radius-lg)",
                      border: isActive
                        ? "2px solid var(--accent)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: isActive
                        ? "rgba(124,106,245,0.1)"
                        : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      outline: "none",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "var(--radius-circle)",
                        background: `linear-gradient(135deg, ${t.colors["--accent"]}, ${t.colors["--accent2"]})`,
                        border: `3px solid ${t.colors["--surface2"]}`,
                        boxShadow: isActive
                          ? `0 0 12px ${t.colors["--accent"]}80`
                          : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        fontFamily:
                          "var(--font-family-mono, 'DM Mono', monospace)",
                        color: isActive ? "var(--accent2)" : "var(--text2)",
                        fontWeight: isActive ? 600 : 400,
                        textAlign: "center",
                      }}
                    >
                      {t.name}
                    </span>
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
