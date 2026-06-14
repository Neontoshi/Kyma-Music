import React, { useEffect, useRef, useState } from "react";
import { tauriCommands } from "../../../services/tauriBridge";

interface Suggestion {
  text: string;
  artist: string;
  artwork_url: string;
}

interface Props {
  query: string;
  onSelect: (value: string) => void;
  visible: boolean;
}

const SearchSuggestions: React.FC<Props> = ({ query, onSelect, visible }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await tauriCommands.searchSuggestions(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 100);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, visible]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: "var(--radius-lg)",
        zIndex: 20,
        overflow: "hidden",
        boxShadow:
          "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
        maxHeight: "320px",
        overflowY: "auto",
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ padding: "8px 12px 4px" }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.12em",
            color: "var(--text3)",
            textTransform: "uppercase",
          }}
        >
          Suggestions
        </span>
      </div>
      {suggestions.map((s, i) => (
        <div
          key={i}
          onClick={() => onSelect(s.text)}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            transition: "all 0.12s",
            background: "transparent",
            margin: "0 4px",
            borderRadius: "var(--radius-md)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--surface2)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-md)",
              background:
                "linear-gradient(135deg, var(--surface2), var(--surface3))",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--border)",
            }}
          >
            {s.artwork_url ? (
              <img
                src={s.artwork_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "18px" }}>🎵</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {s.text.split(" - ")[1] || s.text}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text3)",
                fontFamily: "'DM Mono', monospace",
                marginTop: "2px",
                letterSpacing: "0.02em",
              }}
            >
              {s.artist}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text3)"
              strokeWidth="1.5"
              width="14"
              height="14"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchSuggestions;
