import React, { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, Upload } from "lucide-react";
import { readStudents } from "../constants";
import { LogoImage } from "./Brand";
<<<<<<< HEAD
import { loadStudentHandwriting, saveStudentHandwriting } from "../mentorContent";
import { supabaseConfigured } from "../supabaseClient";
import { analyzeHandwritingSample } from "../handwritingAnalysis";
=======
import { typeLabel } from "../handwriting";
import { supabase, supabaseConfigured } from "../supabaseClient";
import { saveHandwriting } from "../studentHandwriting";
>>>>>>> origin/main
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

export const StudentProfileFlow = ({ email, studentId, onBack, onComplete, existingProfile, initialClass = "", handwritingPrompt = false, t }) => {
  const [profile, setProfile] = useState(existingProfile || { name: "", studentClass: initialClass, age: "", section: "", school: "" });
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const analyzingRef = useRef(false);

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

<<<<<<< HEAD
  const submit = async (event) => {
    event.preventDefault();
    if (!image) {
      setError("uploadClearImage");
      return;
    }
    setStep("loading");
    let analysis;
    try {
      analysis = await analyzeHandwritingSample(image);
    } catch {
      setError("handwritingAnalysisReadError");
      setStep("form");
      return;
    }
    let result = {
      ...profile,
      email,
      handwritingImage: image,
      handwritingImageName: imageName || "Demo sample",
      handwritingType: analysis.type,
      handwritingPatternKey: analysis.patternKey,
      handwritingMeaningKey: analysis.meaningKey,
=======
  // Saves edited account details (class) without a new handwriting sample.
  const saveDetails = async () => {
    const studentClass = profile.studentClass.trim();
    if (!studentClass) return;
    analyzingRef.current = true;
    try {
      if (supabaseConfigured && existingProfile?.id) {
        const { error: updateError } = await supabase.auth.updateUser({ data: { student_class: studentClass } });
        if (updateError) throw updateError;
      } else {
        const students = readStudents();
        localStorage.setItem("cognibridge_students", JSON.stringify(
          students.map((student) => student.email === email ? { ...student, studentClass } : student),
        ));
      }
      onComplete({ ...existingProfile, studentClass });
    } catch {
      setError("profileSaveFail");
    } finally {
      analyzingRef.current = false;
    }
  };

  const submit = (event) => {
    event.preventDefault();
    // Analysis needs a real image and only runs once per submission (double-clicks are ignored).
    if (analyzingRef.current || step !== "form") return;
    if (!image && existingProfile) {
      saveDetails();
      return;
    }
    if (!image) {
      setError("chooseHandwritingImage");
      return;
    }
    analyzingRef.current = true;
    const result = {
      ...profile,
      email,
      handwritingImage: image,
      handwritingImageName: imageName,
      handwritingType: `Type ${1 + Math.floor(Math.random() * 4)}`,
>>>>>>> origin/main
      analyzedAt: new Date().toISOString(),
    };
    // Signed-in Supabase students: the photo and result go to the database, not the browser.
    if (supabaseConfigured && existingProfile?.id) {
      setStep("loading");
      saveHandwriting(existingProfile.id, image, result.handwritingType)
        .then(() => {
          setProfile(result);
          window.setTimeout(() => setStep("result"), 2200);
        })
        .catch(() => {
          analyzingRef.current = false;
          setError("hw_saveFail");
          setStep("form");
        });
      return;
    }
    try {
      if (supabaseConfigured && studentId && image) {
        await saveStudentHandwriting(studentId, image, result.handwritingType);
        const saved = await loadStudentHandwriting(studentId);
        result = { ...result, ...saved, handwritingImageName: imageName || "Handwriting sample" };
      }
    } catch {
      setError("The handwriting sample couldn't be saved. Please try again.");
      setStep("form");
      return;
    }
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
          <div className="analysis-burst" aria-hidden="true">
            <span className="burst-shape burst-triangle burst-one" />
            <span className="burst-shape burst-circle burst-two" />
            <span className="burst-shape burst-square burst-three" />
            <span className="burst-shape burst-triangle burst-four" />
            <span className="burst-shape burst-circle burst-five" />
            <span className="burst-shape burst-square burst-six" />
          </div>
          <div className="profile-result-mark"><CheckCircle2 size={26} /></div>
          <p className="eyebrow">{t("handwritingAnalysis")}</p>
          <h1>{profile.name || t("profileYourProfile")}</h1>
<<<<<<< HEAD
          <p className="handwriting-type">{profile.handwritingPatternKey ? t(profile.handwritingPatternKey) : profile.handwritingType}</p>
          {profile.handwritingImage && <img className="handwriting-preview" src={profile.handwritingImage} alt="Uploaded handwriting sample" />}
      <p className="profile-result-copy">{t(profile.handwritingMeaningKey || "handwritingAnalysisDisclaimer")}</p>
      <p className="profile-result-copy handwriting-disclaimer">{t("handwritingAnalysisDisclaimer")}</p>
=======
          <p className="handwriting-type">{typeLabel(t, profile.handwritingType)}</p>
          {profile.handwritingImage && <img className="handwriting-preview" src={profile.handwritingImage} alt={t("hw_altUploaded")} />}
          <p className="profile-result-copy">{t("profileCompleteCopy")}</p>
>>>>>>> origin/main
          <button className="primary-btn" onClick={() => onComplete(profile)}>{existingProfile ? t("backToAccount") : t("continueToCogniBridge")}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-flow-page">
      <button className="profile-flow-back" onClick={onBack}><ArrowLeft size={18} /> {t(handwritingPrompt ? "skipForNow" : "back")}</button>
      <section className="profile-flow-card">
        <div className="profile-flow-icon"><ImagePlus size={24} /></div>
        <p className="eyebrow">{existingProfile ? t("studentAccount") : t("newStudentProfile")}</p>
        <h1>{handwritingPrompt ? t("handwritingPromptTitle") : existingProfile ? t("updateHandwriting") : t("setUpLearningProfile")}</h1>
        <p className="profile-flow-copy">{handwritingPrompt ? t("handwritingPromptCopy") : existingProfile ? t("analyzeNewImage") : <>{t("addSchoolDetails")} {t("emailAccount")}: <strong>{email}</strong></>}</p>
        {existingProfile && <>
          <div className="profile-locked-name"><span>{t("profileName")}</span><strong>{existingProfile.name}</strong></div>
          <div className="current-handwriting-result"><span>{t("handwritingType")}</span><strong>{typeLabel(t, existingProfile.handwritingType) || t("notAnalyzed")}</strong>{existingProfile.handwritingImage && <img src={existingProfile.handwritingImage} alt={t("currentHandwritingSample")} />}</div>
        </>}
        <form className="profile-details-form" onSubmit={submit}>
          {existingProfile && <label>{t("class")}<input value={profile.studentClass || ""} onChange={(event) => setProfile({ ...profile, studentClass: event.target.value })} required /></label>}
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
            {image ? <img src={image} alt={t("hw_altPreview")} /> : <Upload size={22} />}
            <span><strong>{image ? t("changeHandwritingImage") : t("uploadHandwriting")}</strong><small>{imageName || t("optionalHandwritingHint")}</small></span>
          </button>
<<<<<<< HEAD
          {error && <p className="profile-flow-error" role="alert">{error.startsWith("The handwriting") ? error : t(error)}</p>}
          <button className="primary-btn" type="submit">{existingProfile ? t("analyzeNewImageButton") : t("analyzeImage")}</button>
          {!existingProfile && !handwritingPrompt && <button type="button" className="profile-skip-button" onClick={() => onComplete({ ...profile, email })}>{t("skipForNow")}</button>}
=======
          {error && <p className="profile-flow-error" role="alert">{t(error)}</p>}
          <button className="primary-btn" type="submit" disabled={!image && !existingProfile}>{existingProfile ? (image ? t("analyzeNewImageButton") : t("saveChanges")) : t("analyzeImage")}</button>
>>>>>>> origin/main
        </form>
      </section>
    </main>
  );
};
