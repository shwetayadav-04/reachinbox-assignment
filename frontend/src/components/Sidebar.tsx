import { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Clock, Send, ChevronDown, User as UserIcon, Activity } from "lucide-react";
import { getScheduledEmails, getSentEmails } from "../api/client";
import { useAuth } from "./AuthContext";

export default function Sidebar({
  onCompose,
  refreshKey = 0,
}: {
  onCompose: () => void;
  refreshKey?: number;
}) {
  const { user, logout } = useAuth();
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);

  const fetchCounts = useCallback(async () => {
    try {
      const [scheduled, sent] = await Promise.all([
        getScheduledEmails(1, 1),
        getSentEmails(1, 1),
      ]);
      setScheduledCount(scheduled.meta?.total ?? 0);
      setSentCount(sent.meta?.total ?? 0);
    } catch {
      // ignore
    }
  }, []);

  // Re-fetch counts on mount, every 15s, AND whenever refreshKey changes
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 15_000);
    return () => clearInterval(interval);
  }, [fetchCounts, refreshKey]);

  return (
    <aside
      style={{
        /* Figma: w=260px, flex-shrink=0, border-right=1px */
        width: "260px",
        minWidth: "260px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #E5E7EB",
        /* Figma padding: top 20px, right 16px, bottom 8px, left 8px */
        padding: "20px 16px 8px 8px",
        boxSizing: "border-box",
      }}
    >
      {/* ── Logo ───────────────────────────────────────────── */}
      <div style={{ paddingLeft: "8px", marginBottom: "12px" }}>
        <h1
          onClick={() => navigate("/")}
          style={{
            fontSize: "28px",
            fontWeight: 900,
            letterSpacing: "-1px",
            color: "#111827",
            cursor: "pointer",
            lineHeight: 1,
            fontFamily: "'Arial Black', Arial, sans-serif",
            userSelect: "none",
            margin: 0,
            padding: 0,
          }}
        >
          ONB
        </h1>
      </div>

      {/* ── Profile block ──────────────────────────────────── */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            textAlign: "left",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px 8px",
            borderRadius: "8px",
            marginBottom: "12px",
          }}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <UserIcon size={16} color="#9CA3AF" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#111827",
                margin: 0,
                lineHeight: "1.2",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.name || "User"}
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "#9CA3AF",
                margin: 0,
                marginTop: "1px",
                lineHeight: "1.2",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email || ""}
            </p>
          </div>
          <ChevronDown size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
        </button>

        {profileOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "8px",
              width: "calc(100% - 8px)",
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              border: "1px solid #E5E7EB",
              zIndex: 50,
              padding: "4px",
            }}
          >
            <button
              onClick={() => {
                setProfileOpen(false);
                logout();
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                textAlign: "left",
                fontSize: "13px",
                color: "#EF4444",
                background: "none",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FEF2F2")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent")}
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {/* ── Compose button ─────────────────────────────────── */}
      <div style={{ paddingLeft: "4px", paddingRight: "4px", marginBottom: "20px" }}>
        <button
          onClick={onCompose}
          style={{
            width: "100%",
            padding: "7px 0",
            borderRadius: "999px",
            border: "1.5px solid #10B981",
            color: "#10B981",
            backgroundColor: "#FFFFFF",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F0FDF4")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFFFFF")
          }
        >
          Compose
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#9CA3AF",
            margin: 0,
            marginBottom: "4px",
            paddingLeft: "8px",
          }}
        >
          CORE
        </p>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <NavLink
            to="/scheduled"
            style={{ textDecoration: "none" }}
          >
            {({ isActive }) => (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 8px",
                  borderRadius: "8px",
                  backgroundColor: isActive ? "#D1FAE5" : "transparent",
                  color: isActive ? "#059669" : "#6B7280",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                }}
              >
                <Clock size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Scheduled</span>
                <span style={{ fontSize: "12px", fontWeight: 500, tabularNums: true } as React.CSSProperties}>
                  {scheduledCount}
                </span>
              </div>
            )}
          </NavLink>

          <NavLink
            to="/sent"
            style={{ textDecoration: "none" }}
          >
            {({ isActive }) => (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 8px",
                  borderRadius: "8px",
                  backgroundColor: isActive ? "#D1FAE5" : "transparent",
                  color: isActive ? "#059669" : "#6B7280",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                }}
              >
                <Send size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Sent</span>
                <span style={{ fontSize: "12px", fontWeight: 500 }}>
                  {sentCount}
                </span>
              </div>
            )}
          </NavLink>

          <NavLink
            to="/queue"
            style={{ textDecoration: "none" }}
          >
            {({ isActive }) => (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 8px",
                  borderRadius: "8px",
                  backgroundColor: isActive ? "#D1FAE5" : "transparent",
                  color: isActive ? "#059669" : "#6B7280",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                }}
              >
                <Activity size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Queue</span>
              </div>
            )}
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}