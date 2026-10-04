import React, { useState } from "react";
import { MENTOR_EMAIL, MENTOR_PASSWORD } from "../../constants";
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

export function MentorPortal({ sessions, initialLoggedIn = false, onAddSession, onBack }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState(createSessionForm);
  const [noteForm, setNoteForm] = useState(createNoteForm);

  const signIn = (event) => {
    event.preventDefault();
    const validCredentials =
      email.trim().toLowerCase() === MENTOR_EMAIL && password === MENTOR_PASSWORD;

    if (!validCredentials) {
      setError("Incorrect mentor email or password.");
      return;
    }

    setLoggedIn(true);
    setError("");
  };

  const publishSession = (event) => {
    event.preventDefault();
    onAddSession({
      ...form,
      id: String(Date.now()),
      attendees: 0,
      description: "A focused Maths session led by Priya Sharma.",
      learn: [
        "Understand the core idea",
        "Work through guided examples",
        "Practise independently",
      ],
    });
    setForm(createSessionForm());
    setTab("overview");
  };

  const uploadNote = (event) => {
    event.preventDefault();
    if (!noteForm.file) return;

    const allowedFileType = /\.(pdf|doc|docx|png|jpe?g)$/i.test(noteForm.file.name);
    const withinSizeLimit = noteForm.file.size <= 10 * 1024 * 1024;
    if (!allowedFileType || !withinSizeLimit) return;

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
      notes={notes}
      tab={tab}
      setTab={setTab}
      form={form}
      setForm={setForm}
      noteForm={noteForm}
      setNoteForm={setNoteForm}
      onPublishSession={publishSession}
      onUploadNote={uploadNote}
      onBack={onBack}
    />
  );
}
