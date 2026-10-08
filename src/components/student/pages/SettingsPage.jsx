import React from "react";
import { StudentStats } from "../shared/StudentStats";

export function SettingsPage({ studentEmail, studentName, studentProfile, activityVersion, onEditProfile, t }) {
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
      <StudentStats
        studentEmail={studentEmail}
        studentName={studentName}
        activityVersion={activityVersion}
        t={t}
      />
    </section>
  );
}