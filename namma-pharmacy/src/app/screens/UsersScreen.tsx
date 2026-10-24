"use client";
import { useMemo, useState } from "react";
import { usePharma } from "../pharmaState";
import {
  ROLE_DEFAULT_PERMS, UserRole, StaffUser, timeAgo,
  PERMISSION_CATALOG, ALL_PERM_KEYS, PERM_LABEL, userPerms,
  genPassword, suggestUsername, waLink, smsLink,
} from "../data";
import {
  IconPlus, IconX, IconTrash, IconUsers, IconKey, IconShield, IconAlert,
  IconEdit, IconCopy, IconCheck, IconEye, IconEyeOff, IconRefresh, IconShare,
  IconWhatsApp, IconMessage, IconMail, IconLock,
} from "../components/Icon";

const ROLES: UserRole[] = ["Owner", "Manager", "Pharmacist", "Cashier"];
const ROLE_PILL: Record<UserRole, string> = { Owner: "pill-gold", Manager: "pill-blue", Pharmacist: "pill-green", Cashier: "pill-teal" };

function copy(text: string, done: () => void) {
  navigator.clipboard?.writeText(text).then(done, done);
}

// small copy button with a transient tick
function Copy({ text, label }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="pd-copybtn" title={`Copy ${label || ""}`} onClick={() => copy(text, () => { setOk(true); setTimeout(() => setOk(false), 1400); })}>
      {ok ? <IconCheck size={13} /> : <IconCopy size={13} />}
    </button>
  );
}

