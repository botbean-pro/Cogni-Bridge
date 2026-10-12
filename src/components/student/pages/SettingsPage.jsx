import React, { useState } from "react";
import { createParentLinkCode } from "../../../parentPortal";
import { StudentStats } from "../shared/StudentStats";

export function SettingsPage({ studentEmail, studentId, studentName, studentProfile, activityVersion, onEditProfile, t }) {
  const [parentCode, setParentCode] = useState("");
  const [parentCodeError, setParentCodeError] = useState("");
  const [creatingParentCode, setCreatingParentCode] = useState(false);

  const generateParentCode = async () => {
    if (!studentId) {
      setParentCodeError("Sign in with your student account to create a parent connection code.");
      return;
    }
    setCreatingParentCode(true);
    setParentCodeError("");
    setParentCode("");
    try {
      setParentCode(await createParentLinkCode(studentId));
    } catch {
      setParentCodeError("A connection code couldn't be created. Please try again.");
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
        <h3 id="parent-link-heading">Connect a parent or guardian</h3>
        <p>Create a one-time code to let a parent connect to your learning progress and contact your assigned teachers.</p>
        <button className="secondary-btn settings-edit" type="button" onClick={generateParentCode} disabled={creatingParentCode}>
          {creatingParentCode ? "Creating code…" : "Create connection code"}
        </button>
        {parentCode && <p className="student-parent-code" role="status"><span>Share this code with your parent (expires in 24 hours)</span><strong>{parentCode}</strong></p>}
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
