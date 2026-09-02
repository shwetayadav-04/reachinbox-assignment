import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Loader2,
  ChevronDown,
  X,
  Upload,
  Undo2,
  Redo2,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  ChevronsUpDown,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Quote,
  RemoveFormatting,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { scheduleEmail, uploadCsv } from "../api/client";

interface ComposeModalProps {
  onClose: () => void;
  onScheduled?: () => void;
}

function tomorrowAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString().slice(0, 16);
}

const QUICK_TIMES = [
  { label: "Tomorrow", value: tomorrowAt(9, 0) },
  { label: "Tomorrow, 10:00 AM", value: tomorrowAt(10, 0) },
  { label: "Tomorrow, 11:00 AM", value: tomorrowAt(11, 0) },
  { label: "Tomorrow, 3:00 PM", value: tomorrowAt(15, 0) },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface StatusMsg {
  type: "success" | "error" | "partial" | "loading";
  text: string;
}

export default function ComposeModal({ onClose, onScheduled }: ComposeModalProps) {
  const [sender, setSender] = useState("oliver.brown@domain.io");

  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientError, setRecipientError] = useState("");

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const [scheduledAt, setScheduledAt] = useState("");
  const [showSendLater, setShowSendLater] = useState(false);
  const [sendLaterLabel, setSendLaterLabel] = useState("");

  const [delay, setDelay] = useState("");
  const [hourlyLimit, setHourlyLimit] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);

  const [csvUploading, setCsvUploading] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<File[]>([]);
  const attachFileRef = useRef<HTMLInputElement>(null);

  // ── Recipient Chips ─────────────────────────────────────────────────────────
  const commitRecipient = useCallback(() => {
    const email = recipientInput.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      setRecipientError(`"${email}" is not a valid email`);
      return;
    }
    if (recipients.includes(email)) {
      setRecipientError(`"${email}" is already added`);
      return;
    }
    setRecipients((prev) => [...prev, email]);
    setRecipientInput("");
    setRecipientError("");
  }, [recipientInput, recipients]);

  const removeRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }, []);

  const handleRecipientKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commitRecipient();
    } else if (e.key === "Backspace" && recipientInput === "" && recipients.length > 0) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  // ── Attachments ─────────────────────────────────────────────────────────────
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
    if (attachFileRef.current) attachFileRef.current.value = "";
  };
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Editor ──────────────────────────────────────────────────────────────────
  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSend(isSendLater: boolean = false) {
    if (submitting) return;

    if (recipientInput.trim() && !isValidEmail(recipientInput.trim())) {
      setStatusMsg({ type: "error", text: `"${recipientInput.trim()}" is not valid.` });
      return;
    }
    const allRecipients = recipientInput.trim()
      ? [...recipients, recipientInput.trim().toLowerCase()]
      : recipients;

    if (allRecipients.length === 0) {
      setStatusMsg({ type: "error", text: "Please add at least one recipient." });
      return;
    }
    if (!subject.trim()) {
      setStatusMsg({ type: "error", text: "Subject is required." });
      return;
    }
    if (!bodyHtml.trim()) {
      setStatusMsg({ type: "error", text: "Email body is required." });
      return;
    }

    let finalScheduledAt = scheduledAt;
    
    // The backend demands scheduledAt > now.
    // If user hits "Send" (immediate), we default to 1 min in future.
    if (!isSendLater && !finalScheduledAt) {
      finalScheduledAt = new Date(Date.now() + 60_000).toISOString();
    } else if (isSendLater && !finalScheduledAt) {
      setStatusMsg({ type: "error", text: "Please select a date/time using the clock." });
      return;
    }

    const schedDate = new Date(finalScheduledAt);
    if (isNaN(schedDate.getTime())) {
      setStatusMsg({ type: "error", text: "Invalid scheduled date/time." });
      return;
    }
    if (schedDate <= new Date()) {
      setStatusMsg({ type: "error", text: "Scheduled time must be in the future." });
      return;
    }

    setSubmitting(true);
    setStatusMsg({ type: "loading", text: `Scheduling ${allRecipients.length} emails...` });

    const normalizedSender = sender.trim().toLowerCase();
    const isoScheduledAt = schedDate.toISOString();
    
    let succeeded = 0;
    const failed: string[] = [];

    // Schedule sequentially to avoid backend concurrency issues and race conditions.
    for (const recipient of allRecipients) {
      try {
        await scheduleEmail({
          sender: normalizedSender,
          recipient,
          subject: subject.trim(),
          body: bodyHtml.trim(),
          scheduledAt: isoScheduledAt,
        });
        succeeded++;
      } catch (err: unknown) {
        failed.push(err instanceof Error ? err.message : String(err));
      }
    }

    setSubmitting(false);

    if (failed.length === 0) {
      setStatusMsg({
        type: "success",
        text: allRecipients.length === 1
            ? "Email scheduled successfully!"
            : `All ${succeeded} emails scheduled successfully!`,
      });
      onScheduled?.();
      setTimeout(onClose, 1600);
    } else if (succeeded > 0) {
      setStatusMsg({
        type: "partial",
        text: `${succeeded} scheduled, ${failed.length} failed: ${failed[0]}`,
      });
      onScheduled?.();
    } else {
      setStatusMsg({ type: "error", text: `Failed: ${failed[0]}` });
    }
  }

  // ── CSV Upload ──────────────────────────────────────────────────────────────
  async function handleCsvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (csvUploading || submitting) return;

    setStatusMsg({ type: "loading", text: "Uploading and processing CSV..." });
    setCsvUploading(true);
    setSubmitting(true); // Disable form while uploading CSV
    try {
      const result = await uploadCsv(file);
      const { scheduled, failed, totalRows } = result.data;
      setStatusMsg({
        type: failed === 0 ? "success" : "partial",
        text: `CSV processed: ${totalRows} rows. ${scheduled} scheduled, ${failed} failed.`,
      });
      onScheduled?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "CSV upload failed";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setCsvUploading(false);
      setSubmitting(false);
      if (csvFileRef.current) csvFileRef.current.value = "";
    }
  }

  const statusColor =
    statusMsg?.type === "success" ? "#10B981"
    : statusMsg?.type === "partial" ? "#F59E0B"
    : statusMsg?.type === "loading" ? "#6B7280"
    : "#EF4444";

  const StatusIcon =
    statusMsg?.type === "loading" ? Loader2
    : statusMsg?.type === "success" ? CheckCircle2
    : AlertCircle;

  return (
    <div
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "#FFFFFF",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          borderBottom: "1px solid #F3F4F6",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{ background: "none", border: "none", cursor: submitting ? "not-allowed" : "pointer", padding: "4px", display: "flex", alignItems: "center" }}
          >
            <ArrowLeft size={20} color="#111827" strokeWidth={2} />
          </button>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0 }}>
            Compose New Email
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
          {statusMsg && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500, color: statusColor, maxWidth: "320px" }}>
              <StatusIcon size={14} style={{ animation: statusMsg.type === "loading" ? "spin 1s linear infinite" : "none" }} />
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Paperclip → Add Attachment */}
          <button
            onClick={() => attachFileRef.current?.click()}
            disabled={submitting}
            title="Add attachment"
            style={{ background: "none", border: "none", cursor: submitting ? "not-allowed" : "pointer", padding: "4px", display: "flex", alignItems: "center" }}
          >
            <Paperclip size={18} color="#9CA3AF" strokeWidth={2} />
          </button>
          <input
            ref={attachFileRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={handleAttachmentChange}
          />

          {/* Clock → Send Later */}
          <button
            onClick={() => setShowSendLater(!showSendLater)}
            title={scheduledAt ? `Scheduled: ${sendLaterLabel || scheduledAt}` : "Set send time"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", color: scheduledAt ? "#10B981" : "#9CA3AF" }}
          >
            <Clock size={18} strokeWidth={2} color={scheduledAt ? "#10B981" : "#9CA3AF"} />
          </button>

          {showSendLater && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: "56px",
                width: "288px", backgroundColor: "#FFFFFF", borderRadius: "12px",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)",
                border: "1px solid #E5E7EB", padding: "16px", zIndex: 60,
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 14px 0" }}>Send Later</h3>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>Pick date &amp; time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  onChange={(e) => {
                    setScheduledAt(e.target.value);
                    setSendLaterLabel("");
                  }}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #E5E7EB",
                    fontSize: "13px", color: "#374151", boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                {QUICK_TIMES.map((qt) => (
                  <button
                    key={qt.label}
                    onClick={() => { setScheduledAt(qt.value); setSendLaterLabel(qt.label); setShowSendLater(false); }}
                    style={{
                      textAlign: "left", padding: "9px 4px", background: scheduledAt === qt.value ? "#F0FDF4" : "none",
                      border: "none", borderBottom: "1px solid #F9FAFB", fontSize: "13px",
                      color: scheduledAt === qt.value ? "#059669" : "#6B7280", fontWeight: scheduledAt === qt.value ? 600 : 400,
                      cursor: "pointer", borderRadius: "4px",
                    }}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button onClick={() => setShowSendLater(false)} style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>Cancel</button>
                <button onClick={() => setShowSendLater(false)} style={{ padding: "6px 18px", fontSize: "13px", fontWeight: 600, color: "#10B981", backgroundColor: "#FFFFFF", border: "1.5px solid #10B981", borderRadius: "999px", cursor: "pointer" }}>Done</button>
              </div>
            </div>
          )}

          <button
            onClick={() => handleSend(false)}
            disabled={submitting}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "7px 20px", borderRadius: "999px",
              border: "1.5px solid #10B981", color: "#10B981", backgroundColor: "#FFFFFF", fontSize: "13px",
              fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, whiteSpace: "nowrap",
            }}
          >
            {submitting && <Loader2 size={13} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />}
            Send
          </button>
        </div>
      </header>

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 32px" }}>
          
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #F3F4F6", padding: "14px 0", gap: "12px" }}>
            <span style={{ width: "80px", flexShrink: 0, fontSize: "13px", fontWeight: 600, color: "#374151" }}>From</span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 10px", backgroundColor: "#F3F4F6", borderRadius: "8px" }}>
              <input value={sender} onChange={(e) => setSender(e.target.value.toLowerCase())} style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", fontWeight: 500, color: "#374151", width: "200px" }} />
              <ChevronDown size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", borderBottom: "1px solid #F3F4F6", padding: "14px 0", gap: "12px" }}>
            <span style={{ width: "80px", flexShrink: 0, fontSize: "13px", fontWeight: 600, color: "#374151", paddingTop: "4px" }}>To</span>
            <div style={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
              {recipients.slice(0, 3).map((r) => (
                <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", border: "1px solid #10B981", borderRadius: "999px", fontSize: "12px", fontWeight: 500, color: "#059669", backgroundColor: "#F0FDF4", flexShrink: 0 }}>
                  {r}
                  <button onClick={() => removeRecipient(r)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", marginLeft: "2px" }}><X size={12} color="#059669" /></button>
                </span>
              ))}
              {recipients.length > 3 && (
                <span title={`All recipients:\n${recipients.join("\n")}`} style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", border: "1px solid #10B981", borderRadius: "999px", fontSize: "12px", fontWeight: 600, color: "#059669", backgroundColor: "#F0FDF4", cursor: "default", flexShrink: 0 }}>
                  +{recipients.length - 3}
                </span>
              )}
              <input
                type="text" placeholder={recipients.length === 0 ? "recipient@example.com" : "add more…"}
                value={recipientInput} onChange={(e) => { setRecipientInput(e.target.value); setRecipientError(""); }}
                onKeyDown={handleRecipientKeyDown} onBlur={commitRecipient}
                style={{ border: "none", outline: "none", fontSize: "14px", color: "#111827", minWidth: "160px", flex: 1 }}
              />
              <button
                onClick={() => csvFileRef.current?.click()}
                disabled={submitting}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "auto", background: "none", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontSize: "13px", color: "#10B981", fontWeight: 500, flexShrink: 0 }}
              >
                <Upload size={14} color="#10B981" />
                Upload List
              </button>
              <input ref={csvFileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvChange} />
            </div>
          </div>
          {recipientError && <p style={{ fontSize: "12px", color: "#EF4444", margin: "4px 0 0 92px" }}>{recipientError}</p>}

          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #F3F4F6", padding: "14px 0", gap: "12px" }}>
            <span style={{ width: "80px", flexShrink: 0, fontSize: "13px", fontWeight: 600, color: "#374151" }}>Subject</span>
            <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: "#111827" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #F3F4F6", padding: "14px 0", gap: "0", flexWrap: "wrap", rowGap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginRight: "10px" }}>Delay between 2 emails</span>
            <input type="number" min="0" placeholder="00" value={delay} onChange={(e) => setDelay(e.target.value)} style={{ width: "52px", textAlign: "center", padding: "5px", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "13px", outline: "none", marginRight: "32px" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginRight: "10px" }}>Hourly Limit</span>
            <input type="number" min="0" placeholder="00" value={hourlyLimit} onChange={(e) => setHourlyLimit(e.target.value)} style={{ width: "52px", textAlign: "center", padding: "5px", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "13px", outline: "none" }} />
            <span style={{ fontSize: "11px", color: "#9CA3AF", marginLeft: "12px" }}>(UI reference — limits enforced strictly on server)</span>
          </div>

          {/* Attachments feedback area */}
          {attachments.length > 0 && (
            <div style={{ padding: "14px 0", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#EF4444", width: "100%", marginBottom: "4px" }}>
                * Attachments are visually selected locally but the backend currently does not process them.
              </span>
              {attachments.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#F3F4F6", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: "#374151" }}>
                  <FileText size={14} color="#6B7280" />
                  <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button onClick={() => removeAttachment(i)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><X size={14} color="#9CA3AF" /></button>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* ── Rich Text Editor ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: "20px 32px 24px", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, minHeight: "280px", backgroundColor: "#F9FAFB", borderRadius: "12px", display: "flex", flexDirection: "column", padding: "16px", border: "1px solid #F3F4F6" }}>
            
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              style={{ flex: 1, width: "100%", outline: "none", fontSize: "14px", lineHeight: "1.7", color: "#374151", fontFamily: "inherit", minHeight: "200px", overflowY: "auto" }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "14px", paddingTop: "12px", borderTop: "1px solid #E5E7EB", color: "#9CA3AF", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => execCmd("undo")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><Undo2 size={15} /></button>
                <button onClick={() => execCmd("redo")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><Redo2 size={15} /></button>
              </div>
              <div style={{ width: "1px", height: "16px", backgroundColor: "#E5E7EB" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button disabled title="Unsupported font face" style={{ background: "none", border: "none", cursor: "not-allowed", color: "#D1D5DB" }}><Type size={15} /></button>
                <button disabled title="Unsupported font size" style={{ background: "none", border: "none", cursor: "not-allowed", color: "#D1D5DB" }}><ChevronsUpDown size={15} /></button>
              </div>
              <div style={{ width: "1px", height: "16px", backgroundColor: "#E5E7EB" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => execCmd("bold")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><Bold size={15} /></button>
                <button onClick={() => execCmd("italic")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><Italic size={15} /></button>
                <button onClick={() => execCmd("underline")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><Underline size={15} /></button>
              </div>
              <div style={{ width: "1px", height: "16px", backgroundColor: "#E5E7EB" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => execCmd("justifyLeft")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><AlignLeft size={15} /></button>
                <button disabled title="Alignment dropdown unsupported" style={{ background: "none", border: "none", cursor: "not-allowed", color: "#D1D5DB" }}><ChevronsUpDown size={15} /></button>
              </div>
              <div style={{ width: "1px", height: "16px", backgroundColor: "#E5E7EB" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => execCmd("insertUnorderedList")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><List size={15} /></button>
                <button onClick={() => execCmd("insertOrderedList")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><ListOrdered size={15} /></button>
                <button onClick={() => execCmd("indent")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><IndentIncrease size={15} /></button>
                <button onClick={() => execCmd("outdent")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><IndentDecrease size={15} /></button>
                <button onClick={() => execCmd("formatBlock", "BLOCKQUOTE")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><Quote size={15} /></button>
                <button onClick={() => execCmd("removeFormat")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><RemoveFormatting size={15} /></button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
