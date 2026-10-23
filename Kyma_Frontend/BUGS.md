# Kyma Frontend Bug Audit

Audited on 2026-10-23 against commit `24decaa` plus the current working tree.
Scope: `Kyma_Frontend/src` with backend references where frontend behavior depends on the Rust side.
Line numbers are from the audited working tree. This file lists suspected bugs, not style nits.

Severity:
- **Critical** — user-visible data loss or a core feature is fundamentally wrong.
- **High** — common workflow is broken or can get permanently stuck.
- **Medium** — race/error-handling bug that affects a feature intermittently or under failure.
- **Low** — narrow edge case, latent bug, or maintenance/memory issue.

---

## Critical

### BUG-001 — Explore likes are toggled twice and end up out of sync

**Where**
- `src/presentation/pages/ExplorePage.tsx:129-140`
- `src/presentation/stores/libraryStore.ts:54-131`

**Problem**
`ExplorePage.handleLike` calls `toggleLike(...)` from the library store, then calls `tauriCommands.toggleLike(...)` directly. The store already performs the backend toggle, so the backend is toggled twice: once by the store and once by the page. The UI then forces `liked` to `!song.liked`.

Example: liking a track calls the backend twice. The first call adds the like, the second removes it. The UI still shows the track as liked. Reloading the page or restarting the app reveals the like is gone. The inverse happens when unliking.

The store toggle is also fire-and-forget (`libraryStore.ts:126-130`), so a failed request is only logged and the optimistic UI state is never rolled back.

**Fix**
- Remove the direct `tauriCommands.toggleLike` call from `ExplorePage.handleLike`.
- Let `useLibraryStore.toggleLike` own persistence.
- Make `toggleLike` return a promise (or accept a completion callback), and roll back on failure.

---

### BUG-002 — Local song IDs change on every scan, detaching likes and creating duplicates

**Where**
- `Kyma_Backend/src/models/song.rs:18-22`
- `Kyma_Backend/src/commands/metadata.rs:7-9`
- `Kyma_Backend/src/commands/library.rs:76-78`
- `src/infrastructure/TauriSongRepository.ts:46-50`
- `src/presentation/hooks/useLibrary.ts:97-125`

**Problem**
Every local song gets `uuid::Uuid::new_v4()`. The ID is regenerated every time metadata is extracted, and the backend library is scanned again when the in-memory library is empty (for example at app startup). Likes and play history are keyed by that random ID.

After a new scan, an existing local file has a new ID. `useLibrary` then loads liked tracks from `liked_songs` and re-adds the old liked copies because their IDs are no longer present in the scanned library. This produces duplicate entries: the newly scanned song is not marked liked, and the old liked snapshot appears as a separate song. Even if duplicates are hidden, the like is no longer associated with the playable library row.

**Fix**
- Derive local song IDs from a stable value, preferably a hash of the canonical file path.
- Add a migration path that matches existing `liked_songs.path` values to the new stable IDs.
- If IDs must stay random, reconcile likes by `path` when merging liked songs into the library.

---

### BUG-003 — Async track resolution is not cancellable and can override newer playback

**Where**
- `src/presentation/hooks/useResolveAndPlay.ts:8-61`

**Problem**
`resolveAndPlaySong` has no request token or generation guard. If the user selects track A, then quickly selects track B:

1. A starts a YouTube search.
2. B starts another search and displays B.
3. A's search resolves later and calls `setCurrentSong(A)`.
4. A replaces B, even though A is no longer the user's selection.

The same race applies to failure: if A fails after B has started, A executes `currentSong: null` and clears B's player state. It also calls `setQueue` after resolution, which can overwrite a queue that changed while the search was in flight.

The same function is used from `LibraryPage`, `ExplorePage`, and player fallback paths, so the race is reachable from several places.

**Fix**
- Add a module-level or store-level resolution request ID.
- Only apply `setCurrentSong`, queue updates, and failure cleanup if the request is still current.
- Ideally pass an `AbortSignal` through the search path.

---

### BUG-004 — Home's Last.fm data never loads after settings arrive

**Where**
- `src/presentation/stores/homeDataStore.ts:54-55`
- `src/presentation/pages/Home/HomePage.tsx:156-168`

