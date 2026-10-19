import React, { useEffect, useState } from "react";
import { Accessibility, LogOut } from "lucide-react";
import { MouseTrail } from "../Brand";
import { connectParentWithCode, loadChildCheckins, loadChildSessions, loadParentPortal, sendParentTeacherMessage } from "../../parentPortal";
import { ParentSidebar } from "./ParentSidebar";
import { useRouteTab } from "../../routes";
import { ConnectChildCard } from "./shared/ConnectChildCard";
import { ParentMoodsPage } from "./pages/ParentMoodsPage";
import { ParentOverviewPage } from "./pages/ParentOverviewPage";
import { ParentSessionsPage } from "./pages/ParentSessionsPage";
import { ParentTeachersPage } from "./pages/ParentTeachersPage";
import "./ParentPortal.css";

function ParentLoading({ t }) {
  return (
    <div className="stats-grid stats-grid-loading" role="status" aria-label={t("parentLoading")}>
      {Array.from({ length: 4 }, (_, index) => (
        <article key={index} aria-hidden="true">
          <span className="stat-skeleton stat-skeleton-icon" />
          <span className="stat-skeleton stat-skeleton-value" />
          <span className="stat-skeleton stat-skeleton-label" />
        </article>
      ))}
    </div>
  );
}

const parentTabs = ["overview", "moods", "sessions", "teachers", "settings"];

const connectHiddenKey = (parentId) => `cognibridge_parent_connect_hidden:${parentId}`;

const pickChild = (children, currentId) => (
  children.some((child) => child.id === currentId) ? currentId : children[0]?.id ?? null
);

export function ParentPortal({ parentId, parentName, onLogout, accessibilityOpen, onToggleAccessibility, accessibilityPanel, t }) {
  const [tab, setTab] = useRouteTab("parent", parentTabs);
  const [portal, setPortal] = useState(null);
  const [childId, setChildId] = useState(null);
  const [childData, setChildData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  // The overview's "Connect another child" card can be crossed out; it stays available under Settings.
  const [connectHidden, setConnectHidden] = useState(() => {
    try {
      return localStorage.getItem(connectHiddenKey(parentId)) === "1";
    } catch {
      return false;
    }
  });

  const hideConnectCard = () => {
    setConnectHidden(true);
    try {
      localStorage.setItem(connectHiddenKey(parentId), "1");
    } catch {
      // Hidden for this session only if browser storage is unavailable.
    }
  };

  useEffect(() => {
    let isCurrent = true;
    loadParentPortal(parentId)
      .then((next) => {
        if (!isCurrent) return;
        setPortal(next);
        setChildId((current) => pickChild(next.children, current));
      })
      .catch((loadError) => {
        console.error("Parent portal: loading linked children failed", loadError);
        if (isCurrent) setError(t("parentLoadError"));
      });
    return () => {
      isCurrent = false;
    };
  }, [parentId, retry]);

  useEffect(() => {
    setChildData(null);
    if (!childId) return undefined;
    let isCurrent = true;
    Promise.all([loadChildCheckins(childId), loadChildSessions(childId)])
      .then(([checkins, sessions]) => {
        if (isCurrent) setChildData({ checkins, sessions });
      })
      .catch((loadError) => {
        console.error("Parent portal: loading the child's check-ins/sessions failed", loadError);
        if (isCurrent) setError(t("parentLoadError"));
      });
    return () => {
      isCurrent = false;
    };
  }, [childId, retry]);

  const refreshPortal = async () => {
    const next = await loadParentPortal(parentId);
    setPortal(next);
    return next;
  };

  const connectChild = async (code) => {
    const [linked] = await connectParentWithCode(code);
    const next = await refreshPortal();
    setChildId((current) => (linked?.student_id ? linked.student_id : pickChild(next.children, current)));
    return linked?.student_name;
  };

  const sendMessage = async (mentorId, message) => {
    await sendParentTeacherMessage({ parentId, studentId: childId, mentorId, message });
    await refreshPortal();
  };

  const children = portal?.children || [];
  const child = children.find((item) => item.id === childId);
  const childName = child?.display_name || "";
  const [title, subtitle] = {
    overview: [t("parentGreeting", { name: parentName }), child ? t("parentOverviewCopy", { child: childName }) : ""],
    moods: [t("parentMoods"), ""],
    sessions: [t("childSessionsHeading"), t("attentionRatedBy")],
    teachers: [t("consultTeachers"), child ? t("consultTeachersCopy", { child: childName }) : ""],
    settings: [t("settings"), ""],
  }[tab];

  let body;
  if (error) {
    body = (
      <div className="stats-error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={() => { setError(""); setRetry((value) => value + 1); }}>{t("tryAgain")}</button>
      </div>
    );
  } else if (!portal) {
    body = <ParentLoading t={t} />;
  } else if (!child) {
    body = <ConnectChildCard title={t("connectChild")} intro={t("noChildLinked")} onConnect={connectChild} t={t} />;
  } else if (tab === "settings") {
    body = <ConnectChildCard title={t("connectAnotherChild")} onConnect={connectChild} t={t} />;
  } else if (tab === "teachers") {
    body = <ParentTeachersPage key={child.id} child={child} messages={portal.messages.filter((message) => message.student_id === child.id)} onSend={sendMessage} t={t} />;
  } else if (!childData) {
    body = <ParentLoading t={t} />;
  } else if (tab === "moods") {
    body = <ParentMoodsPage child={child} checkins={childData.checkins} t={t} />;
  } else if (tab === "sessions") {
    body = <ParentSessionsPage child={child} sessions={childData.sessions} t={t} />;
  } else {
    body = <ParentOverviewPage child={child} checkins={childData.checkins} sessions={childData.sessions} onOpenTab={setTab} onConnect={connectChild} showConnect={!connectHidden} onDismissConnect={hideConnectCard} t={t} />;
  }

  return (
    <>
      <MouseTrail />
      <div className="student-app-shell parent-app-shell">
        <aside className="student-rail">
          <ParentSidebar activeTab={tab} onNavigate={setTab} t={t} />
          <div className="student-rail-footer">
            <button type="button" className="student-rail-link" data-accessibility-toggle onClick={onToggleAccessibility} aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")}>
              <Accessibility size={19} /><span>{t("accessibility")}</span>
            </button>
            <div className="student-rail-account">
              <button type="button" className="student-rail-link student-rail-logout" onClick={onLogout} aria-label={t("logOut")} title={t("logOut")}>
                <span className="avatar-small">{parentName?.charAt(0)?.toUpperCase() || "P"}</span>
                <span>{parentName}</span>
                <LogOut size={16} className="student-rail-logout-icon" />
              </button>
            </div>
          </div>
        </aside>
        <main className="main">
          <section className="content parent-page" key={tab}>
            <header className="parent-heading parent-rise">
              <div>
                <p className="eyebrow">{t("parentSpace")}</p>
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
              </div>
              {children.length > 1 ? (
                <label className="parent-child-switch">
                  <span>{t("viewingChild")}</span>
                  <select value={childId || ""} onChange={(event) => setChildId(event.target.value)}>
                    {children.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}
                  </select>
                </label>
              ) : child ? (
                <span className="parent-child-chip"><span className="avatar-small">{childName.charAt(0).toUpperCase()}</span>{childName}</span>
              ) : null}
            </header>
            {body}
          </section>
        </main>
      </div>
      {accessibilityOpen && accessibilityPanel}
    </>
  );
}
