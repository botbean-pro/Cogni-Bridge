import { supabase } from "./supabaseClient";

const bucket = "handwriting";

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Saves the photo to the student's private folder and records the result.
// Only the newest sample is kept, so older photos are removed.
export async function saveHandwriting(studentId, imageDataUrl, handwritingType, signs = []) {
  const blob = await (await fetch(imageDataUrl)).blob();
  const imagePath = `${studentId}/${Date.now()}.jpg`;
  throwIfError(await supabase.storage.from(bucket).upload(imagePath, blob, { contentType: "image/jpeg" }));

  const row = { student_id: studentId, image_path: imagePath, handwriting_type: handwritingType };
  let { error } = await supabase.from("student_handwriting").insert({ ...row, handwriting_signs: signs });
  // Before migration 20261024000100 runs there's no handwriting_signs column; save the rest anyway.
  if (error && /handwriting_signs/.test(error.message || "")) ({ error } = await supabase.from("student_handwriting").insert(row));
  if (error) {
    await supabase.storage.from(bucket).remove([imagePath]);
    throw error;
  }

  const older = throwIfError(await supabase.from("student_handwriting")
    .select("id, image_path")
    .eq("student_id", studentId)
    .neq("image_path", imagePath));
  if (older?.length) {
    await supabase.storage.from(bucket).remove(older.map((row) => row.image_path));
    await supabase.from("student_handwriting").delete().in("id", older.map((row) => row.id));
  }
}

// Latest result plus a short-lived link to the photo, or null if the student has none yet.
export async function loadLatestHandwriting(studentId) {
  const latestRows = (columns) => supabase.from("student_handwriting")
    .select(columns)
    .eq("student_id", studentId)
    .order("analyzed_at", { ascending: false })
    .limit(1);
  let result = await latestRows("image_path, handwriting_type, handwriting_signs, analyzed_at");
  if (result.error && /handwriting_signs/.test(result.error.message || "")) result = await latestRows("image_path, handwriting_type, analyzed_at");
  const rows = throwIfError(result);
  const latest = rows?.[0];
  if (!latest) return null;
  const signed = await supabase.storage.from(bucket).createSignedUrl(latest.image_path, 3600);
  return {
    handwritingType: latest.handwriting_type,
    handwritingSigns: latest.handwriting_signs ?? undefined,
    handwritingImage: signed.data?.signedUrl || "",
    analyzedAt: latest.analyzed_at,
  };
}
