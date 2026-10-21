import React, { useEffect, useState } from "react";
import { MENTOR_EMAIL, MENTOR_PASSWORD } from "../../constants";
import { createPrivateSession } from "../../privateSessions";
import { createSession, deleteMentorNote, downloadNote, loadMentorNotes, updateSession, uploadMentorNote, viewNote } from "../../mentorContent";
import { supabaseConfigured } from "../../supabaseClient";
import { MentorDashboard } from "./pages/MentorDashboard";
import { useRouteTab } from "../../routes";

const mentorTabs = ["overview", "performance", "leaderboard", "schedule", "notes", "sensory", "messages", "settings"];
import { MentorLoginPage } from "./pages/MentorLoginPage";
import { LanguagePicker } from "../AccessAndAuth";

const createSessionForm = () => ({
  title: "",
  subject: "Maths",
  date: "",
  time: "",
  endTime: "",
  meetLink: "",
  privateStudentId: "",
});

const createNoteForm = () => ({ title: "", subject: "Maths", file: null });

export function MentorPortal({ sessions, notes, initialLoggedIn = false, mentorId, language, setLanguage, onAddSession, onUpdateSession, onAddNote, onRemoveNote, onLoadNotes, onBack, accessibilityOpen, onToggleAccessibility, t }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useRouteTab("mentor", mentorTabs);
  const [form, setForm] = useState(createSessionForm);
  const [privateVersion, setPrivateVersion] = useState(0);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [noteForm, setNoteForm] = useState(createNoteForm);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!supabaseConfigured || !mentorId) return undefined;
    let isCurrent = true;
    loadMentorNotes(mentorId)
      .then((rows) => {
        if (isCurrent) onLoadNotes(rows);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [mentorId]);

  const signIn = (event) => {
    event.preventDefault();
    const validCredentials =
      email.trim().toLowerCase() === MENTOR_EMAIL && password === MENTOR_PASSWORD;

    if (!validCredentials) {
      setError("invalidCredentials");
      return;
    }

    setLoggedIn(true);
    setError("");
  };

  // Accepts "meet.google.com/abc-defg-hij" as well as a full link; anything else is rejected.
  const normalizeMeetLink = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
      return /^https?:$/.test(url.protocol) && url.hostname.includes(".") ? url.href : null;
    } catch {
      return null;
    }
  };

  const publishSession = async (event) => {
    event.preventDefault();
    const meetLink = normalizeMeetLink(form.meetLink);
    if (!meetLink) {
      setActionError(t("md_badMeetLink"));
      return;
    }
    const sessionForm = { ...form, meetLink };

    // A session for one chosen student: only that student (and this mentor) can see it.
    if (form.privateStudentId && !editingSessionId && supabaseConfigured && mentorId) {
      try {
        await createPrivateSession(mentorId, { ...sessionForm, studentId: form.privateStudentId });
        setActionError("");
        setForm(createSessionForm());
        setPrivateVersion((current) => current + 1);
      } catch (privateError) {
        console.error("Private session failed:", privateError);
        setActionError(t("ps_saveFail"));
      }
      return;
    }
    const existingSession = editingSessionId
      ? sessions.find((item) => item.id === editingSessionId)
      : null;

    if (supabaseConfigured && mentorId) {
      try {
        const saved = editingSessionId
          ? await updateSession(editingSessionId, sessionForm)
          : await createSession(mentorId, {
            ...sessionForm,
            description: existingSession?.description || "A focused Maths session led by Priya Sharma.",
            learn: existingSession?.learn || [
              "Understand the core idea",
              "Work through guided examples",
              "Practise independently",
            ],
          });
        if (editingSessionId) onUpdateSession({ ...existingSession, ...saved });
        else onAddSession(saved);
        setActionError("");
        setEditingSessionId(null);
        setForm(createSessionForm());
        setTab("overview");
      } catch {
        setActionError(t("ms_saveSessionFail"));
      }
      return;
    }

    const session = {
      ...existingSession,
      ...sessionForm,
      id: editingSessionId || String(Date.now()),
      attendees: existingSession?.attendees ?? 0,
      titleKey: undefined,
      description: existingSession?.description || "A focused Maths session led by Priya Sharma.",
      descriptionKey: existingSession?.descriptionKey,
      learn: existingSession?.learn || [
        "Understand the core idea",
        "Work through guided examples",
        "Practise independently",
      ],
    };
    if (editingSessionId) onUpdateSession(session);
    else onAddSession(session);
    setEditingSessionId(null);
    setForm(createSessionForm());
    setTab("overview");
  };

  const editSession = (session) => {
    setEditingSessionId(session.id);
    setForm({
      title: session.title,
      subject: session.subject,
      date: session.date,
      time: session.time,
      endTime: session.endTime,
      meetLink: session.meetLink,
    });
    setTab("schedule");
  };

  const uploadNote = async (event) => {
    event.preventDefault();
    if (!noteForm.file) return;

    const allowedFileType = /\.(pdf|doc|docx|png|jpe?g)$/i.test(noteForm.file.name);
    const withinSizeLimit = noteForm.file.size <= 10 * 1024 * 1024;
    if (!allowedFileType || !withinSizeLimit) return;

    if (supabaseConfigured && mentorId) {
      try {
        const saved = await uploadMentorNote(mentorId, noteForm);
        onAddNote(saved);
        setActionError("");
        setNoteForm(createNoteForm());
        event.target.reset();
      } catch (uploadError) {
        console.error("Note upload failed:", uploadError);
        setActionError(t("ms_uploadNoteFail"));
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onAddNote({
      title: noteForm.title,
      subject: noteForm.subject,
      id: String(Date.now()),
      fileName: noteForm.file.name,
      dataUrl: reader.result,
    });
    reader.readAsDataURL(noteForm.file);
    setNoteForm(createNoteForm());
    event.target.reset();
  };

  const downloadMentorNote = async (note) => {
    try {
      await downloadNote(note);
      setActionError("");
    } catch (downloadError) {
      console.error("Note download failed:", downloadError);
      setActionError(t("noteDownloadError"));
    }
  };

  const viewMentorNote = async (note) => {
    try {
      await viewNote(note);
      setActionError("");
    } catch (viewError) {
      console.error("Note view failed:", viewError);
      setActionError(t("md_noteViewFail"));
    }
  };

  const removeMentorNote = async (note) => {
    if (!window.confirm(t("md_deleteNoteConfirm", { title: note.title }))) return;
    try {
      if (supabaseConfigured && mentorId) await deleteMentorNote(note);
      onRemoveNote(note.id);
      setActionError("");
    } catch (deleteError) {
      console.error("Note delete failed:", deleteError);
      setActionError(t("md_deleteNoteFail"));
    }
  };

  if (!loggedIn) {
    return (
      <div className="mentor-login-shell">
      <div className="mentor-login-language"><LanguagePicker compact value={language} onChange={setLanguage} t={t} /></div>
      <MentorLoginPage
        email={email}
        password={password}
        error={error}
        t={t}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={signIn}
        onBack={onBack}
      />
      </div>
    );
  }

  return (
    <MentorDashboard
      sessions={sessions}
      mentorId={mentorId}
      notes={notes}
      actionError={actionError}
      tab={tab}
      setTab={(nextTab) => { setActionError(""); setTab(nextTab); }}
      form={form}
      setForm={setForm}
      noteForm={noteForm}
      setNoteForm={setNoteForm}
      onPublishSession={publishSession}
      onEditSession={editSession}
      editingSessionId={editingSessionId}
      onCancelEdit={() => { setEditingSessionId(null); setForm(createSessionForm()); }}
      onUploadNote={uploadNote}
      privateVersion={privateVersion}
      onDownloadNote={downloadMentorNote}
      onViewNote={viewMentorNote}
      onDeleteNote={removeMentorNote}
      onBack={onBack}
      accessibilityOpen={accessibilityOpen}
      onToggleAccessibility={onToggleAccessibility}
      t={t}
    />
  );
}
