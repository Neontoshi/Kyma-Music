import React from "react";

interface SearchHistoryProps {
  history: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string, e: React.MouseEvent) => void;
  onClear: () => void;
  visible: boolean;
  currentQuery: string;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelect,
  onRemove,
  onClear,
  visible,
  currentQuery,
}) => {
  if (!visible || history.length === 0) return null;

  const filtered = currentQuery.trim()
    ? history.filter((h) =>
        h.toLowerCase().includes(currentQuery.toLowerCase()),
      )
    : history;

  if (filtered.length === 0) return null;

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
        borderRadius: "12px",
        boxShadow:
          "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
        zIndex: 20,
        overflow: "hidden",
        maxHeight: "320px",
        overflowY: "auto",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px 4px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.12em",
            color: "var(--text3)",
            textTransform: "uppercase",
          }}
        >
          Recent Searches
        </span>
        <button
          onClick={onClear}
          style={{
            background: "none",
            border: "none",
            color: "var(--text3)",
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "2px 4px",
            transition: "color 0.1s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--error, #ff4444)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--text3)")
          }
        >
          Clear All
        </button>
      </div>

      {filtered.map((item, idx) => (
        <div
          key={idx}
          onClick={() => onSelect(item)}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            transition: "all 0.12s",
            background: "transparent",
            margin: "0 4px",
            borderRadius: "8px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--surface2)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          {/* Clock icon */}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background:
                "linear-gradient(135deg, var(--surface2), var(--surface3))",
              border: "1px solid var(--border)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text3)"
              strokeWidth="1.5"
              width="18"
              height="18"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            {/* Small clock without background */}
            <span
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                fontSize: "11px",
                lineHeight: 1,
                opacity: 0.7,
              }}
            >
              🕐
            </span>
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
              {item}
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => onRemove(item, e)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text3)",
              cursor: "pointer",
              fontSize: "12px",
              padding: "4px",
              flexShrink: 0,
              lineHeight: 1,
              transition: "color 0.1s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color =
                "var(--error, #ff4444)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--text3)")
            }
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default SearchHistory;
