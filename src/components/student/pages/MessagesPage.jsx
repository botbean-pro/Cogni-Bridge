import React from "react";
import { MessageCircle } from "lucide-react";

export function MessagesPage() {
  return (
    <section className="content feature-page">
      <div className="empty-feature">
        <MessageCircle size={32} />
        <p className="eyebrow">MESSAGES</p>
        <h2>Stay connected with your mentor</h2>
        <p>Mentor messages and session reminders will appear here.</p>
        <button className="primary-btn">Messages coming soon</button>
      </div>
    </section>
  );
}
