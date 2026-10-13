import { supabase } from "./supabaseClient";

const bucket = "handwriting";

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Saves the photo to the student's private folder and records the result.
// Only the newest sample is kept, so older photos are removed.
export async function saveHandwriting(studentId, imageDataUrl, handwritingType) {
  const blob = await (await fetch(imageDataUrl)).blob();
  const imagePath = `${studentId}/${Date.now()}.jpg`;
  throwIfError(await supabase.storage.from(bucket).upload(imagePath, blob, { contentType: "image/jpeg" }));

  const { error } = await supabase.from("student_handwriting").insert({
    student_id: studentId,
    image_path: imagePath,
    handwriting_type: handwritingType,
  });
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
  const rows = throwIfError(await supabase.from("student_handwriting")
    .select("image_path, handwriting_type, analyzed_at")
    .eq("student_id", studentId)
    .order("analyzed_at", { ascending: false })
    .limit(1));
  const latest = rows?.[0];
  if (!latest) return null;
  const signed = await supabase.storage.from(bucket).createSignedUrl(latest.image_path, 3600);
  return {
    handwritingType: latest.handwriting_type,
    handwritingImage: signed.data?.signedUrl || "",
    analyzedAt: latest.analyzed_at,
  };
}
