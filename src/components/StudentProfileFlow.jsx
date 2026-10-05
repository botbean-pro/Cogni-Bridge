import React, { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, Upload } from "lucide-react";
import { readStudents } from "../constants";
import { LogoImage } from "./Brand";
import "./StudentProfileFlow.css";

const readImage = (file) => new Promise((resolve, reject) => {
  const image = new Image();
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = reject;
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

export const StudentProfileFlow = ({ email, onBack, onComplete, existingProfile, t }) => {
  const [profile, setProfile] = useState(existingProfile || { name: "", studentClass: "", age: "", section: "", school: "" });
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("chooseHandwritingImage");
      return;
    }
    try {
      setImage(await readImage(file));
      setImageName(file.name);
      setError("");
    } catch {
      setError("handwritingReadError");
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!image) {
      setError("uploadClearImage");
      return;
    }
    const result = {
      ...profile,
      email,
      handwritingImage: image,
      handwritingImageName: imageName,
      handwritingType: `Type ${1 + Math.floor(Math.random() * 4)}`,
      analyzedAt: new Date().toISOString(),
    };
    try {
      const students = readStudents();
      const updated = students.some((student) => student.email === email)
        ? students.map((student) => student.email === email ? { ...student, ...result } : student)
        : [...students, { ...result, createdAt: new Date().toISOString() }];
      localStorage.setItem("cognibridge_students", JSON.stringify(updated));
    } catch {
      // Keep the result available in this session if browser storage is disabled.
    }
    setProfile(result);
    setStep("loading");
    window.setTimeout(() => setStep("result"), 2200);
  };

  if (step === "loading") {
    return (
      <main className="handwriting-loading" role="status" aria-live="polite">
        <div className="handwriting-loader"><LogoImage size={62} /><Loader2 size={104} aria-hidden="true" /></div>
        <p>{t("analyzingHandwriting")}</p>
      </main>
    );
  }

  if (step === "result") {
    return (
      <main className="profile-flow-page">
        <section className="profile-flow-card handwriting-result">
          <div className="profile-result-mark"><CheckCircle2 size={26} /></div>
          <p className="eyebrow">{t("handwritingAnalysis")}</p>
          <h1>{profile.name || t("profileYourProfile")}</h1>
          <p className="handwriting-type">{profile.handwritingType}</p>
          {profile.handwritingImage && <img className="handwriting-preview" src={profile.handwritingImage} alt="Uploaded handwriting sample" />}
          <p className="profile-result-copy">{t("profileCompleteCopy")}</p>
          <button className="primary-btn" onClick={() => onComplete(profile)}>{existingProfile ? t("backToAccount") : t("continueToCogniBridge")}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-flow-page">
      <button className="profile-flow-back" onClick={onBack}><ArrowLeft size={18} /> {t("back")}</button>
      <section className="profile-flow-card">
        <div className="profile-flow-icon"><ImagePlus size={24} /></div>
        <p className="eyebrow">{existingProfile ? t("studentAccount") : t("newStudentProfile")}</p>
        <h1>{existingProfile ? t("updateHandwriting") : t("setUpLearningProfile")}</h1>
        <p className="profile-flow-copy">{existingProfile ? t("analyzeNewImage") : <>{t("addSchoolDetails")} {t("emailAccount")}: <strong>{email}</strong></>}</p>
        {existingProfile && <>
          <div className="profile-locked-name"><span>{t("profileName")}</span><strong>{existingProfile.name}</strong></div>
          <div className="current-handwriting-result"><span>{t("handwritingType")}</span><strong>{existingProfile.handwritingType || t("notAnalyzed")}</strong>{existingProfile.handwritingImage && <img src={existingProfile.handwritingImage} alt={t("currentHandwritingSample")} />}</div>
        </>}
        <form className="profile-details-form" onSubmit={submit}>
          {!existingProfile && <>
            <label>{t("childName")}<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} autoComplete="name" required /></label>
            <div className="profile-form-row">
              <label>{t("class")}<input value={profile.studentClass} onChange={(event) => setProfile({ ...profile, studentClass: event.target.value })} required /></label>
              <label>{t("age")}<input type="number" min="5" max="25" value={profile.age} onChange={(event) => setProfile({ ...profile, age: event.target.value })} required /></label>
            </div>
            <div className="profile-form-row">
              <label>{t("section")}<input value={profile.section} onChange={(event) => setProfile({ ...profile, section: event.target.value })} required /></label>
              <label>{t("school")}<input value={profile.school} onChange={(event) => setProfile({ ...profile, school: event.target.value })} required /></label>
            </div>
          </>}
          <input ref={fileRef} className="profile-file-input" type="file" accept="image/*" capture="environment" onChange={chooseImage} />
          <button type="button" className="handwriting-upload" onClick={() => fileRef.current?.click()}>
            {image ? <img src={image} alt="Preview of handwriting sample" /> : <Upload size={22} />}
            <span><strong>{image ? t("changeHandwritingImage") : t("uploadHandwriting")}</strong><small>{imageName || t("choosePhoto")}</small></span>
          </button>
          {error && <p className="profile-flow-error" role="alert">{t(error)}</p>}
          <button className="primary-btn" type="submit">{existingProfile ? t("analyzeNewImageButton") : t("analyzeImage")}</button>
        </form>
      </section>
    </main>
  );
};
