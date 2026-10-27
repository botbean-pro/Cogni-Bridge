import React, { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, Upload } from "lucide-react";
import { readStudents } from "../constants";
import { LogoImage } from "./Brand";
import { supabase, supabaseConfigured } from "../supabaseClient";
import { saveHandwriting } from "../studentHandwriting";
import { classifyHandwritingSample } from "../handwritingAnalysis";
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
  // A new demo account already gave its name on the create-account form; don't ask for it twice.
  const [profile, setProfile] = useState(() => existingProfile || {
    name: readStudents().find((student) => student.email === email)?.name || "",
    studentClass: initialClass,
    age: "",
    section: "",
    school: "",
  });
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const analyzingRef = useRef(false);
  const alreadyChecked = Array.isArray(existingProfile?.handwritingSigns);

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

  // Saves the edited account details: in Supabase the name is the profile's display_name and the
  // rest lives in the auth user's metadata; in demo mode it all goes to the localStorage record.
  const saveDetails = async () => {
    const details = {
      name: profile.name.trim(),
      studentClass: profile.studentClass.trim(),
      age: String(profile.age ?? "").trim(),
      section: (profile.section || "").trim(),
      school: (profile.school || "").trim(),
    };
    if (supabaseConfigured && existingProfile?.id) {
      // Name first: updateUser makes App reload the profile, which should already see the new name.
      if (details.name !== existingProfile.name) {
        const { error: nameError } = await supabase.from("profiles").update({ display_name: details.name }).eq("id", existingProfile.id);
        if (nameError) throw nameError;
      }
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: details.name, student_class: details.studentClass, age: details.age, section: details.section, school: details.school },
      });
      if (metadataError) throw metadataError;
    } else {
      const students = readStudents();
      localStorage.setItem("cognibridge_students", JSON.stringify(
        students.map((student) => student.email === email ? { ...student, ...details } : student),
      ));
    }
    return details;
  };

  const submit = async (event) => {
    event.preventDefault();
    // Analysis needs a real image and only runs once per submission (double-clicks are ignored).
    if (analyzingRef.current || step !== "form") return;
    // The handwriting prompt is only done once a new sample has been analysed.
    if (handwritingPrompt && !image) {
      setError("chooseHandwritingImage");
      return;
    }
    if (existingProfile) {
      // Details save on their own; a new handwriting photo is optional.
      analyzingRef.current = true;
      let details;
      try {
        details = await saveDetails();
      } catch {
        analyzingRef.current = false;
        setError("profileSaveFail");
        return;
      }
      analyzingRef.current = false;
      if (!image) {
        onComplete({ ...existingProfile, ...details });
        return;
      }
    }
    if (!image) {
      setError("chooseHandwritingImage");
      return;
    }
    analyzingRef.current = true;
    setStep("loading");
    let analysis;
    try {
      analysis = await classifyHandwritingSample(image);
    } catch {
      analyzingRef.current = false;
      setError("handwritingAnalysisReadError");
      setStep("form");
      return;
    }
    const result = {
      ...profile,
      email,
      handwritingImage: image,
      handwritingImageName: imageName,
      handwritingType: analysis.type,
      handwritingPatternKey: analysis.patternKey,
      handwritingMeaningKey: analysis.meaningKey,
      handwritingSigns: analysis.signs || [],
      analyzedAt: new Date().toISOString(),
    };
    // Signed-in Supabase students: the photo and result go to the database, not the browser.
    if (supabaseConfigured && existingProfile?.id) {
      setStep("loading");
      saveHandwriting(existingProfile.id, image, result.handwritingType, result.handwritingSigns)
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
    // A new Supabase student (no profile row in the form yet) still keeps the sample in the database.
    if (supabaseConfigured && studentId) {
      try {
        await saveHandwriting(studentId, image, result.handwritingType, result.handwritingSigns);
      } catch {
        analyzingRef.current = false;
        setError("hw_saveFail");
        setStep("form");
        return;
      }
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

  let uploadHint = t("hw_requiredHint");
  if (alreadyChecked) {
    uploadHint = t("hw_replaceHint");
  }
  let submitLabel = t("analyzeImage");
  if (existingProfile && !image && !handwritingPrompt) {
    submitLabel = t("saveChanges");
  }

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
          <p className="handwriting-type">{t("hw_checkDone")}</p>
          {profile.handwritingImage && <img className="handwriting-preview" src={profile.handwritingImage} alt={t("hw_altUploaded")} />}
          <p className="profile-result-copy">{t("hw_checkDoneCopy")}</p>
          <button className="primary-btn" onClick={() => onComplete(profile)}>{existingProfile && !handwritingPrompt ? t("backToAccount") : t("continueToCogniBridge")}</button>
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
        <h1>{handwritingPrompt ? t("handwritingPromptTitle") : existingProfile ? t("editProfile") : t("setUpLearningProfile")}</h1>
        <p className="profile-flow-copy">{handwritingPrompt ? t("hw_promptCopy") : <>{t("addSchoolDetails")} {t("emailAccount")}: <strong>{email}</strong></>}</p>
        {alreadyChecked && <>
          <div className="current-handwriting-result"><span>{t("hw_checkLabel")}</span><strong>{t("hw_checkStatusDone")}</strong>{existingProfile.handwritingImage && <img src={existingProfile.handwritingImage} alt={t("currentHandwritingSample")} />}</div>
        </>}
        <form className="profile-details-form" onSubmit={submit}>
          <label>{existingProfile ? t("profileName") : t("childName")}<input value={profile.name || ""} maxLength={80} onChange={(event) => setProfile({ ...profile, name: event.target.value })} autoComplete="name" required /></label>
          <div className="profile-form-row">
            <label>{t("class")}<input value={profile.studentClass || ""} onChange={(event) => setProfile({ ...profile, studentClass: event.target.value })} required /></label>
            <label>{t("age")}<input type="number" min="5" max="25" value={profile.age || ""} onChange={(event) => setProfile({ ...profile, age: event.target.value })} required={!existingProfile} /></label>
          </div>
          <div className="profile-form-row">
            <label>{t("section")}<input value={profile.section || ""} onChange={(event) => setProfile({ ...profile, section: event.target.value })} required={!existingProfile} /></label>
            <label>{t("school")}<input value={profile.school || ""} onChange={(event) => setProfile({ ...profile, school: event.target.value })} required={!existingProfile} /></label>
          </div>
          <input ref={fileRef} className="profile-file-input" type="file" accept="image/*" capture="environment" onChange={chooseImage} />
          <button type="button" className="handwriting-upload" onClick={() => fileRef.current?.click()}>
            {image ? <img src={image} alt={t("hw_altPreview")} /> : <Upload size={22} />}
            <span><strong>{image ? t("changeHandwritingImage") : t("uploadHandwriting")}</strong><small>{imageName || uploadHint}</small></span>
          </button>
          {error && <p className="profile-flow-error" role="alert">{t(error)}</p>}
          {/* Until the one-time check is done, the main button analyses the photo (and needs one). */}
          <button className="primary-btn" type="submit" disabled={!image && (!existingProfile || handwritingPrompt)}>{submitLabel}</button>
        </form>
      </section>
    </main>
  );
};
