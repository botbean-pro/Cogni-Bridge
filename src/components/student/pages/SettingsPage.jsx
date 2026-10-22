import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { getSessionSubjectLabel, subjects } from "../../../constants";
import { createParentLinkCode } from "../../../parentPortal";
import { loadScreenTime, readLocalScreenTime } from "../../../screenTime";
import { supabaseConfigured } from "../../../supabaseClient";
import { StudentStats } from "../shared/StudentStats";
import { typeLabel } from "../../../handwriting";
import { ScreenTimeSummary } from "../../shared/ScreenTimeSummary";

export function SettingsPage({ studentEmail, studentId, studentName, studentProfile, preferredSubjects = [], onSaveSubjects, premiumSubscription, activityVersion, screenTimeVersion, screenTimeStudentKey, screenTimeDemoMode, onEditProfile, t }) {
  const [parentCode, setParentCode] = useState("");
  const [parentCodeError, setParentCodeError] = useState("");
  const [creatingParentCode, setCreatingParentCode] = useState(false);
  const [subjectSelection, setSubjectSelection] = useState(preferredSubjects);
  const [savingSubjects, setSavingSubjects] = useState(false);

  useEffect(() => setSubjectSelection(preferredSubjects), [preferredSubjects]);

  const toggleSubject = (subject) => setSubjectSelection((current) => (
    current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject]
  ));

  const saveSubjects = async () => {
    if (!subjectSelection.length || savingSubjects) return;
    setSavingSubjects(true);
    await onSaveSubjects(subjectSelection);
    setSavingSubjects(false);
  };
  const [parentCodeCopied, setParentCodeCopied] = useState(false);
  const [screenTimeRows, setScreenTimeRows] = useState([]);

  useEffect(() => {
    let current = true;
    setScreenTimeRows([]);
    if (screenTimeDemoMode) {
      setScreenTimeRows(readLocalScreenTime(screenTimeStudentKey));
    } else if (supabaseConfigured && screenTimeStudentKey) {
      loadScreenTime([screenTimeStudentKey]).then((rows) => { if (current) setScreenTimeRows(rows); }).catch(() => {});
    }
    return () => { current = false; };
  }, [screenTimeVersion, screenTimeStudentKey, screenTimeDemoMode]);

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
      setParentCodeError(t("ms_pcNeedStudent"));
      return;
    }
    setCreatingParentCode(true);
    setParentCodeError("");
    setParentCode("");
    setParentCodeCopied(false);
    setParentCodeCopied(false);
    try {
      setParentCode(await createParentLinkCode(studentId));
    } catch {
      setParentCodeError(t("ms_pcFail"));
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
    [t("handwritingType"), typeLabel(t, studentProfile?.handwritingType) || t("notAnalyzed")],
  ];
  const planNameKeys = { monthly: "pf_planMonthly", quarterly: "pf_planQuarterly", yearly: "pf_planYearly" };
  const subscriptionActive = Boolean(premiumSubscription?.expiresAt && new Date(premiumSubscription.expiresAt) > new Date());

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
      <section className="settings-details settings-subjects" aria-labelledby="settings-subjects-heading">
        <h3 id="settings-subjects-heading">{t("chooseStudySubjects")}</h3>
        <p>{t("chooseStudySubjectsCopy")}</p>
        <div className="student-subject-options">
          {subjects.map((subject) => {
            const selected = subjectSelection.includes(subject);
            return <button
              type="button"
              key={subject}
              aria-pressed={selected}
              className={selected ? "selected" : ""}
              onClick={() => toggleSubject(subject)}
            >
              <span>{getSessionSubjectLabel(subject, t)}</span>
              <span className="student-subject-check">{selected && <Check size={17} />}</span>
            </button>;
          })}
        </div>
        <button className="secondary-btn settings-edit" type="button" disabled={!subjectSelection.length || savingSubjects} onClick={saveSubjects}>
          {t(savingSubjects ? "savingSubjects" : "saveSubjects")}
        </button>
      </section>
      <section className="settings-details" aria-labelledby="premium-settings-heading">
        <h3 id="premium-settings-heading">{t("pf_membershipHeading")}</h3>
        <dl>
          <div><dt>{t("pf_membershipPlan")}</dt><dd>{premiumSubscription?.planId === "cogni-points" ? "Premium Flow · Cogni Points reward" : premiumSubscription?.planId && planNameKeys[premiumSubscription.planId] ? `${t("premiumFlow")} · ${t(planNameKeys[premiumSubscription.planId])}` : t("pf_freePlan")}</dd></div>
          <div><dt>{t("pf_membershipStatus")}</dt><dd>{subscriptionActive ? t("pf_membershipActive") : premiumSubscription ? t("pf_membershipExpired") : t("pf_freePlan")}</dd></div>
          {premiumSubscription?.expiresAt && <div><dt>{t(subscriptionActive ? "pf_validUntil" : "pf_expiredOn")}</dt><dd>{new Date(premiumSubscription.expiresAt).toLocaleDateString()}</dd></div>}
          {premiumSubscription?.paymentType === "demo" && <div><dt>{t("pf_paymentType")}</dt><dd>{t("pf_demoPayment")}</dd></div>}
          {premiumSubscription?.paymentType === "cogni-points" && <div><dt>{t("pf_paymentType")}</dt><dd>Cogni Points redemption</dd></div>}
        </dl>
      </section>
      <section className="settings-details parent-link-settings" aria-labelledby="parent-link-heading">
        <h3 id="parent-link-heading">{t("ms_pcHeading")}</h3>
        <p>{t("ms_pcCopy")}</p>
        <button className="secondary-btn settings-edit" type="button" onClick={generateParentCode} disabled={creatingParentCode}>
          {t(creatingParentCode ? "ms_pcCreating" : "ms_pcCreate")}
        </button>
        {parentCode && (
          <div className="student-parent-code" role="status">
            <span>{t("ms_pcShare")}</span>
            <strong>{parentCode}</strong>
            <button className="secondary-btn" type="button" onClick={copyParentCode}>
              {t(parentCodeCopied ? "copied" : "copyCode")}
            </button>
          </div>
        )}
        {parentCodeError && <p className="parent-link-error" role="alert">{parentCodeError}</p>}
      </section>
      <ScreenTimeSummary rows={screenTimeRows} studentId={supabaseConfigured ? screenTimeStudentKey : undefined} t={t} />
      <StudentStats
        studentEmail={studentEmail}
        studentName={studentName}
        activityVersion={activityVersion}
        t={t}
      />
    </section>
  );
}
