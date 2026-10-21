import { supabase } from "./supabaseClient";

const throwIfError = ({ data, error }) => { if (error) throw error; return data; };
const storageKey = (studentKey) => `cognibridge_journal_${String(studentKey || "guest").toLowerCase()}`;
const offlineStorageKey = (studentId, studentKey) => `${storageKey(studentKey || studentId)}_offline`;

const localReflectionCopy = {
  English: "This local chart counts word patterns and any check-in choices in this entry. It may not capture your meaning and is not a mental-health assessment.",
  Hindi: "यह स्थानीय चार्ट इस प्रविष्टि के शब्दों और चुने गए चेक-इन विकल्पों को गिनता है। यह आपका आशय पूरी तरह नहीं समझ सकता और मानसिक स्वास्थ्य का आकलन नहीं है।",
  Bengali: "এই স্থানীয় চার্টে লেখার শব্দের ধরন ও নির্বাচিত চেক-ইন পছন্দ গণনা করা হয়। এটি আপনার সম্পূর্ণ অর্থ বুঝতে নাও পারে এবং মানসিক স্বাস্থ্যের মূল্যায়ন নয়।",
  Telugu: "ఈ స్థానిక చార్ట్‌లో ఈ నమోదులోని పదాల నమూనాలు, ఎంచుకున్న చెక్-ఇన్ ఎంపికలు లెక్కించబడతాయి. ఇది మీ ఉద్దేశాన్ని పూర్తిగా అర్థం చేసుకోకపోవచ్చు; ఇది మానసిక ఆరోగ్య అంచనా కాదు.",
  Marathi: "हा स्थानिक तक्ता या नोंदीतील शब्दांचे नमुने आणि निवडलेले चेक-इन पर्याय मोजतो. तो तुमचा अर्थ पूर्णपणे समजेलच असे नाही आणि हे मानसिक आरोग्याचे मूल्यांकन नाही.",
  Tamil: "இந்த உள்ளூர் விளக்கப்படம் இந்தப் பதிவிலுள்ள சொல் வடிவங்களையும் தேர்ந்தெடுத்த சுயச் சரிபார்ப்பு விருப்பங்களையும் கணக்கிடுகிறது. உங்கள் முழுப் பொருளை இது உணராமல் போகலாம்; இது மனநல மதிப்பீடு அல்ல.",
  Gujarati: "આ સ્થાનિક ચાર્ટ આ નોંધના શબ્દોની પેટર્ન અને પસંદ કરેલા ચેક-ઇન વિકલ્પો ગણે છે. તે તમારો સંપૂર્ણ અર્થ સમજી ન શકે અને આ માનસિક સ્વાસ્થ્યનું મૂલ્યાંકન નથી.",
  Kannada: "ಈ ಸ್ಥಳೀಯ ಚಾರ್ಟ್ ಈ ದಾಖಲೆಯ ಪದ ಮಾದರಿಗಳು ಮತ್ತು ಆಯ್ಕೆಮಾಡಿದ ಚೆಕ್-ಇನ್ ಆಯ್ಕೆಗಳನ್ನು ಎಣಿಸುತ್ತದೆ. ಇದು ನಿಮ್ಮ ಪೂರ್ಣ ಅರ್ಥವನ್ನು ಗ್ರಹಿಸದೇ ಇರಬಹುದು; ಇದು ಮಾನಸಿಕ ಆರೋಗ್ಯದ ಮೌಲ್ಯಮಾಪನವಲ್ಲ.",
  Malayalam: "ഈ പ്രാദേശിക ചാർട്ട് ഈ കുറിപ്പിലെ വാക്കുകളുടെ രീതികളും തിരഞ്ഞെടുത്ത ചെക്ക്-ഇൻ ഓപ്ഷനുകളും എണ്ണുന്നു. നിങ്ങളുടെ ഉദ്ദേശ്യം പൂർണ്ണമായി മനസ്സിലാക്കണമെന്നില്ല; ഇത് മാനസികാരോഗ്യ വിലയിരുത്തലല്ല.",
  Punjabi: "ਇਹ ਸਥਾਨਕ ਚਾਰਟ ਇਸ ਲਿਖਤ ਦੇ ਸ਼ਬਦਾਂ ਦੇ ਪੈਟਰਨ ਅਤੇ ਚੁਣੇ ਚੈੱਕ-ਇਨ ਵਿਕਲਪ ਗਿਣਦਾ ਹੈ। ਇਹ ਤੁਹਾਡਾ ਪੂਰਾ ਮਤਲਬ ਨਹੀਂ ਸਮਝ ਸਕਦਾ ਅਤੇ ਇਹ ਮਾਨਸਿਕ ਸਿਹਤ ਦਾ ਮੁਲਾਂਕਣ ਨਹੀਂ ਹੈ।",
  French: "Ce graphique local compte les mots et les choix de bilan de cette entrée. Il peut ne pas saisir votre intention et ne constitue pas une évaluation de santé mentale.",
  German: "Dieses lokale Diagramm zählt Wortmuster und ausgewählte Check-in-Angaben dieses Eintrags. Es erfasst deine Bedeutung möglicherweise nicht vollständig und ist keine Einschätzung der psychischen Gesundheit.",
  Spanish: "Este gráfico local cuenta patrones de palabras y las opciones de registro elegidas en esta entrada. Puede que no capte todo lo que quieres decir y no es una evaluación de salud mental.",
};

