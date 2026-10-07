import React from "react";
import { MessageCircle } from "lucide-react";

export function MessagesPage({ t }) {
  return (
    <section className="content feature-page">
      <div className="empty-feature">
        <MessageCircle size={32} />
        <p className="eyebrow">{t("messagesEyebrow")}</p>
        <h2>{t("stayConnected")}</h2>
        <p>{t("messagePlaceholder")}</p>
        <button className="primary-btn">{t("comingSoon")}</button>
      </div>
    </section>
  );
}
