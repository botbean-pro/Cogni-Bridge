import React, { useEffect, useState } from "react";
import { MENTOR_EMAIL, MENTOR_PASSWORD } from "../../constants";
import { createSession, loadMentorNotes, updateSession, uploadMentorNote } from "../../mentorContent";
import { supabaseConfigured } from "../../supabaseClient";
import { MentorDashboard } from "./pages/MentorDashboard";
import { MentorLoginPage } from "./pages/MentorLoginPage";

const createSessionForm = () => ({
  title: "",
  subject: "Maths",
  date: "",
  time: "",
  endTime: "",
  meetLink: "",
});

const createNoteForm = () => ({ title: "", subject: "Maths", file: null });

export function MentorPortal({ sessions, initialLoggedIn = false, mentorId, onAddSession, onUpdateSession, onBack, t }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState(createSessionForm);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [noteForm, setNoteForm] = useState(createNoteForm);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!supabaseConfigured || !mentorId) return undefined;
    let isCurrent = true;
    loadMentorNotes(mentorId)
      .then((rows) => {
        if (isCurrent) setNotes(rows);
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

  const publishSession = async (event) => {
    event.preventDefault();
    const existingSession = editingSessionId
      ? sessions.find((item) => item.id === editingSessionId)
      : null;

    if (supabaseConfigured && mentorId) {
      try {
        const saved = editingSessionId
          ? await updateSession(editingSessionId, form)
          : await createSession(mentorId, {
            ...form,
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
        setActionError("Couldn't save the session. Please try again.");
      }
      return;
    }

    const session = {
      ...existingSession,
      ...form,
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
        setNotes((items) => [saved, ...items]);
        setActionError("");
        setNoteForm(createNoteForm());
        event.target.reset();
      } catch {
        setActionError("Couldn't upload the note. Please try again.");
      }
      return;
    }

    setNotes((items) => [
      { ...noteForm, id: String(Date.now()), fileName: noteForm.file.name },
      ...items,
    ]);
    setNoteForm(createNoteForm());
    event.target.reset();
  };

  if (!loggedIn) {
    return (
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
      onBack={onBack}
      t={t}
    />
  );
}
