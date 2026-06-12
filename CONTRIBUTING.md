# Contributing to Kyma

Kyma is an open source project and contributions are genuinely welcome whether that's a bug fix, a new feature, a typo correction, or just a well-written issue report. Every bit helps.

---

## 🐛 Reporting Bugs

Before opening a new issue, check if it already exists in [Issues](https://github.com/Neontoshi/Kyma/issues).

If it's new, open a bug report and include:

- **OS & version**  e.g. Ubuntu 24.04, Windows 11, macOS 14
- **Steps to reproduce**  the exact sequence that triggers the bug
- **Expected behaviour**  what you thought would happen
- **Actual behaviour**  what actually happened
- **Logs**  if available, attach logs from:
  - Linux: `~/.local/share/Kyma/logs/`
  - Windows: `%APPDATA%\Kyma\logs\`
  - macOS: `~/Library/Logs/Kyma/`

The more detail you provide, the faster it gets fixed.

---

## 💡 Suggesting Features

Feature ideas are welcome. When suggesting one:

1. Check that it doesn't already exist or have an open request
2. Describe what the feature does and the problem it solves
3. Include mockups or examples if you have them

Keep in mind Kyma's core principle: privacy-first, no telemetry, data stays local. Features that require phoning home won't be accepted.

---

## 🔧 Development Setup

### Prerequisites

- **Rust** (latest stable) [rustup.rs](https://rustup.rs)
- **Node.js** v18+
- **yt-dlp** for streaming support

### Clone & run

```bash
git clone --recursive git@github.com:Neontoshi/Kyma.git
cd Kyma
npm install
npm run tauri dev
```

### Build for production

```bash
npm run tauri build
```

---

## 📐 Code Style

- Rust: follow standard `rustfmt` formatting  run `cargo fmt` before committing
- TypeScript: ESLint is configured, run `npm run lint` before pushing
- Commits: keep them focused and descriptive one logical change per commit

---

## 🔁 Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes with clear, focused commits
3. Test locally on your platform before opening a PR
4. Open the PR with a clear description of what changed and why
5. A maintainer will review and respond as soon as possible

---

## 📄 License

By contributing to Kyma, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

*Thank you for taking the time to contribute. It means a lot.*