export default function UsersScreen() {
  const { users, addUser, toggleUser, removeUser, updateUser, subscription, profile, now } = usePharma();
  const [editing, setEditing] = useState<StaffUser | "new" | null>(null);
  const [share, setShare] = useState<StaffUser | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const seatLimit = subscription.plan === "Starter" ? 2 : subscription.plan === "Growth" ? 5 : 99;
  const activeCount = users.filter((u) => u.active).length;
  const withLogin = users.filter((u) => u.username && u.password).length;

  return (
    <div className="pd-canvas-wide" style={{ maxWidth: 1040 }}>
      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="pd-stat"><div className="ic ic-green"><IconUsers size={18} /></div><div className="lbl">Team members</div><div className="val">{users.length}</div><div className="split">{activeCount} active</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconKey size={18} /></div><div className="lbl">Seats used</div><div className="val">{activeCount} / {seatLimit === 99 ? "∞" : seatLimit}</div><div className="split">{subscription.plan} plan</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconLock size={18} /></div><div className="lbl">Login enabled</div><div className="val">{withLogin}</div><div className="split">have ID &amp; password</div></div>
        <div className="pd-stat"><div className="ic ic-teal"><IconShield size={18} /></div><div className="lbl">Access roles</div><div className="val">{ROLES.length}</div><div className="split">module-level control</div></div>
      </div>

      <div className="pd-toolbar">
        <h2 style={{ fontSize: 16 }}>Staff &amp; access control</h2>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-primary" disabled={seatLimit !== 99 && activeCount >= seatLimit} onClick={() => setEditing("new")}><IconPlus size={16} /> Add user</button>
      </div>
      {seatLimit !== 99 && activeCount >= seatLimit && <p className="pd-muted" style={{ fontSize: 12.5, marginBottom: 12 }}><IconAlert size={14} /> Seat limit reached for the {subscription.plan} plan — deactivate a user or upgrade your subscription.</p>}

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl pd-users-tbl">
            <thead><tr><th>Member</th><th>Role</th><th>Login credentials</th><th>Access</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => {
                const perms = userPerms(u);
                const full = u.role === "Owner" || perms.length >= ALL_PERM_KEYS.length;
                const show = reveal[u.id];
                return (
                  <tr key={u.id}>
                    <td><div className="prod"><span className="em" style={{ background: "var(--wash)", color: "var(--mid)", fontWeight: 800 }}>{u.name[0]}</span><span><span className="nm">{u.name}</span><div className="sub">{u.email || u.phone}</div></span></div></td>
                    <td>
                      <select className="pd-select" style={{ padding: "5px 8px", maxWidth: 130 }} value={u.role} disabled={u.role === "Owner"} onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      {u.username ? (
                        <div className="pd-cred">
                          <div className="pd-cred-row"><span className="k">ID</span><b className="pd-mono">{u.username}</b><Copy text={u.username} label="login ID" /></div>
                          <div className="pd-cred-row"><span className="k">PW</span><b className="pd-mono">{show ? u.password : "••••••••"}</b>
                            <button className="pd-copybtn" title={show ? "Hide" : "Reveal"} onClick={() => setReveal((r) => ({ ...r, [u.id]: !r[u.id] }))}>{show ? <IconEyeOff size={13} /> : <IconEye size={13} />}</button>
                            <Copy text={u.password || ""} label="password" />
                          </div>
                        </div>
                      ) : <button className="pd-linkbtn" onClick={() => setEditing(u)}>Set up login</button>}
                    </td>
                    <td>
                      {full
                        ? <span className="pd-pill pill-gold"><IconShield size={11} /> Full access</span>
                        : <button className="pd-accesschip" onClick={() => setEditing(u)}>{perms.length} / {ALL_PERM_KEYS.length} modules</button>}
                    </td>
                    <td><button className={`pd-switch${u.active ? " on" : ""}`} onClick={() => toggleUser(u.id)} disabled={u.role === "Owner"} aria-label="Toggle" /></td>
                    <td className="num">
                      <div className="pd-rowacts">
                        <button className="pd-iconbtn" title="Manage access" onClick={() => setEditing(u)}><IconEdit size={15} /></button>
                        <button className="pd-iconbtn" title="Share credentials" disabled={!u.username} onClick={() => setShare(u)}><IconShare size={15} /></button>
                        {u.role !== "Owner" && <button className="pd-iconbtn" title="Remove" onClick={() => removeUser(u.id)}><IconTrash size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <UserModal
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(payload, id) => {
            if (id) updateUser(id, payload);
            else addUser(payload as Omit<StaffUser, "id" | "lastActiveMins">);
            setEditing(null);
          }}
          onShare={(u) => { setEditing(null); setShare(u); }}
        />
      )}
      {share && <ShareCreds user={share} pharmacy={profile.name} onClose={() => setShare(null)} />}
    </div>
  );
}

