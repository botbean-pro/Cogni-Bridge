import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Eye, EyeOff, Languages, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { DEMO_STUDENT_EMAIL, DEMO_STUDENT_PASSWORD, MENTOR_EMAIL, MENTOR_PASSWORD, classNames, indianLanguages, readStudents } from "../constants";

function LanguagePicker({ value, onChange }) { return <label className="language-picker"><span><Languages size={18} /><strong>Language</strong></span><select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Choose learning language">{indianLanguages.map(([native, english]) => <option key={english} value={english}>{native}</option>)}</select><small>Choose the language used for learning support.</small></label>; }
function AuthModal({ onClose, onStudentSuccess, onCreateAccount, onMentor }) {
  const [tab, setTab] = useState("student"), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [error, setError] = useState(""), [showPassword, setShowPassword] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  useEffect(() => { if (tab !== "student" || !googleClientId || document.querySelector("script[data-google-identity]")) return; const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true; script.dataset.googleIdentity = "true"; document.head.appendChild(script); }, [tab, googleClientId]);
  const changeTab = (nextTab) => { setTab(nextTab); setError(""); if (nextTab === "mentor") { setEmail(MENTOR_EMAIL); setPassword(MENTOR_PASSWORD); } else { setEmail(""); setPassword(""); } };
  const submit = (event) => { event.preventDefault(); if (tab === "mentor") return email.trim().toLowerCase() === MENTOR_EMAIL && password === MENTOR_PASSWORD ? onMentor() : setError("Incorrect mentor email or password."); if (tab === "admin") return setError("Admin access is not enabled in this prototype yet."); if (!email.trim() || !password.trim()) return setError("Please enter your email and password to continue."); if (email.trim().toLowerCase() === DEMO_STUDENT_EMAIL && password === DEMO_STUDENT_PASSWORD) return onStudentSuccess(); const students = readStudents(); const student = students.find((item) => item.email.toLowerCase() === email.trim().toLowerCase()); if (student) return onStudentSuccess(); setError("Account not found. Please create an account first."); };
  const googleSignIn = () => { if (!googleClientId) return setError("Add VITE_GOOGLE_CLIENT_ID to .env.local, then restart the dev server."); if (!window.google?.accounts?.id) return setError("Google sign-in is still loading. Please try again."); window.google.accounts.id.initialize({ client_id: googleClientId, callback: () => onStudentSuccess() }); window.google.accounts.id.prompt(); };
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close-btn" onClick={onClose} aria-label="Close sign in"><X size={20} /></button><h2 id="login-title">Welcome back</h2><div className="auth-tabs" role="tablist">{[["student", "Student login"], ["mentor", "Mentor login"], ["admin", "Admin login"]].map(([key, label]) => <button key={key} className={classNames("auth-tab", tab === key && "active")} onClick={() => changeTab(key)} role="tab" aria-selected={tab === key}>{label}</button>)}</div><p className="modal-copy">{tab === "student" ? "Sign in with your email, or continue with Google, Apple or others." : tab === "mentor" ? "Priya Sharmaâ€™s Maths sessions are managed from the mentor space." : "Admin tools will be connected after the admin API is provided."}</p><form className="auth-form" onSubmit={submit}><label className="input-label">Email<input type="email" className="auth-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label className="input-label">Password<div className="password-input-wrapper"><input type={showPassword ? "text" : "password"} className="auth-input" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><button type="button" className="forgot-password">Forgot password?</button></label>{error && <div className="error-popup" role="alert"><ShieldCheck size={18} />{error}</div>}{tab === "student" ? <div className="auth-button-group"><button className="auth-login-btn" type="submit">Log in <ChevronRight size={18} /></button><div className="create-account-prompt"><span>Donâ€™t have an account?</span><button type="button" className="create-account-link" onClick={onCreateAccount}>Create account</button></div><div className="auth-divider"><span>or continue with</span></div><div className="social-buttons-grid"><button type="button" className="social-btn" onClick={googleSignIn}><svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Google</button><button type="button" className="social-btn"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>Apple</button><button type="button" className="social-btn"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.5 0h-17A3.5 3.5 0 0 0 0 3.5v17A3.5 3.5 0 0 0 3.5 24h17a3.5 3.5 0 0 0 3.5-3.5v-17A3.5 3.5 0 0 0 20.5 0zM7.5 9.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm9 11h-9v-1c0-1.66 1.34-3 3-3h3c1.66 0 3 1.34 3 3v1zm0-5h-9v-1h9v1z"/></svg>Microsoft</button><button type="button" className="social-btn"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>GitHub</button></div><small className="demo-login">Demo: {DEMO_STUDENT_EMAIL} / {DEMO_STUDENT_PASSWORD}</small></div> : <><button className="auth-login-btn" type="submit">Continue as {tab} <ChevronRight size={18} /></button><small className="demo-login">Demo login: {tab === "mentor" ? `${MENTOR_EMAIL} / ${MENTOR_PASSWORD}` : "Not available"}</small></>}</form></section></div>;
}
function AccessibilityPanel({ textScale, setTextScale, appearance, setAppearance, language, setLanguage, onClose }) { return <aside className="accessibility-panel" aria-label="Accessibility options"><div className="panel-heading"><strong>Accessibility</strong><button className="icon-btn" onClick={onClose} aria-label="Close accessibility options"><X size={18} /></button></div><label className="range-row"><span><Eye size={17} /> Text size</span><input type="range" min=".85" max="1.35" step=".05" value={textScale} onChange={(event) => setTextScale(Number(event.target.value))} /></label><LanguagePicker value={language} onChange={setLanguage} /><label className="appearance-row"><strong>Appearance</strong><select value={appearance} onChange={(event) => setAppearance(event.target.value)}><option value="light">Light mode</option><option value="dark">Dark mode</option></select></label><button className="reset-button" onClick={() => setTextScale(1)}>Reset text size</button></aside>; }
function SignupPage({ email, onBack, onComplete }) { const [form, setForm] = useState({ name: "", studentClass: "", age: "" }); const submit = (event) => { event.preventDefault(); try { const students = readStudents(); localStorage.setItem("cognibridge_students", JSON.stringify([...students, { ...form, email, createdAt: new Date().toISOString() }])); onComplete(); } catch { /* Demo storage may be unavailable in private browsing. */ } }; return <main className="signup-page"><button className="mentor-back" onClick={onBack}><ArrowLeft size={18} /> Back to sign in</button><section className="signup-card"><div className="auth-icon"><UserRound size={24} /></div><p className="eyebrow">NEW STUDENT PROFILE</p><h1>Letâ€™s set up your learning space</h1><p className="modal-copy">We couldnâ€™t find <strong>{email}</strong> yet. Add a few details so CogniBridge can personalise your experience.</p><form className="auth-form" onSubmit={submit}><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" required /></label><div className="signup-columns"><label>Class<input value={form.studentClass} onChange={(event) => setForm({ ...form, studentClass: event.target.value })} placeholder="e.g. 8" required /></label><label>Age<input type="number" min="5" max="25" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} placeholder="e.g. 13" required /></label></div><div className="quiz-placeholder"><Sparkles size={19} /><div><strong>Learning-style quiz â€” coming next</strong><p>Weâ€™ll use a short quiz later to suggest the best notes and study formats for you.</p></div></div><button className="primary-btn" type="submit">Create student profile <ChevronRight size={18} /></button></form></section></main>; }
function CreateAccountPage({ onBack, onComplete }) {
  const [role, setRole] = useState("Student");
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", name: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      return setError("Please fill in all required fields.");
    }

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }

    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }

    const students = readStudents();
    const existingStudent = students.find((s) => s.email.toLowerCase() === form.email.trim().toLowerCase());

    if (existingStudent) {
      return setError("An account with this email already exists. Please sign in instead.");
    }

    try {
      localStorage.setItem("cognibridge_students", JSON.stringify([
        ...students,
        {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name,
          role: role,
          createdAt: new Date().toISOString()
        }
      ]));
      onComplete(form.email.trim().toLowerCase());
    } catch {
      setError("Unable to create account. Please try again.");
    }
  };

  const googleSignIn = () => {
    // Placeholder for Google OAuth
    setError("Social login will be implemented soon.");
  };

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div className="create-account-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onBack} aria-label="Close">
          <X size={20} />
        </button>

        <div className="create-account-content">
          <h1 className="create-account-heading">Create your account</h1>

          <p className="create-account-subtitle">
            Join Cognibridge and start your learning journey today.
          </p>

          <div className="role-tabs">
            {["Student", "Mentor", "Admin"].map((r) => (
              <button
                key={r}
                type="button"
                className={classNames("role-tab", role === r && "active")}
                onClick={() => setRole(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <form className="create-account-form" onSubmit={submit}>
            <label className="create-account-label">
              <span>Full Name</span>
              <input
                type="text"
                className="create-account-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter your full name"
                required
              />
            </label>

            <label className="create-account-label">
              <span>Email</span>
              <input
                type="email"
                className="create-account-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="create-account-label">
              <span>Password</span>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="create-account-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small className="password-hint">
                Use at least 8 characters with a mix of letters, numbers and symbols.
              </small>
            </label>

            <label className="create-account-label">
              <span>Confirm Password</span>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="create-account-input"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="error-popup" role="alert">
                <ShieldCheck size={18} />
                {error}
              </div>
            )}

            <button className="create-account-btn" type="submit">
              Create account <ChevronRight size={18} />
            </button>

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div className="social-buttons-grid">
              <button type="button" className="social-btn" onClick={googleSignIn}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button type="button" className="social-btn" onClick={() => setError("Social login will be implemented soon.")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </button>
              <button type="button" className="social-btn" onClick={() => setError("Social login will be implemented soon.")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M20.5 0h-17A3.5 3.5 0 0 0 0 3.5v17A3.5 3.5 0 0 0 3.5 24h17a3.5 3.5 0 0 0 3.5-3.5v-17A3.5 3.5 0 0 0 20.5 0zM7.5 9.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm9 11h-9v-1c0-1.66 1.34-3 3-3h3c1.66 0 3 1.34 3 3v1zm0-5h-9v-1h9v1z"/>
                </svg>
                Microsoft
              </button>
              <button type="button" className="social-btn" onClick={() => setError("Social login will be implemented soon.")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>

            <div className="login-link-section">
              <span>Already have an account?</span>
              <button type="button" className="login-link-btn" onClick={onBack}>
                Log in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
export { AccessibilityPanel, AuthModal, CreateAccountPage, SignupPage };