const themeWords = {
  joy: ["happy", "happiness", "glad", "joy", "excited", "fun", "laugh", "proud", "love", "smile", "enjoy", "खुश", "खुशी", "आनंद", "ভালো", "আনন্দ", "సంతోషం", "ஆனந்தம்", "மகிழ்ச்சி", "આનંદ", "ಸಂತೋಷ", "സന്തോഷം", "ਖੁਸ਼"],
  calm: ["calm", "peace", "peaceful", "relaxed", "safe", "quiet", "okay", "fine", "comfortable", "शांत", "शांति", "आराम", "ठीक", "শান্ত", "স্বস্তি", "ప్రశాంత", "ప్రశాంతంగా", "அமைதி", "அமைதியாக", "શાંતિ", "ಶಾಂತ", "ശാന്തം", "ਸ਼ਾਂਤ"],
  hope: ["hope", "hopeful", "tomorrow", "looking forward", "try", "improve", "plan", "आशा", "उम्मीद", "बेहतर", "আশা", "ভবিষ্যৎ", "ఆశ", "నమ్మకం", "நம்பிக்கை", "எதிர்பார்ப்பு", "આશા", "ಭರವಸೆ", "പ്രതീക്ഷ", "ਉਮੀਦ"],
  worry: ["worry", "worried", "anxious", "anxiety", "nervous", "afraid", "scared", "stress", "stressed", "overwhelmed", "चिंता", "चिंतित", "डर", "घबराहट", "तनाव", "চিন্তা", "ভয়", "উদ্বিগ্ন", "ఆందోళన", "భయం", "கவலை", "பயம்", "ચિંતા", "ಚಿಂತೆ", "ഉത്കണ്ഠ", "ਚਿੰਤਾ"],
  frustration: ["angry", "anger", "frustrated", "frustration", "annoyed", "hate", "stuck", "upset", "गुस्सा", "निराश", "परेशान", "রাগ", "বিরক্ত", "కోపం", "నిరాశ", "கோபம்", "எரிச்சல்", "ગુસ્સો", "ಕೋಪ", "ദേഷ്യം", "ਗੁੱਸਾ"],
  tiredness: ["tired", "tiredness", "exhausted", "sleepy", "drained", "worn out", "थका", "थकान", "ক্লান্ত", "అలసట", "சோர்வு", "થાક", "ದಣಿವು", "ക്ഷീണം", "ਥਕਾਵਟ"],
};

function localThemeChart(entry, language, checkin) {
  const text = String(entry || "").toLocaleLowerCase();
  const counts = Object.fromEntries([...Object.keys(themeWords), "other"].map((label) => [label, 0]));
  for (const [label, words] of Object.entries(themeWords)) {
    counts[label] += words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  }
  const selected = (checkin?.emotions || []).map((emotion) => ({
    happy: "joy", excited: "joy", calm: "calm", anxious: "worry", stressed: "worry", overwhelmed: "worry", sad: "worry", lonely: "worry", angry: "frustration", frustrated: "frustration", tired: "tiredness",
  }[emotion] || "other"));
  selected.forEach((label) => { counts[label] += 2; });
  if (checkin?.mood) counts[checkin.mood <= 2 ? "worry" : checkin.mood === 3 ? "calm" : "joy"] += 2;
  let picked = Object.entries(counts).filter(([label, count]) => label !== "other" && count > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!picked.length) picked = [["other", 1], ["calm", 1]];
  const total = picked.reduce((sum, [, count]) => sum + count, 0);
  const segments = picked.map(([label, count]) => ({ label, value: Math.floor(count * 100 / total), remainder: (count * 100) % total }));
  let remaining = 100 - segments.reduce((sum, item) => sum + item.value, 0);
  [...segments].sort((a, b) => b.remainder - a.remainder).slice(0, remaining).forEach((item) => { item.value += 1; });
  return { method: "local", segments: segments.map(({ label, value }) => ({ label, value })), reflection: localReflectionCopy[language] || localReflectionCopy.English };
}

