import React, { useEffect, useMemo, useState } from "react";
import { loadMentorParentContacts, sendMentorParentReply } from "../../parentPortal";
import { WhatsAppChat } from "../shared/WhatsAppChat";

// parentMessages comes from useParentMessages in MentorDashboard, which polls and drives the rail badge.
export function MentorParentChat({ mentorId, parentMessages, students = [], t }) {
  const { messages, loading, error, reload } = parentMessages;
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    let current = true;
    loadMentorParentContacts()
      .then((rows) => { if (current) setContacts(rows); })
      // Without the contacts migration the list falls back to parents who have already written.
      .catch(() => {});
    return () => { current = false; };
  }, [mentorId]);

  // One thread per parent and child: every linked parent, plus any thread that only exists in messages.
  const threads = useMemo(() => {
    const byKey = new Map(contacts.map((contact) => [contact.key, { ...contact, messages: [] }]));
    messages.forEach((message) => {
      const key = `${message.parent_id}:${message.student_id}`;
      if (!byKey.has(key)) {
        const student = students.find((item) => item.id === message.student_id);
        byKey.set(key, {
          key,
          parentId: message.parent_id,
          parentName: t("md_parentWord"),
          studentId: message.student_id,
          studentName: student?.display_name || t("md_student"),
          messages: [],
        });
      }
      byKey.get(key).messages.push(message);
    });
    // Most recent conversation first, like a messaging app.
    return [...byKey.values()]
      .map((thread) => ({ ...thread, name: thread.parentName, subtitle: t("md_parentOf", { name: thread.studentName }) }))
      .sort((first, second) => (second.messages.at(-1)?.created_at || "").localeCompare(first.messages.at(-1)?.created_at || "") || first.name.localeCompare(second.name));
  }, [contacts, messages, students, t]);

  const send = async (thread, message) => {
    await sendMentorParentReply({ mentorId, studentId: thread.studentId, parentId: thread.parentId, message });
    await reload();
  };

  return (
    <WhatsAppChat
      title={t("md_parentNav")}
      threads={threads}
      myRole="mentor"
      seenStorageKey={`cognibridge_mentor_chat_seen:${mentorId}`}
      labels={{ search: t("md_chatSearch"), noMatch: t("md_chatNoMatch"), empty: t("md_noParents"), select: t("md_chatSelect") }}
      loading={loading}
      error={error}
      onSend={send}
      t={t}
    />
  );
}
