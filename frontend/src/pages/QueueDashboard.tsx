import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, Clock, CheckCircle, XCircle, Loader2, Pause, Zap } from "lucide-react";
import { getQueueStats, type QueueStats, type QueueJob } from "../api/client";

const STATE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  waiting:   { bg: "#FEF9C3", color: "#854D0E", label: "Waiting"   },
  delayed:   { bg: "#E0E7FF", color: "#3730A3", label: "Delayed"   },
  active:    { bg: "#DCFCE7", color: "#166534", label: "Active"    },
  completed: { bg: "#D1FAE5", color: "#065F46", label: "Completed" },
  failed:    { bg: "#FEE2E2", color: "#991B1B", label: "Failed"    },
  paused:    { bg: "#F3F4F6", color: "#374151", label: "Paused"    },
  unknown:   { bg: "#F3F4F6", color: "#6B7280", label: "Unknown"   },
};

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flex: "1 1 160px",
        minWidth: "130px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          backgroundColor: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ margin: 0, marginTop: "4px", fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const style = STATE_STYLES[state] ?? STATE_STYLES.unknown;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
}

function formatTime(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function JobRow({ job }: { job: QueueJob }) {
  return (
    <tr
      style={{
        borderBottom: "1px solid #F3F4F6",
        transition: "background-color 0.1s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#F9FAFB")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent")
      }
    >
      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "11px", color: "#6B7280", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {job.jobId}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <StateBadge state={job.state} />
      </td>
      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151", textAlign: "center" }}>
        {job.attemptsMade}
      </td>
      <td style={{ padding: "12px 16px", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
        {formatTime(job.timestamp)}
      </td>
      <td style={{ padding: "12px 16px", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
        {formatTime(job.finishedOn ?? job.processedOn)}
      </td>
      <td style={{ padding: "12px 16px", fontSize: "12px", color: "#EF4444", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {job.failedReason ?? "—"}
      </td>
    </tr>
  );
}

const POLL_INTERVAL_MS = 2000;

export default function QueueDashboard() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getQueueStats();
      setStats(data);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? "Failed to load queue stats");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 2-second live polling
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL_MS);
    return () => clearInterval(interval); // cleanup on unmount
  }, [fetchStats]);

  const counts = stats?.counts;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        backgroundColor: "#F9FAFB",
        overflow: "auto",
        height: "100%",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: "#D1FAE5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={18} color="#059669" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>
              BullMQ Queue Dashboard
            </h2>
            {lastRefreshed && (
              <p style={{ margin: 0, fontSize: "11px", color: "#9CA3AF" }}>
                Last updated: {lastRefreshed.toLocaleTimeString()} · Auto-refreshes every 2s
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => { setLoading(true); fetchStats(); }}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            borderRadius: "8px",
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            color: "#374151",
            fontSize: "13px",
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </header>

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── Error ─────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "#991B1B",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <XCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <StatCard
            label="Waiting"
            value={counts?.waiting ?? 0}
            icon={<Clock size={20} />}
            color="#854D0E"
            bg="#FEF9C3"
          />
          <StatCard
            label="Delayed"
            value={counts?.delayed ?? 0}
            icon={<Loader2 size={20} />}
            color="#3730A3"
            bg="#E0E7FF"
          />
          <StatCard
            label="Active"
            value={counts?.active ?? 0}
            icon={<Zap size={20} />}
            color="#166534"
            bg="#DCFCE7"
          />
          <StatCard
            label="Completed"
            value={counts?.completed ?? 0}
            icon={<CheckCircle size={20} />}
            color="#065F46"
            bg="#D1FAE5"
          />
          <StatCard
            label="Failed"
            value={counts?.failed ?? 0}
            icon={<XCircle size={20} />}
            color="#991B1B"
            bg="#FEE2E2"
          />
          <StatCard
            label="Paused"
            value={counts?.paused ?? 0}
            icon={<Pause size={20} />}
            color="#374151"
            bg="#F3F4F6"
          />
        </div>

        {/* ── Recent Jobs Table ──────────────────────────────── */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#111827" }}>
              Recent Jobs
            </h3>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
              Up to 50 most recent across all states
            </span>
          </div>

          {loading && !stats ? (
            /* Loading skeleton */
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px",
                gap: "10px",
                color: "#9CA3AF",
              }}
            >
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "13px" }}>Loading queue data…</span>
            </div>
          ) : stats?.recentJobs.length === 0 ? (
            /* Empty state */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px",
                gap: "8px",
                color: "#9CA3AF",
              }}
            >
              <Activity size={32} strokeWidth={1.5} />
              <p style={{ margin: 0, fontSize: "14px" }}>No jobs found in any queue state.</p>
              <p style={{ margin: 0, fontSize: "12px" }}>Schedule an email to see BullMQ jobs here.</p>
            </div>
          ) : (
            /* Jobs table */
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9FAFB" }}>
                    {["Job ID", "State", "Attempts", "Created", "Finished / Processed", "Failure Reason"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#6B7280",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentJobs.map((job) => (
                    <JobRow key={job.jobId} job={job} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
