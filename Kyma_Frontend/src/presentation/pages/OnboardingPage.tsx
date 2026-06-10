import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/userStore";
import { useSystemStore } from "../stores/systemStore";

const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState<"welcome" | "ytdlp" | "form">("welcome");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionDir, setTransitionDir] = useState<"forward" | "back">(
    "forward",
  );
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const setUser = useUserStore((s) => s.setUser);
  const navigate = useNavigate();
  const { ytdlpAvailable, ytdlpChecked, checkYtdlp } = useSystemStore();

  const canContinue =
    displayName.trim().length > 0 && username.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Determine next step after welcome
  const goForward = () => {
    setTransitionDir("forward");
    setTransitioning(true);
    setTimeout(() => {
      if (step === "welcome") {
        // Skip yt-dlp page if already installed
        if (ytdlpChecked && ytdlpAvailable) {
          setStep("form");
        } else {
          setStep("ytdlp");
          if (!ytdlpChecked) checkYtdlp();
        }
      } else if (step === "ytdlp") {
        setStep("form");
      }
      setTransitioning(false);
      setMounted(false);
      setTimeout(() => setMounted(true), 30);
    }, 320);
  };

  const goBack = () => {
    setTransitionDir("back");
    setTransitioning(true);
    setTimeout(() => {
      if (step === "form") {
        if (ytdlpChecked && ytdlpAvailable) {
          setStep("welcome");
        } else {
          setStep("ytdlp");
        }
      } else if (step === "ytdlp") {
        setStep("welcome");
      }
      setTransitioning(false);
      setMounted(false);
      setTimeout(() => setMounted(true), 30);
    }, 320);
  };

  const handleFinish = async () => {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      setUser(displayName.trim(), username.trim());
      navigate("/");
    }, 420);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === "form" && canContinue) handleFinish();
  };

  const slideOut = transitioning
    ? transitionDir === "forward"
      ? "translateX(-60px)"
      : "translateX(60px)"
    : "translateX(0)";

  const slideIn = !mounted
    ? transitionDir === "forward"
      ? "translateX(60px)"
      : "translateX(-60px)"
    : "translateX(0)";

  const contentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
    width: "100%",
    maxWidth: "420px",
    transform: transitioning ? slideOut : slideIn,
    opacity: transitioning ? 0 : mounted ? 1 : 0,
    transition: transitioning
      ? "transform 0.32s cubic-bezier(0.4,0,1,1), opacity 0.32s ease"
      : "transform 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.38s ease",
  };

  const getCopyCommand = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("linux")) return "sudo apt install yt-dlp";
    if (ua.includes("mac")) return "brew install yt-dlp";
    return "pip install yt-dlp";
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  return (
    <div className="onb-root" onKeyDown={handleKeyDown}>
      <div className="onb-ambient">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="onb-ambient-dot"
            style={{
              width: `${180 + i * 80}px`,
              height: `${180 + i * 80}px`,
              top: `${[10, 60, 30, 70, 20, 50][i]}%`,
              left: `${[10, 80, 50, 20, 70, 40][i]}%`,
              animation: `onbGlow ${3 + i * 0.7}s ease-in-out ${i * 0.4}s infinite`,
            }}
          />
        ))}
      </div>

      <div style={contentStyle} tabIndex={-1}>
        {step === "welcome" && (
          <>
            <div className="onb-icon-wrap onb-item-1">
              <div className="onb-icon-glow" />
              <span className="onb-icon-emoji">🎵</span>
              <div className="onb-orbit-dot" />
              <div className="onb-orbit-dot-2" />
            </div>

            <div className="onb-item-2" style={{ textAlign: "center" }}>
              <h1 className="onb-hero-title">
                Welcome to <span className="onb-shimmer-text">Kyma</span>
              </h1>
            </div>

            <p className="onb-hero-sub onb-item-3">
              Your modern music player with Online Streaming and local library
              support, all in one place.
            </p>

            <button className="onb-main-btn onb-item-4" onClick={goForward}>
              Continue →
            </button>
          </>
        )}

        {step === "ytdlp" && (
          <>
            <div className="onb-form-icon onb-item-1">📥</div>

            <div className="onb-item-2" style={{ textAlign: "center" }}>
              <h2 className="onb-form-title">Install yt-dlp</h2>
              <p className="onb-form-sub">Required for Online streaming</p>
            </div>

            <div
              className="onb-item-3"
              style={{ width: "100%", maxWidth: "420px" }}
            >
              <div className="onb-ytdlp-card">
                <div className="onb-ytdlp-header">
                  <span>🔧</span>
                  <span className="onb-ytdlp-title">yt-dlp</span>
                  <span
                    className={`onb-ytdlp-status ${ytdlpChecked && ytdlpAvailable ? "detected" : ""}`}
                  >
                    {ytdlpChecked
                      ? ytdlpAvailable
                        ? "✓ Detected"
                        : "✗ Not found"
                      : "Checking..."}
                  </span>
                </div>

                {(!ytdlpChecked || !ytdlpAvailable) && (
                  <>
                    <p className="onb-ytdlp-desc">
                      Copy and run this command in your terminal, then restart
                      Kyma.
                    </p>
                    <div className="onb-ytdlp-cmd-wrap">
                      <code className="onb-ytdlp-cmd">{getCopyCommand()}</code>
                      <button
                        className="onb-ytdlp-copy"
                        onClick={() => handleCopy(getCopyCommand())}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="16"
                          height="16"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </button>
                    </div>
                    <button
                      className="onb-ytdlp-retry"
                      onClick={() => checkYtdlp()}
                    >
                      Check Again
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              className="onb-item-4"
              style={{ display: "flex", gap: "12px" }}
            >
              <button className="onb-back-btn" onClick={goBack}>
                ← Back
              </button>
              <button className="onb-main-btn" onClick={goForward}>
                Continue →
              </button>
            </div>
          </>
        )}

        {step === "form" && (
          <>
            <div className="onb-form-icon onb-item-1">👤</div>

            <div className="onb-item-2" style={{ textAlign: "center" }}>
              <h2 className="onb-form-title">Tell us about yourself</h2>
            </div>

            <div className="onb-fields onb-item-3">
              <div className="onb-field">
                <label className="onb-label">Display Name</label>
                <input
                  autoFocus
                  type="text"
                  className="onb-input-field"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Kalon"
                  maxLength={30}
                />
              </div>
              <div className="onb-field">
                <label className="onb-label">Full Name</label>
                <input
                  type="text"
                  className="onb-input-field onb-input-mono"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kalon Doe"
                  maxLength={20}
                />
              </div>
            </div>

            <div className="onb-form-actions onb-item-4">
              <button
                className={`onb-main-btn${!canContinue ? " onb-main-btn-disabled" : ""}${submitting ? " submitting" : ""}${canContinue ? " onb-main-btn-ready" : ""}`}
                style={{ width: "100%" }}
                onClick={handleFinish}
                disabled={!canContinue || submitting}
              >
                {submitting ? "Setting up..." : "Get Started"}
              </button>
              <button className="onb-back-btn onb-item-5" onClick={goBack}>
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
