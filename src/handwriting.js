// Handwriting results are stored as spacing labels (older samples as "Type 1" .. "Type 4"); show them in the chosen language.
const spacingKeys = { 'Open spacing': 'handwritingPatternOpen', 'Balanced spacing': 'handwritingPatternBalanced', 'Compact spacing': 'handwritingPatternCompact' };

export const typeLabel = (t, value) => {
  if (spacingKeys[value]) return t(spacingKeys[value]);
  const match = /^Type (\d+)$/.exec(value || "");
  return match ? t("hw_type", { n: match[1] }) : value;
};
