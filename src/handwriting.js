// Handwriting results are stored as spacing labels (older samples as "Type 1" .. "Type 4"); students see them as numbered types.
const spacingTypes = { 'Open spacing': 1, 'Balanced spacing': 2, 'Compact spacing': 3 };

export const typeLabel = (t, value) => {
  if (spacingTypes[value]) return t("hw_type", { n: spacingTypes[value] });
  const match = /^Type (\d+)$/.exec(value || "");
  return match ? t("hw_type", { n: match[1] }) : value;
};
