"use client";
import { useEffect } from "react";

export function SignOutDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="pd-modal-wrap" onClick={onCancel}>
      <div className="pd-modal pd-confirm" role="dialog" aria-modal="true" aria-labelledby="pd-signout-title" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-body">
          <span className="pd-confirm-mark" aria-hidden>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </span>
          <h3 id="pd-signout-title">Log out</h3>
          <p>You will leave this session. Sign in again to continue.</p>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" autoFocus onClick={onCancel}>Cancel</button>
          <button className="pd-btn pd-btn-rose" onClick={onConfirm}>Log out</button>
        </div>
      </div>
    </div>
  );
}

export function SaveConfirm({ title, body, onCancel, onConfirm }: { title: string; body: string; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="pd-modal-wrap" onClick={onCancel}>
      <div className="pd-modal pd-confirm" role="dialog" aria-modal="true" aria-labelledby="pd-save-title" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-body">
          <span className="pd-confirm-mark" aria-hidden style={{ background: "var(--wash)", color: "var(--green)" }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <h3 id="pd-save-title">{title}</h3>
          <p>{body}</p>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="pd-btn pd-btn-primary" autoFocus onClick={onConfirm}>Save</button>
        </div>
      </div>
    </div>
  );
}