**Problem**
`HomePage` initially calls `loadAll("", "", topLocalArtist)` because `lastfmKey` and `lastfmUser` start as empty strings. `loadAll` sets `loaded: true` after finishing. When the settings promises resolve, the effect runs again with real Last.fm credentials, but `loadAll` immediately returns because `get().loaded` is true.

Result: the weekly Last.fm chart and similar-artists sections are skipped on the first mount and all later mounts, because the store is never invalidated. The initial empty-credential call wins the race.

**Fix**
- Do not call `loadAll` until settings have been loaded.
- Or track the parameters used for the last load and reload when `lastfmKey`, `lastfmUser`, or `topLocalArtist` changes.
- A simple fix is a `loadedFor` key such as `${lastfmKey}:${lastfmUser}:${topLocalArtist}` instead of a boolean.

---

## High

### BUG-005 — Playlist-detail likes are local-only and start empty

**Where**
- `src/presentation/pages/PlaylistDetailPage.tsx:17`
- `src/presentation/pages/PlaylistDetailPage.tsx:82-89`
- `src/presentation/pages/PlaylistDetailPage.tsx:231-245`

**Problem**
`likedSongs` is initialized to an empty `Set`. `toggleLike` only mutates that component-local set. It never reads existing likes from the library store and never persists a like to the backend. Every playlist page render starts with all tracks unliked, and clicking the heart has no effect outside the current component instance.

**Fix**
- Seed the set from the library store or `getLikedSongs`.
- Call the shared `useLibraryStore.toggleLike` instead of only mutating local state.

---

### BUG-006 — Resume ignores the saved playback position and always starts at zero

**Where**
- `src/App.tsx:15-22`
- `Kyma_Backend/src/commands/player.rs:73-77`

**Problem**
The backend returns a `ResumeState` containing `position` and `is_playing`. The frontend reads `state.song` and checks only `state.song.duration > 0`, then calls `setCurrentSong(state.song)`. `setCurrentSong` resets progress to zero and starts playing. `state.position` is ignored entirely.

As a result, "resume" always restarts the track from the beginning. `setCurrentSong` also sets `isPlaying: true`, so a session that was paused resumes playback unconditionally. The backend currently hard-codes `is_playing: false` at `player.rs:76`, so the frontend cannot honor the saved playing state even if it wanted to.

**Fix**
- Carry the resume position into `playSong` and seek after the track has loaded.
- Honor `is_playing` when deciding whether to start playback.
- Return the actual saved playing state from the backend, or remove the field and document that resume always starts paused.

---

### BUG-007 — Re-selecting the same song while it is loading can leave the player stuck

**Where**
- `src/presentation/hooks/usePlayer.ts:88-95`
- `src/presentation/hooks/usePlayer.ts:280-292`

**Problem**
`playSong` increments `generationRef.current` and clears `playLockRef` before checking whether the requested song is already loading:

```ts
const generation = ++generationRef.current;
playLockRef.current = false;

if (song.id === lastPlayedId.current) return;
if (song.id === pendingPlayId.current) return;
```

If the user double-clicks a song while it is resolving, the second call invalidates the first call's generation, then returns because `lastPlayedId`/`pendingPlayId` match. The original async call later sees `generationRef.current !== generation` and returns without running its cleanup (the `finally` block is also guarded by the same generation check). `pendingPlayId`, `lastPlayedId`, `playLockRef`, and possibly `isLoading` remain set.

Subsequent attempts to play that same song return at the `lastPlayedId` check. The UI can remain in a loading state until another track is selected.

**Fix**
- Perform the same-song/idempotency checks before incrementing the generation.
- If a call is intentionally ignored, make sure it does not invalidate the in-flight request.
- Do not set `lastPlayedId` until the load succeeds, or explicitly clear pending state when a duplicate request is rejected.

---

### BUG-008 — Albums infinite scroll does not attach to the initial result grid

**Where**
- `src/presentation/pages/AlbumsPage.tsx:391-407`
- `src/presentation/pages/AlbumsPage.tsx:1029-1033`

**Problem**
The effect runs when `hasMore`, `loadingMore`, or `page` changes. At mount, the results grid is not rendered because no albums have loaded yet, so `gridRef.current` is `null` and the effect returns without attaching a listener. When `loadAlbums` later sets the albums, none of the effect dependencies change (`loading` is not a dependency), so the listener is still never attached.

