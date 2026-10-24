"use client";
import { usePharma } from "../pharmaState";

const TYPE_TONE: Record<string, string> = { OPD: "pill-blue", IPD: "pill-gold", Diagnostic: "pill-teal", Support: "pill-gray" };

export default function DepartmentsScreen() {
  const { departments } = usePharma();
  const docs = departments.reduce((a, d) => a + d.doctors.length, 0);

  return (
    <div className="pd-canvas-wide">
      <div className="pd-summary-chips" style={{ marginBottom: 16 }}>
        <div className="pd-schip">Departments<b>{departments.length}</b></div>
        <div className="pd-schip">Doctors<b>{docs}</b></div>
        <div className="pd-schip">OPD<b>{departments.filter((d) => d.type === "OPD").length}</b></div>
        <div className="pd-schip">IPD<b>{departments.filter((d) => d.type === "IPD").length}</b></div>
      </div>

      <div className="pd-grid-cards">
        {departments.map((d) => (
          <div className="pd-card pd-card-pad" key={d.id}>
            <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="pd-flex" style={{ gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 26 }}>{d.emoji}</span>
                <div><h3 style={{ fontSize: 15.5 }}>{d.name}</h3><div className="pd-muted" style={{ fontSize: 12.5 }}>Head: {d.head}</div></div>
              </div>
              <span className={`pd-pill ${TYPE_TONE[d.type] ?? "pill-gray"}`}>{d.type}</span>
            </div>
            <ul className="pd-ob-itemlist">
              {d.doctors.map((doc, i) => (
                <li key={i}><span>{doc.name} · <em className="pd-muted" style={{ fontStyle: "normal" }}>{doc.specialty}</em></span><b>{doc.opdRoom ?? "—"}</b></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
