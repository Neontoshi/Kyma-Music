// Re-export all types from entities
export * from "../core/entities/Song";
export * from "../core/entities/Album";
export * from "../core/entities/Playlist";

// Additional UI types
export interface UIConfig {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  libraryView: "list" | "grid";
}
