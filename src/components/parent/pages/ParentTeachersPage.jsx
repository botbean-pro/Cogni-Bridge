import React, { useMemo } from "react";
import { WhatsAppChat } from "../../shared/WhatsAppChat";

// WhatsApp-style chats with every mentor of every linked child; one thread per mentor and child.
export function ParentTeachersPage({ parentId, children, messages, onSend, t }) {
  const threads = useMemo(() => children
    .flatMap((child) => child.mentors.map((mentor) => ({
      key: `${mentor.id}:${child.id}`,
      mentorId: mentor.id,
      studentId: child.id,
      name: mentor.display_name,
      subtitle: t("pc_mentorOf", { name: child.display_name }),
      messages: messages.filter((message) => message.mentor_id === mentor.id && message.student_id === child.id),
    })))
    // Most recent conversation first, like a messaging app.
    .sort((first, second) => (second.messages.at(-1)?.created_at || "").localeCompare(first.messages.at(-1)?.created_at || "") || first.name.localeCompare(second.name)),
  [children, messages, t]);

  const firstChild = children[0]?.display_name || "";
  return (
    <WhatsAppChat
      title={t("consultTeachers")}
      threads={threads}
      myRole="parent"
      seenStorageKey={`cognibridge_parent_chat_seen:${parentId}`}
      labels={{
        search: t("pc_search"),
        noMatch: t("md_chatNoMatch"),
        empty: t("noTeacherAssigned", { child: firstChild }),
        select: t("pc_select"),
      }}
      onSend={(thread, message) => onSend(thread.studentId, thread.mentorId, message)}
      t={t}
    />
  );
}