Infinite scrolling only starts working after some unrelated state change causes the effect to run again. A fresh search that returns enough albums for pagination will not load page 2 by scrolling.

**Fix**
- Attach the listener when the grid actually mounts, for example with a callback ref.
- Add `albums.length` and `loading` to the dependencies, or use an `IntersectionObserver` on a sentinel inside the grid.

---

### BUG-009 — ListenBrainz scrobbles are sent at playback start

**Where**
- `src/presentation/hooks/usePlayer.ts:382`
- `src/presentation/hooks/usePlayer.ts:400-401`
- `src/presentation/hooks/usePlayer.ts:445-469`

**Problem**
The scrobble threshold is calculated from `store.duration`:

```ts
position >= Math.min(store.duration / 2, 240)
```

`store` is a snapshot taken at line 382. On the first playback update, `store.duration` is still `0`. Line 400-401 updates the store to the real duration, but the local `store` object still has `duration: 0`. The threshold therefore becomes `Math.min(0, 240) === 0`, which is always true once `duration > 0`.

The result is that a track is scrobbled to ListenBrainz immediately (or on the first progress callback) instead of after half the track or four minutes. Listening statistics become heavily inflated.

**Fix**
- Use the `duration` argument from the playback callback, or re-read `usePlayerStore.getState().duration`, instead of the stale snapshot.
- Consider also waiting for playback to actually advance before scrobbling.

---

### BUG-010 — Opening the add-to-playlist menu also plays the song

**Where**
- `src/presentation/components/Library/SongRow.tsx:343-347`
- `src/presentation/components/Library/SongRow.tsx:504-511`
- `src/presentation/components/Library/SongRow.tsx:550-555`

**Problem**
The row has `onClick={() => onPlay(song)}`. The "Add to playlist" trigger stops propagation only in `onMouseDown`. A real mouse interaction still produces a `click` event, which bubbles to the row and starts playback. The playlist menu items also stop only `onMouseDown`, so choosing a playlist can play the song as well.

The "More options" queue menu avoids this by stopping both `onMouseDown` and `onClick` (`SongRow.tsx:585-594`), which confirms the intended pattern is missing from the playlist controls.

**Fix**
- Stop propagation in `onClick` on the playlist trigger and on the menu container/items.
- Alternatively, open the menu on `onClick` rather than `onMouseDown`.

---

### BUG-011 — A failed YouTube search leaves the top-bar spinner running forever

**Where**
- `src/presentation/stores/youtubeStore.ts:90-97`
- `src/presentation/components/Layout/TopBar.tsx:99-102`

**Problem**
On a successful search, the store sets `lastQuery: trimmed`. On an error, it sets `error` and `isSearching: false` but leaves `lastQuery` unchanged. `TopBar` computes:

```ts
ytSearching || ytLastQuery.toLowerCase() !== normalizedTerm
```

After a failure, `ytSearching` is false but `lastQuery` still refers to the old query, so this expression stays true forever for the failed term. The top bar shows a permanent "searching" state and never displays the empty/error state.

**Fix**
- Set `lastQuery: trimmed` on failure as well, or add an `error`/`lastAttemptedQuery` field and include it in the loading calculation.
- Clear stale results when starting a new search.

---

### BUG-012 — Seeking into the last two seconds disables auto-advance

**Where**
- `src/presentation/hooks/usePlayer.ts:569-596`
- `src/presentation/hooks/usePlayer.ts:472-500`

**Problem**
`seek` sets `songEndHandled.current = true` and then, after 300 ms, only clears it when `currentProgress < duration - 2`:

```ts
if (duration <= 2 || currentProgress < duration - 2) {
  songEndHandled.current = false;
}
```

If the user seeks to within the final two seconds, the flag remains `true`. When playback actually reaches the end, the end handler checks `!songEndHandled.current`, sees `false`, and never calls `handleNext`. The player stops at the end of the track instead of advancing.

**Fix**
- Reset `songEndHandled` once the seek has settled, regardless of target position.
- Or track a separate "seek target reached" state instead of reusing the end-of-track flag.

---

## Medium

### BUG-013 — Explore category requests can overwrite a newer category

**Where**
- `src/presentation/pages/ExplorePage.tsx:55-61`
- `src/presentation/pages/ExplorePage.tsx:63-105`

