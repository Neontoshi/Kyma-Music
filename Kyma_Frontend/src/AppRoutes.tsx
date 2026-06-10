import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./presentation/components/Layout/Layout";
import PlaylistsPage from "./presentation/pages/PlaylistsPage";
import SettingsPage from "./presentation/pages/SettingsPage";
import HomePage from "./presentation/pages/HomePage";
import SongsPage from "./presentation/pages/SongsPage";
import AlbumsPage from "./presentation/pages/AlbumsPage";
import ArtistsPage from "./presentation/pages/ArtistsPage";
import LikedPage from "./presentation/pages/LikedPage";
import NowPlayingPage from "./presentation/pages/NowPlayingPage";
import ExplorePage from "./presentation/pages/ExplorePage";
import PlaylistDetailPage from "./presentation/pages/PlaylistDetailPage";
import RadioPage from "./presentation/pages/RadioPage";
import ForYouPage from "./presentation/pages/ForYouPage";
import PodcastPage from "./presentation/pages/PodcastPage";
import AudiobooksPage from "./presentation/pages/AudiobooksPage";
import SearchPage from "./presentation/pages/SearchPage";
import OnboardingPage from "./presentation/pages/OnboardingPage";
import { useUserStore } from "./presentation/stores/userStore";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const hasCompletedOnboarding = useUserStore((s) => s.hasCompletedOnboarding);
  if (!hasCompletedOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/songs" element={<SongsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/for-you" element={<ForYouPage />} />
          <Route path="/podcasts" element={<PodcastPage />} />
          <Route path="/audiobooks" element={<AudiobooksPage />} />
          <Route path="/artists/:artistName" element={<ArtistsPage />} />
          <Route path="/liked" element={<LikedPage />} />
          <Route path="/nowplaying" element={<NowPlayingPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/radio" element={<RadioPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
