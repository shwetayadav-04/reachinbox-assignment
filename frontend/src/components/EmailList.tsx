import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Star, Loader2, Inbox, Clock } from "lucide-react";
import type { Email, EmailStatus } from "../types";

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  status: EmailStatus;
}

function TimeBadge({ date }: { date: string }) {
  const formatted = useMemo(() => {
    try {
      return format(new Date(date), "EEE h:mm:ss aa");
    } catch {
      return date;
    }
  }, [date]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "4px",
        backgroundColor: "#FFF4EE",
        color: "#EA580C",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <Clock size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      {formatted}
    </span>
  );
}

function SentBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "4px",
        backgroundColor: "#F3F4F6",
        color: "#6B7280",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      Sent
    </span>
  );
}

export default function EmailList({ emails, loading, status }: EmailListProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Loader2 size={24} color="#D1D5DB" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          backgroundColor: "#FFFFFF",
          color: "#9CA3AF",
        }}
      >
        <Inbox size={40} strokeWidth={1} color="#D1D5DB" />
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "#9CA3AF" }}>
          No {status === "SCHEDULED" ? "scheduled" : "sent"} emails yet.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: "#FFFFFF",
      }}
    >
      {emails.map((email) => {
        // Format "John Smith" from "john.smith@example.com"
        const rawName = email.recipient.split("@")[0] ?? email.recipient;
        const displayName = rawName
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const preview = email.body.replace(/\s+/g, " ").trim().slice(0, 90);

        return (
          <button
            key={email.id}
            onClick={() => navigate(`/email/${email.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              width: "100%",
              padding: "12px 24px",
              borderBottom: "1px solid #F3F4F6",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background-color 0.1s",
            } as React.CSSProperties}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F9FAFB")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent")
            }
          >
            {/* Recipient — fixed 140px */}
            <div style={{ width: "140px", flexShrink: 0, overflow: "hidden" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                To: {displayName}
              </span>
            </div>

            {/* Status badge */}
            {status === "SCHEDULED" ? (
              <TimeBadge date={email.scheduledAt} />
            ) : (
              <SentBadge />
            )}

            {/* Subject · preview */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  maxWidth: "40%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {email.subject}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "#9CA3AF",
                  fontWeight: 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1,
                }}
              >
                · {preview}{email.body.length > 90 ? "..." : ""}
              </span>
            </div>

            {/* Star */}
            <Star
              size={16}
              strokeWidth={1.5}
              color="#D1D5DB"
              style={{ flexShrink: 0 }}
            />
          </button>
        );
      })}
    </div>
  );
}