**Problem**
`loadCategory` has no request ID or cancellation. If the user switches categories quickly, an older Deezer request can resolve after the newer one and call `setTracks` with the old category's data. The page then shows tracks that do not match the selected category. `setLoading(false)` from the stale request can also hide the loading state for the current request.

**Fix**
- Add a `categoryRequestId` ref and only apply results when the request is current.
- Optionally use `AbortController` for the Deezer request.

---

### BUG-014 — SoundCloud search results can arrive out of order

**Where**
- `src/presentation/pages/SearchPage.tsx:141-188`

**Problem**
The debounce cancels only the timer. Once `searchSoundcloud(query)` has been invoked, changing the query cannot cancel it. An older response can resolve after a newer response and overwrite `scSongs` with results for the previous query. The same issue applies to the loading flag.

**Fix**
- Use a monotonically increasing request ID, as the YouTube store already does.
- Ignore responses whose ID is no longer current.

---

### BUG-015 — A stats failure can permanently wedge Home data loading

**Where**
- `src/presentation/stores/homeDataStore.ts:125-141`

**Problem**
Most sections have `try/catch` blocks, but `getWeeklyStats` is awaited unprotected:

```ts
const stats = (await tauriCommands.getWeeklyStats()) as any;
set({ weeklyStats: stats });
```

If that command rejects, `loadAll` exits before `set({ loading: false, loaded: true })`. The store remains `loading: true`, and the guard at lines 54-55 causes every later `loadAll` call to return immediately. Home data can never recover without a full reload.

**Fix**
- Wrap the stats call in `try/catch`.
- Use `try/finally` to always clear `loading`.
- Only set `loaded` when the load actually completed, and allow retries after failure.

---

### BUG-016 — The library "Plays" sort chip does nothing

**Where**
- `src/presentation/components/Library/LibraryView.tsx:13`
- `src/presentation/components/Library/LibraryView.tsx:108-117`
- `src/presentation/stores/libraryStore.ts:163-177`

**Problem**
The UI accepts `"Plays"` and sets `activeSort` to `"plays"`, but `filterAndSort` has cases only for `title`, `artist`, `album`, and `duration`. Selecting Plays leaves the previous order unchanged.

**Fix**
- Add a `plays` case, for example `result.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))`.

---

### BUG-017 — Settings load/save fail partially with no feedback

**Where**
- `src/presentation/pages/Settings/index.tsx:110-160`
- `src/presentation/pages/Settings/index.tsx:175-213`

**Problem**
`loadSettings` performs many sequential `getSetting` awaits with no surrounding `try/catch`. If one call rejects, the remaining settings are never loaded and the rejection surfaces as an unhandled promise rejection. `handleSave` has the same pattern in reverse: a failure in the middle leaves a partially saved configuration, does not report the error, and never reaches `setSaved(true)`.

**Fix**
- Wrap both functions in `try/catch`.
- Load settings with `Promise.all` where possible.
- Save settings either with a single batch command or with `Promise.allSettled`, then report which keys failed.

---

### BUG-018 — Queue writes are optimistic and silently ignored on backend failure

**Where**
- `src/presentation/stores/queueStore.ts:62-72`
- Callers such as `src/presentation/components/Library/LibraryView.tsx:83-85` and `src/presentation/pages/Home/HomePage.tsx:97-99`

**Problem**
`setQueue` immediately updates the frontend store, then awaits `tauriCommands.setQueue(songs)`. Most callers do not await or catch the returned promise. If the backend write fails, the frontend shows a queue that the backend does not have. A later `_hydrate` or app restart replaces the queue with the backend version, making songs silently disappear from the queue.

**Fix**
- Await `setQueue` in playback flows and surface failures.
- Roll back the local queue on backend failure, or make the backend queue the source of truth with a visible error state.

---

### BUG-019 — Album artwork blob URLs are never revoked

**Where**
- `src/infrastructure/TauriSongRepository.ts:106-112`

**Problem**
Every call to `mapSong` creates a new `URL.createObjectURL(blob)` for embedded artwork. The URLs are stored in songs and never revoked. Reloads, rescans, and repeated library loads therefore keep allocating blob URLs for the lifetime of the webview, causing a steady memory leak.

