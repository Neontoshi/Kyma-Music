import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { logger } from "../../../../services/logger";

interface StyledSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; fontFamily?: string }[];
  setting?: string;
}

const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  onChange,
  options,
  setting,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
        background: "var(--surface)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "10px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        maxHeight: "280px",
        overflowY: "auto",
      });
    }
  };

  const handleOpen = () => {
    updateDropdownPosition();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current?.contains(event.target as Node) ||
        dropdownRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    logger.logUI("Settings", "select_change", {
      setting,
      from: value,
      to: optionValue,
    });
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "9px 14px",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${isOpen ? "rgba(124,106,245,0.5)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: "10px",
          color: "var(--text)",
          fontSize: "13px",
          fontFamily: selectedOption?.fontFamily || "inherit",
          cursor: "pointer",
          outline: "none",
          transition: "border-color 0.2s",
          letterSpacing: "0.02em",
          boxSizing: "border-box",
          gap: "8px",
        }}
        onMouseEnter={(e) => {
          if (!isOpen)
            e.currentTarget.style.borderColor = "rgba(124,106,245,0.4)";
        }}
        onMouseLeave={(e) => {
          if (!isOpen)
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        }}
      >
        <span
          style={{
            fontFamily: selectedOption?.fontFamily || "inherit",
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedOption?.label || "Select..."}
        </span>

        {/* Chevron */}
        <svg
          style={{
            flexShrink: 0,
            color: "var(--text3)",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown rendered at body level via portal */}
      {isOpen &&
        createPortal(
          <div ref={dropdownRef} style={dropdownStyle}>
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 14px",
                    cursor: "pointer",
                    fontSize: "13px",
                    letterSpacing: "0.02em",
                    fontFamily: opt.fontFamily || "inherit",
                    color: isSelected ? "var(--accent2)" : "var(--text)",
                    background: isSelected
                      ? "rgba(124,106,245,0.1)"
                      : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected
                      ? "rgba(124,106,245,0.1)"
                      : "transparent";
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontFamily: opt.fontFamily || "inherit",
                      color: "var(--text3)",
                      flexShrink: 0,
                      width: "24px",
                      textAlign: "center",
                    }}
                  >
                    Aa
                  </span>
                  <span
                    style={{
                      fontFamily: opt.fontFamily || "inherit",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {opt.label}
                  </span>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default StyledSelect;
