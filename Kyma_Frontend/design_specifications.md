# Music Streaming App - UI/UX Design Specifications

This document outlines the design requirements for the music streaming application based on the provided concept images.

## 1. Global Design System

### 1.1. Color Palette
*   **Background (Main):** Very dark gray/black (approx. `#0A0A0A` to `#121212`).
*   **Background (Surface/Cards):** Slightly lighter gray for elevation (approx. `#181818` to `#282828`).
*   **Primary Accent:** Neon Green (approx. `#39FF14` or `#1ED760`). Used for active states, play buttons, borders, and highlights.
*   **Text (Primary):** Pure White (`#FFFFFF`) for headers and primary information.
*   **Text (Secondary):** Light Gray (`#B3B3B3`) for sub-labels, durations, and inactive states.
*   **Gradients:** Used on playlist covers and genre cards (e.g., purple/blue, red/orange, green/teal).

### 1.2. Typography
*   **Font Family:** Clean, modern Sans-Serif (e.g., Circular, Inter, or Roboto).
*   **Weights:** 
    *   Bold (700) for Page Headers (e.g., "Good Evening", "Browse").
    *   Semi-Bold (600) for Card Titles and Track Names.
    *   Regular (400) for secondary text and artist names.

### 1.3. Global Layout Structure
The application uses a classic 3-pane layout:
1.  **Left Sidebar (Fixed):** Navigation and Library management.
2.  **Bottom Player (Fixed):** Media controls and current track information.
3.  **Main Content Area (Scrollable):** Dynamic content based on the active page, with a sticky Top Bar.

---

## 2. Component Specifications

### 2.1. Left Sidebar
*   **Width:** Fixed (e.g., 250px).
*   **Content:**
    *   Menu Icon (top left).
    *   "YOUR LIBRARY" section: Made For You, Recently Played, Liked Songs, Albums, Artists, Podcasts.
    *   "PLAYLISTS" section.
    *   "New Playlist" button (bottom of sidebar, featuring a green `+` icon).
*   **Styling:** Active links highlighted in Neon Green.

### 2.2. Bottom Player Bar
*   **Height:** Fixed (e.g., 90px).
*   **Left Section:** Current track thumbnail (square), Track Title (white), Artist Name (gray).
*   **Center Section (Controls):** Shuffle, Previous, Play/Pause (circular outline), Next, Repeat. Below controls: Progress bar (Neon Green for elapsed time) with current time and total duration.
*   **Right Section:** Lyrics icon, Queue icon, Devices icon, Volume icon, and Volume slider.

### 2.3. Top Bar (Main Content Area)
*   **Left:** Back/Forward navigation arrows.
*   **Center:** Main navigation links (Home, Browse, Radio) with an underline indicator for the active tab.
*   **Right:** Search bar (icon + underline), User Profile (Name + Avatar).

---

## 3. Page Layouts

### 3.1. Home Page
*   **Header:** Large greeting (e.g., "Good Evening, Julie").
*   **Sections:** 
    *   **Recently Played:** Small square cards with album art and titles.
    *   **Quick Mixes:** Larger, wider cards with abstract gradient backgrounds and a prominent green play button on hover.
    *   **Recommended Albums:** Square cards featuring artist/album images, bold title, and play count.

### 3.2. Browse Page
*   **Sub-navigation:** New Releases, Discover (Active), Charts, Moods & Genres, Podcasts.
*   **Featured Banner:** Large, wide rectangular banner for "Featured Release" with a background image, bold title, description, and a bright green CTA button ("LISTEN NOW").
*   **Popular Genres:** Grid of rectangular cards with rounded corners, featuring vibrant gradient backgrounds and bold, centered white text (e.g., Alternative, Electronic, Focus).
*   **Trending Near You:** Row of smaller square cards for local hits.

### 3.3. Your Library Page
*   **Layout:** Split main content area (2/3 Grid, 1/3 List).
*   **Sub-navigation:** Playlists, Podcasts, Artists (Active), Albums.
*   **Left Partition (Grid):**
    *   Circular avatars for Artists.
    *   Square cards for Playlists (with gradient covers or custom art).
    *   "Add New" dashed-border cards for creating new entities.
    *   Hover state: Highlighted item gets a neon green glowing border and a play button overlay.
*   **Right Partition (Popular Songs):**
    *   List view of tracks.
    *   Columns: Index (#), Track Image + Title/Artist, Audio Visualizer/Duration, Heart Icon (Green if liked).

### 3.4. Artist Page (e.g., Billie Eilish)
*   **Hero Section:** Large background image of the artist fading into the dark background. Huge, bold typography for the Artist's name.
*   **Action Buttons:** Primary green "PAUSE/PLAY" button, outlined "FOLLOW" button, circular "..." options button.
*   **Sub-navigation:** Overview (Active), About, Concerts.
*   **Content:**
    *   **Popular By [Artist]:** List view of top tracks (similar to Library list view) showing play counts.
    *   **Latest Release:** Square card showing the newest album/single.
    *   **Artist's Pick:** Square card highlighting a specific playlist or track.