import React, { useState } from "react";
import { ArrowRight, Link2, X } from "lucide-react";

// A student creates a one-time code in their Settings; entering it here links the
// accounts (connect_parent_with_code in 20261012000300_parent_portal.sql).
export function ConnectChildCard({ title, intro, onConnect, onDismiss, delay = 0, t }) {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const childName = await onConnect(code.trim());
      setCode("");
      if (childName) setNotice(t("childConnected", { child: childName }));
    } catch {
      setError(t("connectError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`parent-card parent-connect-card parent-rise${onDismiss ? " is-dismissible" : ""}`} style={{ "--rise-delay": `${delay}ms` }}>
      {onDismiss && (
        <button type="button" className="parent-connect-dismiss" onClick={onDismiss} aria-label={t("close")} title={t("close")}>
          <X size={16} />
        </button>
      )}
      <div className="parent-connect-copy">
        <span className="parent-card-icon"><Link2 size={20} /></span>
        <div>
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
          <p>{t("connectChildCopy")}</p>
        </div>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="parent-child-code">{t("connectionCode")}</label>
        <div>
          <input id="parent-child-code" value={code} maxLength={32} autoComplete="off" onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t("enterCode")} required />
          <button type="submit" disabled={saving}>{saving ? t("connecting") : <>{t("connectButton")} <ArrowRight size={17} /></>}</button>
        </div>
        {error && <p className="parent-message parent-error" role="alert">{error}</p>}
        {notice && <p className="parent-message parent-success" role="status">{notice}</p>}
      </form>
    </section>
  );
}
