import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/userStore";
import { useSystemStore } from "../stores/systemStore";

const WaveMark: React.FC = () => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="13.5" stroke="currentColor" strokeWidth="1.4" opacity="0.34" />
    <circle cx="16" cy="16" r="8.5" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
    <circle cx="16" cy="16" r="3" fill="currentColor" />
    <path d="M16 2.5v4M16 25.5v4M2.5 16h4M25.5 16h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const ArrowIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </svg>
);

const BackIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="11 18 5 12 11 6" />
  </svg>
);

const CopyIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TerminalIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2.5" y="4" width="19" height="16" rx="3" />
    <polyline points="7 9 10 12 7 15" />
    <line x1="13" y1="15" x2="17" y2="15" />
  </svg>
);

const UserIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </svg>
);

const LocalIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
  </svg>
);

const GlobeIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const ShieldIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 3v5.5c0 4.3-2.9 7.7-7 9.5-4.1-1.8-7-5.2-7-9.5V6z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

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
  const [copied, setCopied] = useState(false);
  const setUser = useUserStore((s) => s.setUser);
  const navigate = useNavigate();
  const { ytdlpAvailable, ytdlpChecked, checkYtdlp } = useSystemStore();

  const canContinue =
    displayName.trim().length > 0 && username.trim().length > 0;

  const stepNumber = step === "welcome" ? 1 : step === "ytdlp" ? 2 : 3;
  const initials =
    `${displayName.trim().charAt(0)}${username.trim().charAt(0)}`.toUpperCase() ||
    "K";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const goForward = () => {
    setTransitionDir("forward");
    setTransitioning(true);
    setTimeout(() => {
      if (step === "welcome") {
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
      ? "translateX(-42px)"
      : "translateX(42px)"
    : "translateX(0)";

  const slideIn = !mounted
    ? transitionDir === "forward"
      ? "translateX(42px)"
      : "translateX(-42px)"
    : "translateX(0)";

  const contentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "380px",
    margin: "0 auto",
    transform: transitioning ? slideOut : slideIn,
    opacity: transitioning ? 0 : mounted ? 1 : 0,
    transition: transitioning
      ? "transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.28s ease"
      : "transform 0.42s cubic-bezier(0.16,1,0.3,1), opacity 0.36s ease",
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
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="onb-root" onKeyDown={handleKeyDown}>
      <div className="onb-ambient" aria-hidden="true">
        <div className="onb-grid" />
        <div className="onb-orb onb-orb-1" />
        <div className="onb-orb onb-orb-2" />
        <div className="onb-orb onb-orb-3" />
      </div>

      <div className="onb-shell">
        <aside className="onb-showcase">
          <div className="onb-brand">
            <span className="onb-brand-mark">
              <WaveMark />
            </span>
            <span className="onb-brand-copy">
              <span className="onb-brand-name">KYMA</span>
              <span className="onb-brand-sub">Music player</span>
            </span>
          </div>

          <div className="onb-showcase-copy">
            <div className="onb-eyebrow">Your music, your space</div>
            <h1>
              Hear everything.
              <br />
              <span>Own your sound.</span>
            </h1>
            <p>
              A refined player for your local library and the music you love
              online — beautifully in one place.
            </p>
          </div>

          <div className="onb-vinyl-stage" aria-hidden="true">
            <div className="onb-vinyl-glow" />
            <div className="onb-vinyl">
              <div className="onb-vinyl-label">
                <span className="onb-vinyl-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="onb-vinyl-word">KYMA</span>
              </div>
            </div>
            <span className="onb-vinyl-orbit onb-vinyl-orbit-1" />
            <span className="onb-vinyl-orbit onb-vinyl-orbit-2" />
          </div>

          <div className="onb-showcase-perks">
            <div className="onb-showcase-perk">
              <LocalIcon />
              <span>Local first</span>
            </div>
            <div className="onb-showcase-perk">
              <GlobeIcon />
              <span>Online ready</span>
            </div>
            <div className="onb-showcase-perk">
              <ShieldIcon />
              <span>Private by design</span>
            </div>
          </div>

          <div className="onb-showcase-foot">
            <span />
            Runs on your device
          </div>
        </aside>

        <main className="onb-card">
          <div className="onb-mobile-brand">
            <span className="onb-brand-mark">
              <WaveMark />
            </span>
            <span className="onb-brand-name">KYMA</span>
          </div>

          <div className="onb-card-top">
            <div className="onb-steps" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`onb-step-seg ${
                    n < stepNumber ? "done" : n === stepNumber ? "active" : ""
                  }`}
                />
              ))}
            </div>
            <span className="onb-step-label">
              Step {stepNumber} of 3
            </span>
          </div>

          <div className="onb-step-body" style={contentStyle}>
            {step === "welcome" && (
              <>
                <div className="onb-hero-mark">
                  <div className="onb-hero-mark-halo" />
                  <WaveMark />
                </div>

                <div className="onb-copy-block">
                  <div className="onb-eyebrow">Welcome</div>
                  <h2 className="onb-title">
                    This is <span>Kyma</span>
                  </h2>
                  <p className="onb-sub">
                    Set up your listening space in under a minute. Your library,
                    your playlists, your sound.
                  </p>
                </div>

                <div className="onb-welcome-perks">
                  <div className="onb-welcome-perk">
                    <span className="onb-perk-icon">
                      <LocalIcon />
                    </span>
                    <div>
                      <strong>Bring your library</strong>
                      <span>Local files, artwork and playlists.</span>
                    </div>
                  </div>
                  <div className="onb-welcome-perk">
                    <span className="onb-perk-icon">
                      <GlobeIcon />
                    </span>
                    <div>
                      <strong>Stream anything</strong>
                      <span>Search and play from the web.</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="onb-main-btn"
                  onClick={goForward}
                >
                  Get started
                  <span className="onb-btn-icon">
                    <ArrowIcon />
                  </span>
                </button>

                <p className="onb-fine-print">
                  No account required. Everything stays on this device.
                </p>
              </>
            )}

            {step === "ytdlp" && (
              <>
                <div className="onb-form-icon">
                  <TerminalIcon />
                </div>

                <div className="onb-copy-block">
                  <div className="onb-eyebrow">Online streaming</div>
                  <h2 className="onb-title">Install yt-dlp</h2>
                  <p className="onb-sub">
                    This small helper lets Kyma stream from the web. You can
                    also add it later in Settings.
                  </p>
                </div>

                <div className="onb-ytdlp-card">
                  <div className="onb-ytdlp-header">
                    <span className="onb-ytdlp-logo">
                      <TerminalIcon />
                    </span>
                    <span className="onb-ytdlp-title">yt-dlp</span>
                    <span
                      className={`onb-ytdlp-status ${
                        ytdlpChecked
                          ? ytdlpAvailable
                            ? "detected"
                            : "missing"
                          : "checking"
                      }`}
                    >
                      <i />
                      {ytdlpChecked
                        ? ytdlpAvailable
                          ? "Detected"
                          : "Not found"
                        : "Checking"}
                    </span>
                  </div>

                  {ytdlpChecked && ytdlpAvailable ? (
                    <p className="onb-ytdlp-ready">
                      <span>
                        <CheckIcon />
                      </span>
                      Online streaming is ready to go.
                    </p>
                  ) : (
                    <>
                      <p className="onb-ytdlp-desc">
                        Run this command in your terminal, then restart Kyma.
                      </p>
                      <div className="onb-ytdlp-cmd-wrap">
                        <span className="onb-cmd-prompt">$</span>
                        <code className="onb-ytdlp-cmd">
                          {getCopyCommand()}
                        </code>
                        <button
                          type="button"
                          className={`onb-ytdlp-copy ${
                            copied ? "copied" : ""
                          }`}
                          onClick={() => handleCopy(getCopyCommand())}
                          title={copied ? "Copied" : "Copy command"}
                        >
                          {copied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="onb-ytdlp-retry"
                        onClick={() => checkYtdlp()}
                      >
                        Check again
                      </button>
                    </>
                  )}
                </div>

                <div className="onb-form-actions onb-form-actions-row">
                  <button
                    type="button"
                    className="onb-back-btn"
                    onClick={goBack}
                  >
                    <BackIcon />
                    Back
                  </button>
                  <button
                    type="button"
                    className="onb-main-btn"
                    onClick={goForward}
                  >
                    Continue
                    <span className="onb-btn-icon">
                      <ArrowIcon />
                    </span>
                  </button>
                </div>
              </>
            )}

            {step === "form" && (
              <>
                <div className="onb-form-icon">
                  <UserIcon />
                </div>

                <div className="onb-copy-block">
                  <div className="onb-eyebrow">Almost there</div>
                  <h2 className="onb-title">Make it yours</h2>
                  <p className="onb-sub">
                    This is how Kyma will greet you when you open the app.
                  </p>
                </div>

                <div className="onb-profile-preview">
                  <div className="onb-profile-avatar">{initials}</div>
                  <div className="onb-profile-copy">
                    <strong>{displayName.trim() || "Your name"}</strong>
                    <span>
                      {username.trim()
                        ? `@${username.trim().replace(/\s+/g, "").toLowerCase()}`
                        : "@username"}
                    </span>
                  </div>
                  <span className="onb-profile-chip">Local</span>
                </div>

                <div className="onb-fields">
                  <label className="onb-field">
                    <span className="onb-label">Display name</span>
                    <input
                      autoFocus
                      type="text"
                      className="onb-input-field"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Kalon"
                      maxLength={30}
                    />
                  </label>
                  <label className="onb-field">
                    <span className="onb-label">Full name</span>
                    <input
                      type="text"
                      className="onb-input-field"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Kalon Doe"
                      maxLength={20}
                    />
                  </label>
                </div>

                <div className="onb-form-actions">
                  <button
                    type="button"
                    className={`onb-main-btn ${
                      !canContinue ? "onb-main-btn-disabled" : ""
                    } ${submitting ? "submitting" : ""}`}
                    onClick={handleFinish}
                    disabled={!canContinue || submitting}
                  >
                    {submitting ? "Setting things up…" : "Start listening"}
                    {!submitting && (
                      <span className="onb-btn-icon">
                        <ArrowIcon />
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="onb-back-btn"
                    onClick={goBack}
                  >
                    <BackIcon />
                    Back
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="onb-card-foot">
            <span>Kyma</span>
            <span className="onb-foot-dot" />
            <span>Local library + online streaming</span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OnboardingPage;
