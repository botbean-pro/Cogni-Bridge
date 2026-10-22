import React from "react";

// Mood picker drawn as a ring: one coloured slice per mood, 1 (lowest) to 5 (best), clockwise from the top.
const size = 320;
const center = size / 2;
const outer = 152;
const inner = 80;
const gapDegrees = 2;

const point = (radius, degrees) => {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [center + radius * Math.cos(radians), center + radius * Math.sin(radians)];
};

const slicePath = (start, end) => {
  const [ox1, oy1] = point(outer, start);
  const [ox2, oy2] = point(outer, end);
  const [ix2, iy2] = point(inner, end);
  const [ix1, iy1] = point(inner, start);
  return `M${ox1} ${oy1} A${outer} ${outer} 0 0 1 ${ox2} ${oy2} L${ix2} ${iy2} A${inner} ${inner} 0 0 0 ${ix1} ${iy1} Z`;
};

// Splits a label into at most two lines so longer words like "Not at my peak" fit inside a slice.
const labelLines = (label) => {
  const words = String(label).split(" ");
  if (label.length <= 10 || words.length < 2) return [label];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
};

export function MoodDonut({ value, onChange, labels, colors, textColors, icons, prompt }) {
  const count = labels.length;
  const step = 360 / count;

  const onKeyDown = (event, mood) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(mood);
    } else if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const next = ((mood - 1 + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) + count) % count) + 1;
      onChange(next);
      event.currentTarget.parentNode.querySelector(`[data-mood="${next}"]`)?.focus();
    }
  };

  const Icon = value ? icons[value - 1] : null;

  return (
    <div className="mood-donut">
      <svg viewBox={`0 0 ${size} ${size}`} role="radiogroup" aria-label={prompt}>
        {labels.map((label, index) => {
          const mood = index + 1;
          const start = index * step + gapDegrees / 2;
          const end = (index + 1) * step - gapDegrees / 2;
          const middle = (start + end) / 2;
          const [labelX, labelY] = point((outer + inner) / 2, middle);
          const [pushX, pushY] = point(8, middle);
          const selected = value === mood;
          const lines = labelLines(label);
          return (
            <g
              key={mood}
              data-mood={mood}
              role="radio"
              aria-checked={selected}
              aria-label={label}
              tabIndex={selected || (!value && mood === 1) ? 0 : -1}
              className={`mood-donut-slice${selected ? " is-selected" : ""}${value && !selected ? " is-dimmed" : ""}`}
              style={selected ? { transform: `translate(${pushX - center}px, ${pushY - center}px)` } : undefined}
              onClick={() => onChange(mood)}
              onKeyDown={(event) => onKeyDown(event, mood)}
            >
              <path d={slicePath(start, end)} fill={colors[index]} />
              <text x={labelX} y={labelY - (lines.length - 1) * 8} fill={textColors[index]} textAnchor="middle" dominantBaseline="middle">
                {lines.map((line, lineIndex) => <tspan key={line} x={labelX} dy={lineIndex ? 16 : 0}>{line}</tspan>)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mood-donut-center" aria-hidden="true">
        {Icon ? <Icon size={34} strokeWidth={1.9} style={{ color: colors[value - 1] }} /> : null}
        <span>{value ? labels[value - 1] : prompt}</span>
      </div>
    </div>
  );
}
