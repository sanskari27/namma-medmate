"use client";
import { useMemo, useRef } from "react";
import { usePharma } from "../pharmaState";
import { Sale, mrpOf, sellPrice, INVOICE_TEMPLATES, INVOICE_ACCENTS, INVOICE_TITLES, InvoiceTemplate } from "../data";
import { IconImage, IconTrash, IconPrint, IconCheck, IconStore } from "../components/Icon";
import Invoice from "../components/Invoice";

export default function InvoiceSettingsScreen() {
  const { invoiceSettings: cfg, updateInvoiceSettings, updateProfile, inventory, profile } = usePharma();
  const logoRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File | undefined, cb: (dataUrl: string) => void) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => cb(r.result as string);
    r.readAsDataURL(file);
  };

  // a sample sale to preview the invoice live
  const sample = useMemo<Sale>(() => {
    const line = (p: typeof inventory[number] | undefined, qty: number) => {
      const b = p?.batches[0];
      return { productId: p?.id ?? "preview", name: p?.name ?? "Preview item", batchNo: b?.batchNo ?? "—", expiry: b?.expiry ?? "—", hsn: p?.hsn ?? "—", qty, mrp: p ? mrpOf(p) : 0, price: p ? sellPrice(p) : 0, gst: p?.gst ?? 0 };
    };
    const second = inventory[1];
    return {
      id: cfg.prefix + "PREVIEW", channel: "offline", status: "completed",
      customer: { name: "Preview" },
      items: second ? [line(inventory[0], 1), line(second, 1)] : [line(inventory[0], 1)],
      discount: 0, payMode: "upi", rx: false, createdAt: Date.now(),
    };
  }, [inventory, cfg.prefix]);

  return (
    <div className="pd-canvas-wide">
      <div className="pd-inv-layout">
        {/* ── settings ── */}
        <div className="pd-inv-settings">
          {/* template */}
          <div className="pd-card pd-card-pad">
            <div className="pd-formsec" style={{ marginTop: 0 }}><IconImage size={15} /> Invoice template</div>
            <div className="pd-tpl-grid">
              {INVOICE_TEMPLATES.map((tp) => (
                <button key={tp.key} className={`pd-tpl${cfg.template === tp.key ? " on" : ""}`} onClick={() => updateInvoiceSettings({ template: tp.key })}>
                  <TemplateThumb kind={tp.key} accent={cfg.accent} />
                  <span className="nm">{tp.name}{cfg.template === tp.key && <IconCheck size={13} />}</span>
                  <span className="ds">{tp.desc}</span>
                </button>
              ))}
            </div>

            <div className="pd-formsec">Accent colour</div>
            <div className="pd-flex pd-gap6" style={{ flexWrap: "wrap" }}>
              {INVOICE_ACCENTS.map((c) => (
                <button key={c} className={`pd-swatch${cfg.accent === c ? " on" : ""}`} style={{ background: c }} onClick={() => updateInvoiceSettings({ accent: c })} aria-label={c}>{cfg.accent === c && <IconCheck size={13} />}</button>
              ))}
              <label className="pd-swatch pd-swatch-custom" title="Custom colour"><input type="color" value={cfg.accent} onChange={(e) => updateInvoiceSettings({ accent: e.target.value })} /></label>
            </div>
          </div>

          {/* branding: logo + stamp */}
          <div className="pd-card pd-card-pad">
            <div className="pd-formsec" style={{ marginTop: 0 }}><IconStore size={15} /> Branding</div>
            <div className="pd-brand-grid">
              <div className="pd-brand-slot">
                <label>Brand logo</label>
                <div className="pd-brand-box">
                  {profile.logo ? <img src={profile.logo} alt="logo" /> : <span className="ph"><IconImage size={22} /></span>}
                </div>
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => readFile(e.target.files?.[0], (d) => updateProfile({ logo: d }))} />
                <div className="pd-flex pd-gap6">
                  <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => logoRef.current?.click()}>{profile.logo ? "Change" : "Upload"}</button>
                  {profile.logo && <button className="pd-iconbtn" title="Remove" onClick={() => updateProfile({ logo: undefined })}><IconTrash size={14} /></button>}
                </div>
                <Row label="Show logo on invoice" on={cfg.showLogo} onClick={() => updateInvoiceSettings({ showLogo: !cfg.showLogo })} />
              </div>

              <div className="pd-brand-slot">
                <label>Signature / seal stamp</label>
                <div className="pd-brand-box stamp">
                  {cfg.stamp ? <img src={cfg.stamp} alt="stamp" /> : <span className="ph"><IconImage size={22} /></span>}
                </div>
                <input ref={stampRef} type="file" accept="image/*" hidden onChange={(e) => readFile(e.target.files?.[0], (d) => updateInvoiceSettings({ stamp: d, showStamp: true }))} />
                <div className="pd-flex pd-gap6">
                  <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => stampRef.current?.click()}>{cfg.stamp ? "Change" : "Upload"}</button>
                  {cfg.stamp && <button className="pd-iconbtn" title="Remove" onClick={() => updateInvoiceSettings({ stamp: undefined, showStamp: false })}><IconTrash size={14} /></button>}
                </div>
                <Row label="Show stamp on invoice" on={cfg.showStamp} onClick={() => updateInvoiceSettings({ showStamp: !cfg.showStamp })} />
              </div>
            </div>
            <p className="pd-muted" style={{ fontSize: 11.5, marginTop: 10 }}>The pharmacist's signature is uploaded in <b>Settings → business profile</b> and prints beside the stamp.</p>
          </div>

          {/* content */}
          <div className="pd-card pd-card-pad">
            <div className="pd-formsec" style={{ marginTop: 0 }}>Content</div>
            <div className="pd-form-grid">
              <div className="pd-field"><label>Document title</label>
                <input className="pd-input" list="inv-titles" value={cfg.title} onChange={(e) => updateInvoiceSettings({ title: e.target.value })} />
                <datalist id="inv-titles">{INVOICE_TITLES.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div className="pd-field"><label>Invoice number prefix</label><input className="pd-input pd-mono" value={cfg.prefix} onChange={(e) => updateInvoiceSettings({ prefix: e.target.value })} /></div>
              <div className="pd-field"><label>Signatory label</label><input className="pd-input" value={cfg.signatory} onChange={(e) => updateInvoiceSettings({ signatory: e.target.value })} /></div>
              <div className="pd-field"><label>Bank details line</label><input className="pd-input" value={cfg.bankLine} onChange={(e) => updateInvoiceSettings({ bankLine: e.target.value })} /></div>
              <div className="pd-field pd-span2"><label>Terms &amp; conditions</label><textarea className="pd-textarea" value={cfg.terms} onChange={(e) => updateInvoiceSettings({ terms: e.target.value })} /></div>
              <div className="pd-field pd-span2"><label>Footer note</label><input className="pd-input" value={cfg.footerNote} onChange={(e) => updateInvoiceSettings({ footerNote: e.target.value })} /></div>
            </div>

            <div className="pd-formsec">Display options</div>
            <Row label="Show “you saved …” on MRP" on={cfg.showSavings} onClick={() => updateInvoiceSettings({ showSavings: !cfg.showSavings })} />
            <Row label="Include prescribing doctor" on={cfg.includeDoctor} onClick={() => updateInvoiceSettings({ includeDoctor: !cfg.includeDoctor })} />
            <Row label="Show HSN column" on={cfg.showHsn} onClick={() => updateInvoiceSettings({ showHsn: !cfg.showHsn })} />
            <Row label="Print bank details" on={cfg.showBank} onClick={() => updateInvoiceSettings({ showBank: !cfg.showBank })} />
          </div>
        </div>

        {/* ── live preview ── */}
        <div className="pd-inv-preview">
          <div className="pd-card">
            <div className="pd-card-head"><h3>Live preview</h3>
              <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => window.print()}><IconPrint size={14} /> Print sample</button>
            </div>
            <div className="pd-card-pad" style={{ background: "var(--wash2)" }}>
              <div className={`pd-inv-paper${cfg.template === "thermal" ? " thermal" : ""}`}>
                <Invoice sale={sample} profile={profile} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// tiny visual thumbnail of each template
function TemplateThumb({ kind, accent }: { kind: InvoiceTemplate; accent: string }) {
  if (kind === "thermal") return (
    <span className="pd-tpl-thumb">
      <span className="tt-receipt">
        <i className="tt-c" style={{ width: "60%", margin: "0 auto" }} /><i className="tt-c" style={{ width: "40%", margin: "2px auto" }} />
        <i className="tt-c" /><i className="tt-c" /><i className="tt-c" style={{ background: accent, height: 4 }} />
      </span>
    </span>
  );
  const band = kind === "modern";
  return (
    <span className="pd-tpl-thumb">
      <span className="tt-head" style={band ? { background: accent } : { borderBottom: `2px solid ${kind === "minimal" ? "#ddd" : accent}` }}>
        <i className="tt-logo" style={{ background: band ? "rgba(255,255,255,.7)" : accent }} />
        <i className="tt-title" style={{ background: band ? "rgba(255,255,255,.6)" : "#bbb" }} />
      </span>
      <span className="tt-rows"><i /><i /><i /></span>
      <span className="tt-total" style={{ background: accent }} />
    </span>
  );
}

function Row({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="pd-flex" style={{ justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <button className={`pd-switch${on ? " on" : ""}`} onClick={onClick} />
    </div>
  );
}
