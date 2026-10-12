import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { fetchSessionStudents, setStudentGood } from "../../sessionRegistrations";

// Students registered for one of this mentor's sessions, with a toggle for the
// "good participation" mark (+5 Cogni-Points on the leaderboard).
export function SessionStudents({ sessionId, t }) {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    fetchSessionStudents(sessionId)
      .then((rows) => {
        if (isCurrent) setStudents(rows);
      })
      .catch(() => {
        if (isCurrent) setError(t("sessionStudentsError"));
      });
    return () => {
      isCurrent = false;
    };
  }, [sessionId, t]);

  const toggleGood = async (student) => {
    setError("");
    try {
      await setStudentGood(sessionId, student.id, !student.good);
      setStudents((items) => items.map((item) => (
        item.id === student.id ? { ...item, good: !student.good } : item
      )));
    } catch {
      setError(t("sessionStudentsError"));
    }
  };

  if (error) return <p className="mentor-session-students-note" role="alert">{error}</p>;
  if (!students) return <p className="mentor-session-students-note" role="status">{t("loading")}</p>;
  if (!students.length) return <p className="mentor-session-students-note">{t("noStudentsRegistered")}</p>;

  return (
    <ul className="mentor-session-students">
      {students.map((student) => (
        <li key={student.id}>
          <span>
            {student.name}
            {student.attended && <small><CheckCircle2 size={13} /> {t("attendanceRecorded")}</small>}
          </span>
          <label>
            <input type="checkbox" checked={student.good} onChange={() => toggleGood(student)} />
            {t("goodParticipation")}
          </label>
        </li>
      ))}
    </ul>
  );
}
