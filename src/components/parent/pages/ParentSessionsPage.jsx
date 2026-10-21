import React from "react";
import { ChildSessionRow } from "../shared/ChildSessionRow";

export function ParentSessionsPage({ child, sessions, t }) {
  if (!sessions.length) return <p className="parent-card parent-muted parent-rise">{t("noChildSessions", { child: child.display_name })}</p>;

  return (
    <div className="parent-session-list">
      {sessions.map((session, index) => <ChildSessionRow key={session.id} session={session} delay={Math.min(index, 10) * 60} t={t} />)}
    </div>
  );
}