// ── Add / manage user ────────────────────────────────────────────
function UserModal({ user, onClose, onSave, onShare }: {
  user: StaffUser | null;
  onClose: () => void;
  onSave: (payload: Partial<StaffUser>, id?: string) => void;
  onShare: (u: StaffUser) => void;
}) {
  const isEdit = !!user;
  const [f, setF] = useState<Partial<StaffUser>>(() => user ?? {
    name: "", role: "Cashier", phone: "", email: "", active: true, pin: "0000",
    username: "", password: "", permissions: [...ROLE_DEFAULT_PERMS.Cashier],
  });
  const [show, setShow] = useState(false);
  const set = (p: Partial<StaffUser>) => setF((s) => ({ ...s, ...p }));

  const perms = f.permissions ?? ROLE_DEFAULT_PERMS[(f.role as UserRole) || "Cashier"];
  const togglePerm = (key: string) => set({ permissions: perms.includes(key) ? perms.filter((k) => k !== key) : [...perms, key] });
  const isOwner = f.role === "Owner";

  const applyRoleDefaults = (role: UserRole) => set({ role, permissions: [...ROLE_DEFAULT_PERMS[role]] });
  const genPw = () => set({ password: genPassword(f.name) });
  const autoUser = () => set({ username: suggestUsername(f.name || "user", (f.role as UserRole) || "Cashier") });

  const canSave = !!(f.name || "").trim();

  const commit = (thenShare: boolean) => {
    const payload: Partial<StaffUser> = {
      name: (f.name || "").trim(), role: f.role, phone: f.phone, email: f.email,
      active: f.active ?? true, pin: f.pin || "0000",
      username: (f.username || "").trim() || suggestUsername(f.name || "user", (f.role as UserRole) || "Cashier"),
      password: f.password || genPassword(f.name),
      permissions: isOwner ? [...ALL_PERM_KEYS] : perms,
    };
    onSave(payload, user?.id);
    if (thenShare) onShare({ ...(user as StaffUser), ...payload, id: user?.id || "tmp", lastActiveMins: user?.lastActiveMins ?? 0 } as StaffUser);
  };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal pd-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>{isEdit ? `Manage ${user!.name}` : "Add team member"}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          {/* profile */}
          <div className="pd-form-grid">
            <div className="pd-field pd-span2"><label>Full name</label><input className="pd-input" value={f.name || ""} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Priya Sharma" /></div>
            <div className="pd-field"><label>Role</label><select className="pd-select" value={f.role} disabled={isEdit && user!.role === "Owner"} onChange={(e) => applyRoleDefaults(e.target.value as UserRole)}>{ROLES.filter((r) => r !== "Owner" || (isEdit && user!.role === "Owner")).map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
            <div className="pd-field"><label>Counter PIN</label><input className="pd-input pd-mono" maxLength={6} value={f.pin || ""} onChange={(e) => set({ pin: e.target.value })} /></div>
            <div className="pd-field"><label>Phone</label><input className="pd-input" value={f.phone || ""} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 " /></div>
            <div className="pd-field"><label>Email</label><input className="pd-input" value={f.email || ""} onChange={(e) => set({ email: e.target.value })} /></div>
          </div>

          {/* credentials */}
          <div className="pd-formsec"><IconKey size={15} /> Login credentials</div>
          <div className="pd-cred-panel">
            <div className="pd-form-grid">
              <div className="pd-field">
                <label>Login ID <button type="button" className="pd-minilink" onClick={autoUser}>auto</button></label>
                <div className="pd-inpwrap"><input className="pd-input pd-mono" value={f.username || ""} onChange={(e) => set({ username: e.target.value.replace(/\s/g, "") })} placeholder="name.role" /><Copy text={f.username || ""} label="login ID" /></div>
              </div>
              <div className="pd-field">
                <label>Password <button type="button" className="pd-minilink" onClick={genPw}><IconRefresh size={11} /> generate</button></label>
                <div className="pd-inpwrap">
                  <input className="pd-input pd-mono" type={show ? "text" : "password"} value={f.password || ""} onChange={(e) => set({ password: e.target.value })} placeholder="Auto-generate or type" />
                  <button type="button" className="pd-copybtn" onClick={() => setShow((s) => !s)} title={show ? "Hide" : "Show"}>{show ? <IconEyeOff size={13} /> : <IconEye size={13} />}</button>
                  <Copy text={f.password || ""} label="password" />
                </div>
              </div>
            </div>
            <p className="pd-hint"><IconAlert size={12} /> Share the ID &amp; password securely. Ask the user to change it after first sign-in.</p>
          </div>

          {/* permissions */}
          <div className="pd-formsec"><IconShield size={15} /> What this user can see &amp; use</div>
          {isOwner ? (
            <div className="pd-note-gold"><IconShield size={14} /> Owners always have full access to every module.</div>
          ) : (
            <>
              <div className="pd-permbar">
                <button className="pd-chipbtn" onClick={() => set({ permissions: [...ALL_PERM_KEYS] })}>Select all</button>
                <button className="pd-chipbtn" onClick={() => set({ permissions: [...ROLE_DEFAULT_PERMS[(f.role as UserRole) || "Cashier"]] })}>Reset to {f.role} defaults</button>
                <button className="pd-chipbtn" onClick={() => set({ permissions: [] })}>Clear</button>
                <span className="pd-permcount">{perms.length} of {ALL_PERM_KEYS.length} enabled</span>
              </div>
              <div className="pd-permgrid">
                {PERMISSION_CATALOG.map((grp) => {
                  const keys = grp.items.map((i) => i.key);
                  const all = keys.every((k) => perms.includes(k));
                  return (
                    <div className="pd-permgroup" key={grp.group}>
                      <div className="pd-permgroup-h">
                        <span>{grp.group}</span>
                        <button className="pd-minilink" onClick={() => set({ permissions: all ? perms.filter((k) => !keys.includes(k)) : [...new Set([...perms, ...keys])] })}>{all ? "none" : "all"}</button>
                      </div>
                      {grp.items.map((it) => {
                        const on = perms.includes(it.key);
                        return (
                          <label key={it.key} className={`pd-permrow${on ? " on" : ""}`}>
                            <input type="checkbox" checked={on} onChange={() => togglePerm(it.key)} />
                            <span className="pd-permrow-txt"><b>{it.label}</b><small>{it.desc}</small></span>
                            <span className="pd-permcheck">{on ? <IconCheck size={13} /> : null}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-line" disabled={!canSave} onClick={() => commit(true)}><IconShare size={14} /> {isEdit ? "Save &" : "Create &"} share</button>
          <button className="pd-btn pd-btn-primary" disabled={!canSave} onClick={() => commit(false)}>{isEdit ? "Save changes" : "Create user"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Share credentials ────────────────────────────────────────────
function ShareCreds({ user, pharmacy, onClose }: { user: StaffUser; pharmacy: string; onClose: () => void }) {
  const perms = userPerms(user);
  const full = user.role === "Owner" || perms.length >= ALL_PERM_KEYS.length;
  const msg = useMemo(() => [
    `Namma MedMate — your login for ${pharmacy}`,
    ``,
    `Login ID: ${user.username}`,
    `Password: ${user.password}`,
    `Role: ${user.role}`,
    ``,
    `Access: ${full ? "Full access" : perms.map((k) => PERM_LABEL[k]).filter(Boolean).join(", ")}`,
    ``,
    `Please sign in and change your password after first login.`,
  ].join("\n"), [user, pharmacy, perms, full]);

  const [ok, setOk] = useState(false);
  const mail = `mailto:${user.email || ""}?subject=${encodeURIComponent(`Your ${pharmacy} login`)}&body=${encodeURIComponent(msg)}`;

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Share login with {user.name}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-cred-cards">
            <div className="pd-cred-card"><span>Login ID</span><b className="pd-mono">{user.username}</b><Copy text={user.username || ""} label="login ID" /></div>
            <div className="pd-cred-card"><span>Password</span><b className="pd-mono">{user.password}</b><Copy text={user.password || ""} label="password" /></div>
          </div>
          <div className="pd-msgbox">{msg}</div>
          <div className="pd-share-row">
            <button className="pd-btn pd-btn-line" onClick={() => copy(msg, () => { setOk(true); setTimeout(() => setOk(false), 1600); })}>{ok ? <IconCheck size={15} /> : <IconCopy size={15} />} {ok ? "Copied" : "Copy message"}</button>
            <a className="pd-btn pd-btn-wa" href={user.phone ? waLink(user.phone, msg) : undefined} target="_blank" rel="noreferrer" aria-disabled={!user.phone}><IconWhatsApp size={15} /> WhatsApp</a>
            <a className="pd-btn pd-btn-line" href={user.phone ? smsLink(user.phone, msg) : undefined} aria-disabled={!user.phone}><IconMessage size={15} /> SMS</a>
            <a className="pd-btn pd-btn-line" href={mail}><IconMail size={15} /> Email</a>
          </div>
          <p className="pd-hint"><IconAlert size={12} /> Namma MedMate opens WhatsApp / SMS / email prefilled — you press send. Nothing is sent automatically.</p>
        </div>
        <div className="pd-modal-foot"><button className="pd-btn pd-btn-primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}
