import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Star, Archive, Trash2, Loader2, ChevronDown } from "lucide-react";
import { getEmailById } from "../api/client";
import type { Email } from "../types";

export default function EmailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getEmailById(id)
      .then(setEmail)
      .catch((err: Error) => setError(err.message || "Failed to load email"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────────────────
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
        <Loader2
          size={28}
          color="#D1D5DB"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !email) {
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
        }}
      >
        <p style={{ fontSize: "14px", color: "#9CA3AF" }}>
          {error || "Email not found"}
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: "14px",
            color: "#10B981",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Go back
        </button>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const dateSource = email.sentAt ?? email.scheduledAt;
  const formattedDate = (() => {
    try {
      return format(new Date(dateSource), "MMM d, h:mm aa");
    } catch {
      return dateSource;
    }
  })();

  // Use sender email if available, fallback gracefully
  const senderEmail = email.sender?.email ?? "sender@example.com";
  const senderName = senderEmail.split("@")[0]
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const senderInitial = senderName.charAt(0).toUpperCase();

  // Build a title similar to Figma: "Oliver, hello there! | EMAILID"
  const emailTitle = `${email.subject} | ${email.id.slice(0, 8).toUpperCase()}`;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {/* ── Top header bar ────────────────────────────────────────────────── */}
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
        {/* Back arrow */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px",
            borderRadius: "6px",
            border: "none",
            background: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F3F4F6")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent")
          }
        >
          <ArrowLeft size={18} color="#111827" strokeWidth={2} />
        </button>

        {/* Subject / title */}
        <h1
          style={{
            flex: 1,
            fontSize: "15px",
            fontWeight: 600,
            color: "#111827",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {emailTitle}
        </h1>

        {/* Action icons (right side) */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {[
            { Icon: Star, label: "star" },
            { Icon: Archive, label: "archive" },
            { Icon: Trash2, label: "trash" },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              aria-label={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
                borderRadius: "6px",
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#F3F4F6")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "transparent")
              }
            >
              <Icon size={17} color="#9CA3AF" strokeWidth={1.5} />
            </button>
          ))}

          {/* User avatar (right-most — represents logged-in user) */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              marginLeft: "8px",
            }}
          >
            <img
              src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
              alt="User"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </header>

      {/* ── Email content area ────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px",
        }}
      >
        {/* Sender row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {/* Sender avatar circle */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            {senderInitial}
          </div>

          {/* Sender info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {senderName}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "#9CA3AF",
                }}
              >
                &lt;{senderEmail}&gt;
              </span>
            </div>
            {/* "to me" with dropdown */}
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "12px",
                color: "#9CA3AF",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                marginTop: "2px",
              }}
            >
              to me
              <ChevronDown size={12} color="#9CA3AF" />
            </button>
          </div>

          {/* Date aligned right */}
          <span
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              whiteSpace: "nowrap",
              flexShrink: 0,
              paddingTop: "2px",
            }}
          >
            {formattedDate}
          </span>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div
          style={{
            fontSize: "14px",
            color: "#374151",
            lineHeight: "1.7",
          }}
        >
          {/* Render body — preserve line breaks, detect highlighted blocks */}
          {renderBody(email.body)}
        </div>
      </div>
    </div>
  );
}

// ── Body renderer ─────────────────────────────────────────────────────────────
// Renders plain text email body with line-break support.
// If the body contains a line that looks like a callout/highlight block
// (starts with ⚡ or ✨ or is wrapped in ** or is very short bold-like),
// render it in a highlighted box matching the Figma yellow callout.
function renderBody(body: string) {
  if (!body) return null;

  const paragraphs = body.split(/\n\n+/);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();

        // Detect callout lines — if paragraph contains ⚡ or ✨ or starts with them
        const isCallout =
          trimmed.includes("⚡") ||
          trimmed.includes("✨") ||
          trimmed.includes("💥") ||
          trimmed.includes("🚀");

        if (isCallout) {
          return (
            <div
              key={i}
              style={{
                backgroundColor: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: "6px",
                padding: "12px 16px",
                fontSize: "14px",
                color: "#374151",
                lineHeight: "1.6",
              }}
            >
              {trimmed.split("\n").map((line, j) => (
                <p key={j} style={{ margin: j === 0 ? 0 : "6px 0 0" }}>
                  {renderInline(line)}
                </p>
              ))}
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={i} style={{ margin: 0 }}>
            {trimmed.split("\n").map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// Render inline **bold** markdown
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: "#111827" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}