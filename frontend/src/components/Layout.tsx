import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ComposeModal from "./ComposeModal";

export default function Layout() {
  const [composeOpen, setComposeOpen] = useState(false);
  // Incrementing this triggers Sidebar to re-fetch counts after a successful schedule
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScheduled = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      {/* ── Fixed 260px sidebar — never shrinks ─────────────── */}
      <Sidebar
        onCompose={() => setComposeOpen(true)}
        refreshKey={refreshKey}
      />

      {/* ── Main content — fills remaining width ─────────────── */}
      <main
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Outlet />

        {composeOpen && (
          <ComposeModal
            onClose={() => setComposeOpen(false)}
            onScheduled={handleScheduled}
          />
        )}
      </main>
    </div>
  );
}
