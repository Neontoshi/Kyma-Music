# Kyma Frontend — Needs To Be Fixed

Tracking list of code errors and duplication found during review.
Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

## Errors / bugs

- [x] **1. ESLint is disabled** — `.eslintrc.json` is empty (0 bytes); `npx eslint` crashes with
  `Cannot read config file ... Unexpected end of JSON input`. Populate a valid config so lint runs.
- [x] **2. Album infinite scroll appends duplicates** — `presentation/pages/AlbumsPage.tsx:437`
  `loadAlbums(query, pageNum, append)` ignores `pageNum`; it calls `tauriCommands.searchAlbumsDeezer(query)`
  (`services/tauriBridge.ts:408`) and the backend (`Kyma_Backend/src/commands/metadata_providers.rs:838`)
  ignores paging (hard-coded `limit=25`). `loadMore` (`:497`) re-fetches the same page and appends it,
  and `hasMore` never becomes false. Add an offset/index through the whole call chain.
- [x] **3. Unguarded `JSON.parse` on persisted data** — `presentation/stores/userStore.ts:14`
  (corrupt `kyma_user` crashes app startup) and `presentation/pages/Settings/index.tsx:126`
  (`scan_folders` setting). Every other call site wraps this in try/catch.
- [x] **4. Uncleared timeout** — `presentation/hooks/useExplorePrefetch.ts:107`
  `setTimeout(prefetchNextBatch, 1000)` is never cleared on unmount.
- [x] **5. `@ts-ignore` masking unused params/logic** — 9 occurrences; e.g.
  `AlbumsPage.tsx:438` hides the unused `pageNum`, `:364-368`, `ArtistsPage.tsx:114`,
  `LikedPage.tsx:47`, `HomePage.tsx:76`, `UpdatesSection.tsx:21`. Remove and fix what they hide.

## Duplication

- [x] **6. `formatDuration` implemented 9×** — `ArtistsPage:115`, `PlaylistDetailPage:8`,
  `AlbumsPage:115`, `ExplorePage:33`, `AudiobooksPage:30`, `PodcastPage:33`, `usePlayer:417`,
  `useResolveAndPlay:7`, `useExplorePrefetch:11` (+ `TauriSongRepository:5`).
  `lib/formatTime.ts` already exists. Consolidate.
- [x] **7. `randomGradient` copied 7×** with 3 divergent variants — `ArtistsPage:107`,
  `ForYouPage:41`, `AlbumsPage:108`, `ExplorePage:26`, `AudiobooksPage:23`, `PodcastPage:26`,
  `PlaylistDetailPage:22`. Consolidate.
- [x] **8. Lyrics engine duplicated** — `presentation/components/Player/LyricsPane.tsx` (367 lines,
  never imported) duplicates `parseLRC`/`fetchLyrics`/`autoCalibrateOffset` from
  `NowPlayingPanel.tsx:17` (the live version). Delete `LyricsPane.tsx`.
- [x] **9. Song-object construction duplicated ~15×** — manual `{ emoji, grad, bpm:0, key:"—", ... }`
  literals across Pages/Hooks/Stores. Add a shared `makeSong()` factory.
- [x] **10. Dead files** — `lib/constants.ts` (403 lines of fake songs), `lib/storage.ts`,
  `presentation/components/ui/Button.tsx`, `presentation/components/ui/Modal.tsx`,
  `core/repositories/ILibraryRepository.ts`, `types/backendsong.ts`, and `parseDuration`
  in `lib/formatTime.ts`. Delete.
- [x] **11. API layer bypassed** — `Sidebar.tsx:159/165`, `libraryStore.ts:88`,
  `youtubeStore.ts:91/120/143`, `PlaybackSection.tsx:59` use raw dynamic `invoke()` instead of
  `services/tauriBridge.ts`. Route through the bridge.
- [x] **12. Minor dupes** — `PlayingBars` (`PlaylistDetailPage:28` vs
  `Home/sub-components/PlayingBars.tsx`); `formatTotalDuration` (`PlaylistDetailPage:14`,
  `LikedPage:8`).

## Follow-up (separate phase)

- [x] **13. Modularize page styles** — split the monolithic `styles/globals.css` into
  `styles/layout.css`, `styles/components/*.css`, and `styles/pages/*.css`. `globals.css` now holds
  only tokens, themes, resets, shared primitives, and shared keyframes.

## Notes after fix pass

- `tsc --noEmit`, `npm run build`, `cargo check`, and `eslint` all pass.
- ESLint reports 0 errors and 30 `react-hooks/exhaustive-deps` warnings. These are
  pre-existing intentional dependency omissions (mount-only effects, stable zustand
  setters). They are warnings, not failures; review individually before changing.
- `services/logger.ts` still imports `@tauri-apps/api/core` directly on purpose:
  `tauriBridge` depends on `logger`, so routing logger through the bridge would
  create a circular dependency.
