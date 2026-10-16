import React, { useState } from "react";
import { createParentLinkCode } from "../../../parentPortal";
import { StudentStats } from "../shared/StudentStats";

export function SettingsPage({ studentEmail, studentId, studentName, studentProfile, activityVersion, onEditProfile, t }) {
  const [parentCode, setParentCode] = useState("");
  const [parentCodeError, setParentCodeError] = useState("");
  const [creatingParentCode, setCreatingParentCode] = useState(false);
  const [parentCodeCopied, setParentCodeCopied] = useState(false);

  const copyParentCode = async () => {
    try {
      await navigator.clipboard.writeText(parentCode);
      setParentCodeCopied(true);
    } catch {
      setParentCodeError(t("copyCodeError"));
    }
  };

  const generateParentCode = async () => {
    if (!studentId) {
      setParentCodeError(t("signInForParentCode"));
      return;
    }
    setCreatingParentCode(true);
    setParentCodeError("");
    setParentCode("");
    setParentCodeCopied(false);
    try {
      setParentCode(await createParentLinkCode(studentId));
    } catch {
      setParentCodeError(t("createParentCodeError"));
    } finally {
      setCreatingParentCode(false);
    }
  };
  const details = [
    [t("profileName"), studentProfile?.name || studentName],
    [t("email"), studentEmail],
    [t("class"), studentProfile?.studentClass],
    [t("age"), studentProfile?.age],
    [t("section"), studentProfile?.section],
    [t("school"), studentProfile?.school],
    [t("handwritingType"), studentProfile?.handwritingType],
  ];

  return (
    <section className="content settings-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">{t("settings")}</p>
          <h2>{t("myAccount")}</h2>
        </div>
      </div>
      <section className="settings-details" aria-labelledby="settings-details-heading">
        <h3 id="settings-details-heading">{t("accountDetails")}</h3>
        <dl>
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "-"}</dd>
            </div>
          ))}
        </dl>
        <button className="secondary-btn settings-edit" type="button" onClick={onEditProfile}>
          {t("editProfile")}
        </button>
      </section>
      <section className="settings-details parent-link-settings" aria-labelledby="parent-link-heading">
        <h3 id="parent-link-heading">{t("connectParentGuardian")}</h3>
        <p>{t("parentLinkDescription")}</p>
        <button className="secondary-btn settings-edit" type="button" onClick={generateParentCode} disabled={creatingParentCode}>
          {creatingParentCode ? t("creatingCode") : t("createConnectionCode")}
        </button>
        {parentCode && (
          <div className="student-parent-code" role="status">
            <span>{t("shareCodeExpiry")}</span>
            <strong>{parentCode}</strong>
            <button className="secondary-btn" type="button" onClick={copyParentCode}>
              {parentCodeCopied ? t("copied") : t("copyCode")}
            </button>
          </div>
        )}
        {parentCodeError && <p className="parent-link-error" role="alert">{parentCodeError}</p>}
      </section>
      <StudentStats
        studentEmail={studentEmail}
        studentName={studentName}
        activityVersion={activityVersion}
        t={t}
      />
    </section>
  );
}