**Fix**
- Keep track of generated object URLs and revoke them when the song is replaced or the repository/component unmounts.
- Or convert embedded artwork to a data URL once and cache it.

---

### BUG-020 — YouTube `loadMore` can append stale results

**Where**
- `src/presentation/stores/youtubeStore.ts:99-116`
- `src/presentation/stores/youtubeStore.ts:85-89`

**Problem**
`loadMore` captures `lastQuery`, `offset`, and `results` before the await. If a new search completes during the request, the response is appended to the old `results` snapshot, overwriting the newer search results. The offset also is not reset in the success path of `search`, so a later `loadMore` can start from a stale offset. `loadMore` currently has no active callers, so this is latent rather than immediately reproducible from the current UI.

**Fix**
- Add a request ID and verify it before applying the append.
- Reset `offset` to `0` on a new search.
- Merge against `get().results` rather than the captured snapshot.

---

## Low

### BUG-021 — Settings cache keeps `null` forever

**Where**
- `src/services/tauriBridge.ts:37`
- `src/services/tauriBridge.ts:233-247`

**Problem**
`getSetting` caches the request promise. If the setting does not exist, the resolved `null` stays cached until `setSetting` is called for that exact key. Changes made outside `setSetting` (for example by another layer or an import routine) are invisible for the rest of the session.

**Fix**
- Do not cache `null` results, or cache them with a short TTL.
- Provide an explicit invalidation method.

---

### BUG-022 — Download state is permanent even if the file disappears

**Where**
- `src/presentation/components/Library/SongRow.tsx:78-82`
- `src/presentation/components/Library/SongRow.tsx:145-152`

**Problem**
A successful download writes `localStorage["dl-<videoId>"] = "true"`. On mount the row trusts that flag without checking that the file still exists. If the user deletes the downloaded file, changes the download folder, or clears app storage incompletely, the UI still shows the downloaded checkmark and the download button is disabled.

**Fix**
- Verify downloaded state against the backend/file system.
- Store the actual path or a backend-provided downloaded flag rather than only a local boolean.

---

### BUG-023 — Failed lyrics lookups are cached forever

**Where**
- `src/presentation/components/Player/NowPlayingPanel.tsx:64-65`
- `src/presentation/components/Player/NowPlayingPanel.tsx:102-111`
- `src/presentation/components/Player/NowPlayingPanel.tsx:129-131`

**Problem**
When LRCLIB returns no match or a failed search, `null` is written into the persistent lyrics cache. A later request for the same title/artist returns that cached `null` immediately, even after lyrics become available or a transient network failure has passed. The only recovery is clearing localStorage.

**Fix**
- Do not cache negative results permanently; use a short TTL or only cache them for the session.
- Differentiate "not found" from "temporary failure".

---

### BUG-024 — Tray listener cleanup races with the async import

**Where**
- `src/presentation/hooks/usePlayer.ts:513-549`

**Problem**
The effect imports `@tauri-apps/api/event` asynchronously. If the component unmounts before the import resolves, the cleanup runs with `unlisten1`/`unlisten2` still `null`, then the import resolves and registers listeners that are never removed. This leaks listeners across player instances/hot reloads.

**Fix**
- Track a `cancelled` flag and immediately unlisten if the effect has already cleaned up.
- Or use a synchronous import if the API supports it.

---

### BUG-025 — Previous from the first queue item wraps even with repeat off

**Where**
- `src/presentation/stores/queueStore.ts:113-120`

**Problem**
`getPrevSong` always wraps to the end of the queue when `currentIndex` is 0, regardless of `repeatMode`. With repeat off, pressing Previous on the first track jumps to the last track instead of stopping or doing nothing.

**Fix**
- Pass `repeatMode` into `getPrevSong`, matching `getNextSong`, and return `null` at the start when repeat is off.

---

## Suggested fix order

1. **BUG-001, BUG-002, BUG-005** — like persistence and song identity; these cause silent data loss.
2. **BUG-003, BUG-007** — playback races; these make track selection unreliable.
3. **BUG-004, BUG-006, BUG-009** — Home/resume/scrobble correctness.
4. **BUG-008, BUG-010, BUG-011, BUG-012** — broken common interactions.
5. Medium and Low items as part of normal hardening.

No source files were changed as part of this audit.
