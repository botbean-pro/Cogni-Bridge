import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { fetchSessionStudents, setStudentAttention, setStudentGood } from "../../sessionRegistrations";

const attentionLevels = [1, 2, 3, 4, 5];

// Students registered for one of this mentor's sessions, with a toggle for the
// "good participation" mark (+5 Cogni-Points on the leaderboard) and a 1-5
// attention rating that the student's parents can see.
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

  const updateStudent = (studentId, changes) => setStudents((items) => items.map((item) => (
    item.id === studentId ? { ...item, ...changes } : item
  )));

  const toggleGood = async (student) => {
    setError("");
    try {
      await setStudentGood(sessionId, student.id, !student.good);
      updateStudent(student.id, { good: !student.good });
    } catch {
      setError(t("sessionStudentsError"));
    }
  };

  const rateAttention = async (student, value) => {
    const level = value ? Number(value) : null;
    setError("");
    try {
      await setStudentAttention(sessionId, student.id, level);
      updateStudent(student.id, { attention: level });
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
          <div className="mentor-student-controls">
            <label>
              {t("attentionLevel")}
              <select value={student.attention ?? ""} onChange={(event) => rateAttention(student, event.target.value)}>
                <option value="">{t("attentionNotRated")}</option>
                {attentionLevels.map((level) => (
                  <option key={level} value={level}>{level} · {t(`attention${level}`)}</option>
                ))}
              </select>
            </label>
            <label>
              <input type="checkbox" checked={student.good} onChange={() => toggleGood(student)} />
              {t("goodParticipation")}
            </label>
          </div>
        </li>
      ))}
    </ul>
  );
}
