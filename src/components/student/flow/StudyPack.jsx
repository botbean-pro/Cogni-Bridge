import React, { useMemo, useState } from "react";
import { FileText, Layers, ListTree, Network } from "lucide-react";

// Fixed node sizes keep the layout a pure function of the data, so no DOM measuring is needed.
const CENTER_WIDTH = 168;
const NODE_WIDTH = 150;
const COLUMN_GAP = 40;
const ROW_HEIGHT = 48;
const BRANCH_GAP = 14;
const PADDING = 16;

// Branches alternate right/left of the central topic; each leaf takes one row beside its branch.
function layoutMindMap({ branches }) {
  const width = CENTER_WIDTH + 4 * NODE_WIDTH + 4 * COLUMN_GAP + 2 * PADDING;
  const centerX = width / 2;
  const sides = { right: [], left: [] };
  branches.forEach((branch, index) => sides[index % 2 === 0 ? "right" : "left"].push({ ...branch, color: index % 6 }));

  const sideHeight = (list) => list.reduce((total, branch) => total + Math.max(1, branch.children.length) * ROW_HEIGHT, 0)
    + Math.max(0, list.length - 1) * BRANCH_GAP;
  const height = Math.max(sideHeight(sides.right), sideHeight(sides.left), ROW_HEIGHT) + 2 * PADDING;
  const nodes = [];
  const links = [];

  Object.entries(sides).forEach(([side, list]) => {
    const direction = side === "right" ? 1 : -1;
    const centerEdge = centerX + direction * (CENTER_WIDTH / 2);
    const branchX = centerEdge + direction * COLUMN_GAP;
    const leafX = branchX + direction * (NODE_WIDTH + COLUMN_GAP);
    let y = (height - sideHeight(list)) / 2;
    list.forEach((branch, branchIndex) => {
      const rows = Math.max(1, branch.children.length);
      const branchY = y + (rows * ROW_HEIGHT) / 2;
      // x is the edge nearest the centre; CSS flips left-side nodes to grow outward.
      nodes.push({ key: `${side}-${branchIndex}`, kind: "branch", side, x: branchX, y: branchY, text: branch.label, color: branch.color });
      links.push({ key: `c-${side}-${branchIndex}`, from: [centerEdge, height / 2], to: [branchX, branchY], color: branch.color });
      branch.children.forEach((child, childIndex) => {
        const leafY = y + childIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        nodes.push({ key: `${side}-${branchIndex}-${childIndex}`, kind: "leaf", side, x: leafX, y: leafY, text: child, color: branch.color });
        links.push({ key: `l-${side}-${branchIndex}-${childIndex}`, from: [branchX + direction * NODE_WIDTH, branchY], to: [leafX, leafY], color: branch.color });
      });
      y += rows * ROW_HEIGHT + BRANCH_GAP;
    });
  });

  return { width, height, centerX, nodes, links };
}

const curve = ({ from: [x1, y1], to: [x2, y2] }) => {
  const middle = (x1 + x2) / 2;
  return `M${x1},${y1} C${middle},${y1} ${middle},${y2} ${x2},${y2}`;
};

function MindMap({ mindMap, t }) {
  const layout = useMemo(() => layoutMindMap(mindMap), [mindMap]);
  return (
    <div className="mind-map-scroll" tabIndex={0} aria-label={t("docMindMap")}>
      <div className="mind-map" style={{ width: layout.width, height: layout.height }} aria-hidden="true">
        <svg width={layout.width} height={layout.height}>
          {layout.links.map((link) => <path key={link.key} className={`mind-map-link mm-c${link.color}`} d={curve(link)} />)}
        </svg>
        <div className="mind-map-node center" style={{ left: layout.centerX - CENTER_WIDTH / 2, top: layout.height / 2, width: CENTER_WIDTH }}>
          {mindMap.central}
        </div>
        {layout.nodes.map((node) => (
          <div
            key={node.key}
            className={`mind-map-node ${node.kind} mm-c${node.color}`}
            style={{ left: node.side === "right" ? node.x : node.x - NODE_WIDTH, top: node.y, width: NODE_WIDTH }}
          >
            {node.text}
          </div>
        ))}
      </div>
      <MindMapOutline mindMap={mindMap} className="visually-hidden" />
    </div>
  );
}

function MindMapOutline({ mindMap, className = "mind-map-outline" }) {
  return (
    <div className={className}>
      <strong>{mindMap.central}</strong>
      <ul>
        {mindMap.branches.map((branch, index) => (
          <li key={branch.label} className={`mm-c${index % 6}`}>
            <span>{branch.label}</span>
            {branch.children.length > 0 && <ul>{branch.children.map((child) => <li key={child}>{child}</li>)}</ul>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Flashcards({ cards, t }) {
  const [flipped, setFlipped] = useState([]);
  if (!cards.length) return <p className="study-pack-empty">{t("docNoFlashcards")}</p>;
  return (
    <div className="study-flashcards">
      {cards.map((card, index) => {
        const showBack = flipped.includes(index);
        return (
          <button
            type="button"
            key={card.front}
            className={`study-flashcard${showBack ? " flipped" : ""}`}
            aria-pressed={showBack}
            onClick={() => setFlipped((current) => (showBack ? current.filter((item) => item !== index) : [...current, index]))}
          >
            <small>{showBack ? t("docAnswer") : t("docQuestion")}</small>
            <span>{showBack ? card.back : card.front}</span>
            <em>{showBack ? t("docTapQuestion") : t("docTapAnswer")}</em>
          </button>
        );
      })}
    </div>
  );
}

const tabs = [
  { id: "summary", icon: FileText, label: "docSummary" },
  { id: "map", icon: Network, label: "docMindMap" },
  { id: "outline", icon: ListTree, label: "docOutline" },
  { id: "cards", icon: Layers, label: "docFlashcards" },
];

export function StudyPack({ pack, fileName, truncated, t }) {
  const [tab, setTab] = useState("summary");
  return (
    <section className="study-pack" aria-label={pack.title || fileName}>
      <header className="study-pack-header">
        <FileText size={18} aria-hidden="true" />
        <div>
          <strong>{pack.title || fileName}</strong>
          <small>{fileName}{truncated ? ` · ${t("docTruncated")}` : ""}</small>
        </div>
      </header>
      <div className="study-pack-tabs" role="tablist">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button type="button" role="tab" key={id} aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <Icon size={15} aria-hidden="true" />{t(label)}
          </button>
        ))}
      </div>
      <div className="study-pack-body" role="tabpanel">
        {tab === "summary" && (
          <>
            {pack.summary.split(/\n\s*\n/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {pack.keyPoints.length > 0 && (
              <>
                <h4>{t("docKeyPoints")}</h4>
                <ul className="study-pack-points">{pack.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
              </>
            )}
          </>
        )}
        {tab === "map" && <MindMap mindMap={pack.mindMap} t={t} />}
        {tab === "outline" && <MindMapOutline mindMap={pack.mindMap} />}
        {tab === "cards" && <Flashcards cards={pack.flashcards} t={t} />}
      </div>
    </section>
  );
}