function saveOfflineEntry({ studentId, studentKey, entry, chart }) {
  const key = offlineStorageKey(studentId, studentKey);
  const legacyKey = storageKey(studentKey || studentId);
  const rows = JSON.parse(localStorage.getItem(key) || localStorage.getItem(legacyKey) || "[]");
  const local = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, student_id: studentId || null, entry: entry.trim(), chart, show_to_support: false, local_only: true, created_at: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify([local, ...rows].slice(0, 50)));
  if (legacyKey !== key) localStorage.removeItem(legacyKey);
  return local;
}

export async function createJournalReflection(entry, language, checkin = null) {
  let response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "journal", language, messages: [{ role: "user", content: entry.trim() }] }),
    });
  } catch { return localThemeChart(entry, language, checkin); }
  let result;
  try { result = await response.json(); }
  catch { return localThemeChart(entry, language, checkin); }
  if (!response.ok || !result.reflection) {
    return localThemeChart(entry, language, checkin);
  }
  return { ...result.reflection, method: "ai" };
}

export async function saveJournalEntry({ studentId, studentKey, entry, chart, showToSupport }) {
  if (studentId) {
    try {
      return throwIfError(await supabase.from("student_journal_entries").insert({
        student_id: studentId, entry: entry.trim(), chart, show_to_support: showToSupport,
      }).select("id, student_id, entry, chart, show_to_support, created_at").single());
    } catch {
      return saveOfflineEntry({ studentId, studentKey, entry, chart });
    }
  }
  return saveOfflineEntry({ studentKey, entry, chart });
}

export async function loadJournalEntries({ studentId, studentKey }) {
  if (studentId) {
    let remoteRows = [];
    try {
      remoteRows = throwIfError(await supabase.from("student_journal_entries")
        .select("id, student_id, entry, chart, show_to_support, created_at")
        .eq("student_id", studentId).order("created_at", { ascending: false }).limit(50));
    } catch { /* Keep this device's private entries available while the service is offline. */ }
    let localRows = [];
    try { localRows = JSON.parse(localStorage.getItem(offlineStorageKey(studentId, studentKey)) || "[]"); } catch { localRows = []; }
    return [...localRows, ...remoteRows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
  }
  try {
    const local = JSON.parse(localStorage.getItem(offlineStorageKey(null, studentKey)) || "[]");
    const legacy = JSON.parse(localStorage.getItem(storageKey(studentKey)) || "[]");
    return [...local, ...legacy].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
  }
  catch { return []; }
}

export async function setJournalEntrySharing(entryId, studentId, showToSupport) {
  return throwIfError(await supabase.from("student_journal_entries")
    .update({ show_to_support: showToSupport }).eq("id", entryId).eq("student_id", studentId)
    .select("id, student_id, entry, chart, show_to_support, created_at").single());
}

export async function deleteJournalEntry(entryId, studentId, studentKey) {
  if (String(entryId).startsWith("local-")) {
    const key = offlineStorageKey(studentId, studentKey);
    const legacyKey = storageKey(studentKey || studentId);
    const entries = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify(entries.filter((item) => item.id !== entryId)));
    if (legacyKey !== key) {
      const legacy = JSON.parse(localStorage.getItem(legacyKey) || "[]");
      localStorage.setItem(legacyKey, JSON.stringify(legacy.filter((item) => item.id !== entryId)));
    }
    return true;
  }
  if (studentId) return throwIfError(await supabase.from("student_journal_entries").delete().eq("id", entryId).eq("student_id", studentId).select("id").single());
  const entries = await loadJournalEntries({ studentKey });
  localStorage.setItem(storageKey(studentKey), JSON.stringify(entries.filter((item) => item.id !== entryId)));
  return true;
}
