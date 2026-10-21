// Handwriting results are stored as "Type 1" .. "Type 4"; show them in the chosen language.
export const typeLabel = (t, value) => {
  const match = /^Type (\d+)$/.exec(value || "");
  return match ? t("hw_type", { n: match[1] }) : value;
};
