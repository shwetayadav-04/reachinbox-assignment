import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Search, Filter, RefreshCw, Loader2 } from "lucide-react";
import { getScheduledEmails, getSentEmails, searchEmails } from "../api/client";
import EmailList from "../components/EmailList";
import type { Email, EmailStatus } from "../types";

export default function Dashboard() {
  const location = useLocation();
  const isSent = location.pathname === "/sent";
  const status: EmailStatus = isSent ? "SENT" : "SCHEDULED";

  const [emails, setEmails] = useState<Email[]>([]);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      if (debouncedQuery.trim()) {
        const result = await searchEmails(debouncedQuery.trim(), status, page, 20);
        setEmails(result.data);
        setTotalPages(result.meta?.totalPages ?? 1);
      } else {
        const fetcher = isSent ? getSentEmails : getScheduledEmails;
        const result = await fetcher(page, 20);
        setEmails(result.data);
        setTotalPages(result.meta?.totalPages ?? 1);
      }
    } catch (err) {
      console.error("Failed to fetch emails:", err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [isSent, status, page, debouncedQuery]);

  // Reset pagination/search whenever the tab changes
  useEffect(() => {
    setPage(1);
    setSearchQuery("");
    setDebouncedQuery("");
  }, [isSent]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (!filterOpen) return;
    const handler = () => setFilterOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [filterOpen]);

  const sorted = [...emails].sort((a, b) => {
    const timeA = new Date(a.scheduledAt ?? a.createdAt).getTime();
    const timeB = new Date(b.scheduledAt ?? b.createdAt).getTime();
    return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* ── Top bar ────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 24px",
          backgroundColor: "#FFFFFF",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", width: "360px", flexShrink: 0 }}>
          {loading && searchQuery !== debouncedQuery ? (
            <Loader2
              size={14}
              color="#9CA3AF"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                animation: "spin 1s linear infinite",
                pointerEvents: "none",
              }}
            />
          ) : (
            <Search
              size={14}
              color="#9CA3AF"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          )}
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              paddingLeft: "36px",
              paddingRight: "16px",
              paddingTop: "8px",
              paddingBottom: "8px",
              borderRadius: "8px",
              backgroundColor: "#F3F4F6",
              border: "none",
              outline: "none",
              fontSize: "13px",
              color: "#374151",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filter */}
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen(!filterOpen);
            }}
            style={{
              padding: "6px",
              borderRadius: "6px",
              border: "none",
              background: filterOpen ? "#F3F4F6" : "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Filter size={16} color="#9CA3AF" strokeWidth={1.5} />
          </button>

          {filterOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "4px",
                width: "140px",
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                border: "1px solid #E5E7EB",
                zIndex: 50,
                padding: "4px",
              }}
            >
              {(["newest", "oldest"] as const).map((order) => (
                <button
                  key={order}
                  onClick={() => {
                    setSortOrder(order);
                    setFilterOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: "13px",
                    fontWeight: sortOrder === order ? 600 : 400,
                    color: "#374151",
                    background: sortOrder === order ? "#F9FAFB" : "none",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {order === "newest" ? "Newest first" : "Oldest first"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={fetchEmails}
          disabled={loading}
          style={{
            padding: "6px",
            borderRadius: "6px",
            border: "none",
            background: "none",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <RefreshCw
            size={16}
            color="#9CA3AF"
            strokeWidth={1.5}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
        </button>
      </header>

      {/* ── Email list ─────────────────────────────────────── */}
      <EmailList emails={sorted} loading={loading} status={status} />

      {/* ── Pagination ─────────────────────────────────────── */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 24px",
            borderTop: "1px solid #F3F4F6",
            backgroundColor: "#FFFFFF",
            flexShrink: 0,
          }}
        >
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            Prev
          </button>
          <span style={{ fontSize: "13px", color: "#9CA3AF" }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.4 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}