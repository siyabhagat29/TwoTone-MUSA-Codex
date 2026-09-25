import React, { useState } from "react";
import { MessageSquare, Send, Clock, User, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function DispatchCommunicationNotes({
  incident,
  onNoteAdded,
  notify
}) {
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!incident) return null;

  const notes = incident.operationalNotes || [];

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/incidents/${incident.id}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: noteText.trim(),
          author: "Lead Dispatcher"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add note");

      if (onNoteAdded) onNoteAdded(data.note);
      if (notify) notify("Operational note recorded.");
      setNoteText("");
    } catch (err) {
      if (notify) notify(`Note failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MessageSquare size={14} style={{ color: "#2563eb" }} />
          <b style={{ fontSize: "12px", color: "#0B1B3A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Dispatch Communications & Notes
          </b>
        </div>
        <span style={{ fontSize: "11px", color: "#64748b" }}>
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add operational directive or field update..."
          style={{
            flex: 1,
            padding: "7px 12px",
            fontSize: "12px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            outline: "none"
          }}
        />
        <button
          type="submit"
          className="ghost small"
          disabled={submitting || !noteText.trim()}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          {submitting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
          <span>Post</span>
        </button>
      </form>

      {/* Notes List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
        {notes.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", padding: "4px 0" }}>
            No operational notes logged yet for this incident.
          </div>
        ) : (
          notes.map((n, i) => (
            <div
              key={n.id || i}
              style={{
                background: "#f8fafc",
                border: "1px solid #f1f5f9",
                borderRadius: "6px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: "2px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px", color: "#64748b" }}>
                <b>{n.author || "Dispatcher"}</b>
                <span>{n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : "Just now"}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#334155" }}>{n.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
