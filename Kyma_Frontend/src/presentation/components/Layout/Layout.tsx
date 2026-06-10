import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import PlayerBar from "../Player/PlayerBar";
import { logger } from "../../../services/logger";

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarClose = () => {
    logger.logUI("Layout", "sidebar_close", {});
    setSidebarOpen(false);
  };

  const handleSidebarOpen = () => {
    logger.logUI("Layout", "sidebar_open", {});
    setSidebarOpen(true);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          className={sidebarOpen ? "sidebar--open" : undefined}
          onOpen={handleSidebarOpen}
          onClose={handleSidebarClose}
        />

        <div
          className={`sidebar-backdrop ${sidebarOpen ? "sidebar-backdrop--visible" : ""}`}
          onClick={handleSidebarClose}
        />
        <div className="main">
          <Outlet />
        </div>
      </div>
      <PlayerBar />
    </div>
  );
};

export default Layout;
