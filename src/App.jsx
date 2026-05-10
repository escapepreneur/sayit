import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DEFAULT_PHRASES = {
  medical: [
    "I'm in pain", "My head hurts", "I feel nauseous", "I need my medication",
    "Please call the nurse", "Please call the doctor", "I can't breathe properly",
    "I feel dizzy", "Something feels wrong", "I'm very uncomfortable",
    "Can you check on me?", "I need help urgently"
  ],
  needs: [
    "I need water", "I need food", "I need the bathroom", "I'm too cold",
    "I'm too hot", "Please adjust my pillow", "I need my phone",
    "I need to rest", "Please turn the light off", "Please turn the light on",
    "I need my glasses", "Can you open the window?"
  ],
  feelings: [
    "I'm okay", "I'm worried", "I'm scared", "I'm frustrated",
    "I'm happy", "I'm very tired", "I feel good today", "I'm sad",
    "I feel confused", "I feel lonely", "I'm grateful", "I'm hopeful"
  ],
  social: [
    "Thank you", "Please", "Good morning", "Good night",
    "I love you", "I understand", "I agree", "Not right now",
    "Can you stay with me?", "Come closer please", "You're welcome", "Nice to see you"
  ],
  family: [
    "I love you", "Thank you for being here", "I'm thinking of you",
    "Don't worry about me", "I'm proud of you"
  ]
};

const TABS = [
  { id: "favourites", label: "Favourites", color: "#B45309", pale: "#FEF3C7", light: "#FFFBEB", emoji: "⭐" },
  { id: "medical",    label: "Medical",    color: "#1D4ED8", pale: "#DBEAFE", light: "#EFF6FF", emoji: "🏥" },
  { id: "needs",      label: "Needs",      color: "#15803D", pale: "#DCFCE7", light: "#F0FDF4", emoji: "💧" },
  { id: "feelings",   label: "Feelings",   color: "#C2410C", pale: "#FEE2E2", light: "#FFF7ED", emoji: "❤️" },
  { id: "social",     label: "Social",     color: "#6D28D9", pale: "#EDE9FE", light: "#FAF5FF", emoji: "💬" },
  { id: "family",     label: "Family",     color: "#BE185D", pale: "#FCE7F3", light: "#FDF2F8", emoji: "👨‍👩‍👧" },
  { id: "keyboard",   label: "Type",       color: "#334155", pale: "#E2E8F0", light: "#F1F5F9", emoji: "⌨️" },
];

const KB_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M"]
];

const AU_MALE_NAMES = ["James", "Lee", "Mitchell", "Bruce", "Wayne", "Russell", "Aaron"];

const FEMALE_VOICE_NAMES = [
  "Samantha", "Victoria", "Karen", "Moira", "Tessa", "Fiona", "Allison", "Ava",
  "Susan", "Zira", "Hazel", "Linda", "Eva", "Heather", "Catherine", "Julie",
  "Tracy", "Kate", "Emily", "Aria", "Jenny", "Michelle", "Monica", "Rosa",
  "Nora", "Sara", "Satu", "Alva", "Ellen", "Luciana", "Carmit", "Alice",
  "Helena", "Laura", "Joana", "Amelie", "Paulina", "Ioana", "Lotta",
  "Milena", "Yelena", "Kyoko", "Mei-Jia", "Sin-Ji", "Damayanti", "Yuna"
];

function isFemaleVoice(v) {
  return FEMALE_VOICE_NAMES.some(n => v.name.includes(n));
}

function pickBestVoice(voices) {
  const au = voices.filter(v => v.lang.startsWith("en-AU") || v.name.includes("Australia"));
  for (const name of AU_MALE_NAMES) {
    const m = au.find(v => v.name.includes(name) && (v.name.includes("Enhanced") || v.name.includes("Premium")));
    if (m) return m;
  }
  for (const name of AU_MALE_NAMES) {
    const m = au.find(v => v.name.includes(name));
    if (m) return m;
  }
  const auEnh = au.find(v => v.name.includes("Enhanced") || v.name.includes("Premium"));
  if (auEnh) return auEnh;
  if (au.length) return au[0];
  const en = voices.filter(v => v.lang.startsWith("en") && !isFemaleVoice(v));
  for (const kw of ["Enhanced", "Premium", "Neural", "Natural", "Siri"]) {
    const m = en.find(v => v.name.includes(kw));
    if (m) return m;
  }
  return en[0] || voices[0] || null;
}

function Btn({ style, onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ border: "none", cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
        opacity: disabled ? 0.4 : 1, transition: "opacity 0.1s, transform 0.1s", ...style }}
      onMouseDown={e => { if (!disabled) { e.currentTarget.style.transform = "scale(0.95)"; e.currentTarget.style.opacity = "0.85"; }}}
      onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.opacity = ""; }}
      onTouchStart={e => { if (!disabled) { e.currentTarget.style.transform = "scale(0.95)"; e.currentTarget.style.opacity = "0.85"; }}}
      onTouchEnd={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.opacity = ""; }}>
      {children}
    </button>
  );
}

export default function App() {
  const [tab, setTab]               = useState("favourites");
  const [phrases, setPhrases]       = useState(DEFAULT_PHRASES);
  const [favourites, setFavourites] = useState([]);
  const [history, setHistory]       = useState([]);
  const [message, setMessage]       = useState("");
  const [lastSaid, setLastSaid]     = useState("");
  const [speaking, setSpeaking]     = useState(false);
  const [flash, setFlash]           = useState(null);
  const [suggestions, setSugg]      = useState([]);
  const [loadingS, setLoadingS]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory]   = useState(false);
  const [panicActive, setPanicActive]   = useState(false);
  const [settingsTab, setSettingsTab]   = useState("medical");
  const [newPhrases, setNewPhrases]     = useState({});
  const [voices, setVoices]         = useState([]);
  const [selectedVoice, setSelVoice] = useState(null);
  const [speechRate, setSpeechRate]  = useState(0.9);
  const debRef  = useRef(null);
  const panicRef = useRef(null);
  const historyEndRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("phrases").select("category, phrase").order("created_at");
        if (data && data.length) {
          const grouped = { medical: [], needs: [], feelings: [], social: [], family: [] };
          data.forEach(r => { if (grouped[r.category]) grouped[r.category].push(r.phrase); });
          setPhrases(grouped);
        }
      } catch {}
      try {
        const { data } = await supabase.from("favourites").select("phrase").order("created_at");
        if (data && data.length) setFavourites(data.map(r => r.phrase));
      } catch {}
      try {
        const stored = localStorage.getItem("aac-voice-v1");
        if (stored) { const s = JSON.parse(stored); if (s.rate) setSpeechRate(s.rate); if (s.voiceName) setSelVoice(s.voiceName); }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const load = () => {
      const v = speechSynthesis.getVoices();
      if (v.length) { setVoices(v); setSelVoice(prev => prev || pickBestVoice(v)?.name || null); }
    };
    load();
    speechSynthesis.onvoiceschanged = load;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (historyEndRef.current) historyEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [history, showHistory]);

  const saveAll = async (u) => {
    setPhrases(u);
    try {
      await supabase.from("phrases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const rows = Object.entries(u).flatMap(([cat, list]) => list.map(phrase => ({ category: cat, phrase })));
      await supabase.from("phrases").insert(rows);
    } catch {}
  };

  const saveFavs = async (f) => {
    setFavourites(f);
    try {
      await supabase.from("favourites").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (f.length) await supabase.from("favourites").insert(f.map(phrase => ({ phrase })));
    } catch {}
  };

  const saveVoice = async (n, r) => {
    try { localStorage.setItem("aac-voice-v1", JSON.stringify({ voiceName: n, rate: r })); } catch {}
  };

  const say = (text) => {
    if (!text || !text.trim()) return;
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) u.voice = voice;
    u.rate = speechRate; u.pitch = 1.0; u.volume = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    speechSynthesis.speak(u);
    setLastSaid(text);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setHistory(prev => [...prev, { text, time }]);
  };

  const tapPhrase = (ph) => {
    setFlash(ph); setTimeout(() => setFlash(null), 450);
    setMessage(ph); say(ph);
  };

  const tapYesNo = (word) => {
    setFlash(word); setTimeout(() => setFlash(null), 450);
    say(word);
  };

  const toggleFav = (ph) => {
    const next = favourites.includes(ph) ? favourites.filter(f => f !== ph) : [...favourites, ph];
    saveFavs(next);
  };

  const startPanic = () => {
    setPanicActive(true);
    const speak = () => say("I need help urgently");
    speak();
    panicRef.current = setInterval(speak, 4000);
  };

  const stopPanic = () => {
    setPanicActive(false);
    clearInterval(panicRef.current);
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  useEffect(() => { if (tab !== "keyboard") return;
    clearTimeout(debRef.current);
    if (!message.trim()) { setSugg([]); return; }
    debRef.current = setTimeout(async () => {
      setLoadingS(true);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 80,
            system: "Word prediction for a stroke patient in hospital. Return ONLY a JSON array of 5 short next-word predictions (1-2 words each). No other text, no markdown fences.",
            messages: [{ role: "user", content: "Text so far: \"" + message + "\"" }] })
        });
        const d = await res.json();
        const raw = ((d.content && d.content[0] && d.content[0].text) || "[]").replace(/```json|```/g, "").trim();
        setSugg(JSON.parse(raw).slice(0, 5));
      } catch { setSugg([]); }
      setLoadingS(false);
    }, 300);
  }, [message, tab]);

  const applyWord = (word) => setMessage(prev => {
    if (!prev || prev.endsWith(" ")) return prev + word + " ";
    const sp = prev.lastIndexOf(" ");
    return (sp >= 0 ? prev.slice(0, sp + 1) : "") + word + " ";
  });

  const addPhrase    = (cat) => { const t = (newPhrases[cat] || "").trim(); if (!t) return; saveAll({ ...phrases, [cat]: [...phrases[cat], t] }); setNewPhrases(p => ({ ...p, [cat]: "" })); };
  const removePhrase = (cat, i) => saveAll({ ...phrases, [cat]: phrases[cat].filter((_, j) => j !== i) });
  const resetCat     = (cat) => saveAll({ ...phrases, [cat]: DEFAULT_PHRASES[cat] });

  const root = { fontFamily: "-apple-system, \'Helvetica Neue\', Arial, sans-serif", background: "#EEF2F7", minHeight: "100vh", padding: 12, display: "flex", flexDirection: "column", gap: 10, maxWidth: 900, margin: "0 auto", boxSizing: "border-box" };
  const cur  = TABS.find(t => t.id === tab);

  // PANIC SCREEN
  if (panicActive) return (
    <div style={{ ...root, background: "#7F1D1D", justifyContent: "center", alignItems: "center", gap: 24 }}>
      <div style={{ fontSize: 80, textAlign: "center" }}>🆘</div>
      <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", textAlign: "center", letterSpacing: 2 }}>I NEED HELP</div>
      <div style={{ fontSize: 18, color: "#FCA5A5", textAlign: "center" }}>Speaking every 4 seconds...</div>
      <Btn style={{ marginTop: 20, padding: "22px 60px", background: "#fff", color: "#7F1D1D", borderRadius: 20, fontSize: 26, fontWeight: 900 }} onClick={stopPanic}>
        STOP
      </Btn>
    </div>
  );

  // HISTORY SCREEN
  if (showHistory) return (
    <div style={root}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Btn style={{ height: 48, padding: "0 18px", background: "#fff", color: "#0F172A", borderRadius: 12, fontSize: 16, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }} onClick={() => setShowHistory(false)}>
          &larr; Back
        </Btn>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0F172A", flex: 1 }}>Conversation History</h2>
        {history.length > 0 && (
          <Btn style={{ padding: "9px 16px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 10, fontSize: 14, fontWeight: 700 }} onClick={() => setHistory([])}>
            Clear
          </Btn>
        )}
      </div>
      <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", flex: 1, overflowY: "auto", maxHeight: "80vh" }}>
        {history.length === 0 && (
          <p style={{ color: "#94A3B8", textAlign: "center", padding: "40px 0", fontSize: 16, margin: 0 }}>
            Nothing said yet this session
          </p>
        )}
        {history.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12, padding: "12px 14px", background: "#F8FAFC", borderRadius: 12, borderLeft: "4px solid #1D4ED8" }}>
            <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: "#0F172A", lineHeight: 1.4 }}>{item.text}</div>
            <div style={{ fontSize: 13, color: "#94A3B8", whiteSpace: "nowrap", paddingTop: 2 }}>{item.time}</div>
            <Btn style={{ padding: "6px 12px", background: "#EEF2FF", color: "#3730A3", borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }} onClick={() => { say(item.text); setShowHistory(false); }}>
              Say again
            </Btn>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>
    </div>
  );

  // SETTINGS SCREEN
  if (showSettings) {
    const sc = TABS.find(t => t.id === settingsTab) || TABS[1];
    const enVoices  = voices.filter(v => v.lang.startsWith("en") && !isFemaleVoice(v));
    const auVoices  = enVoices.filter(v => v.lang.startsWith("en-AU") || v.name.includes("Australia"));
    const othVoices = enVoices.filter(v => !v.lang.startsWith("en-AU") && !v.name.includes("Australia"));
    const bestName  = pickBestVoice(voices)?.name;
    return (
      <div style={root}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Btn style={{ height: 48, padding: "0 18px", background: "#fff", color: "#0F172A", borderRadius: 12, fontSize: 16, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }} onClick={() => setShowSettings(false)}>
            &larr; Back
          </Btn>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0F172A" }}>Settings</h2>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Voice</h3>
          <label style={{ fontSize: 14, color: "#475569", fontWeight: 600, display: "block", marginBottom: 8 }}>Try each voice and pick the one that sounds right</label>
          {enVoices.length === 0 && <p style={{ color: "#94A3B8", fontSize: 14 }}>Loading voices...</p>}
          {auVoices.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#475569" }}>Australian English</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {auVoices.map(v => (
                  <div key={v.name} style={{ display: "flex", gap: 8 }}>
                    <Btn style={{ flex: 1, padding: "10px 14px", background: selectedVoice === v.name ? "#1D4ED8" : "#F1F5F9", color: selectedVoice === v.name ? "#fff" : "#0F172A", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "left" }} onClick={() => { setSelVoice(v.name); saveVoice(v.name, speechRate); }}>
                      {selectedVoice === v.name ? "✓ " : ""}{v.name}{v.name === bestName ? " (recommended)" : ""}
                    </Btn>
                    <Btn style={{ padding: "10px 14px", background: "#E0F2FE", color: "#0369A1", borderRadius: 10, fontSize: 14, fontWeight: 600 }} onClick={() => { setSelVoice(v.name); saveVoice(v.name, speechRate); setTimeout(() => say("Hello, I am using this app to communicate with you."), 100); }}>
                      Test
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          )}
          {othVoices.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#475569" }}>Other English</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {othVoices.map(v => (
                  <div key={v.name} style={{ display: "flex", gap: 8 }}>
                    <Btn style={{ flex: 1, padding: "10px 14px", background: selectedVoice === v.name ? "#1D4ED8" : "#F1F5F9", color: selectedVoice === v.name ? "#fff" : "#0F172A", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "left" }} onClick={() => { setSelVoice(v.name); saveVoice(v.name, speechRate); }}>
                      {selectedVoice === v.name ? "✓ " : ""}{v.name}{v.name === bestName ? " (recommended)" : ""}
                    </Btn>
                    <Btn style={{ padding: "10px 14px", background: "#E0F2FE", color: "#0369A1", borderRadius: 10, fontSize: 14, fontWeight: 600 }} onClick={() => { setSelVoice(v.name); saveVoice(v.name, speechRate); setTimeout(() => say("Hello, I am using this app to communicate with you."), 100); }}>
                      Test
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          )}
          <label style={{ fontSize: 14, color: "#475569", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Speed &mdash; {speechRate <= 0.75 ? "Slow" : speechRate <= 0.95 ? "Normal" : speechRate <= 1.1 ? "Faster" : "Fast"}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>Slow</span>
            <input type="range" min="0.7" max="1.3" step="0.1" value={speechRate} onChange={e => { const r = parseFloat(e.target.value); setSpeechRate(r); saveVoice(selectedVoice, r); }} style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: "#94A3B8" }}>Fast</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#94A3B8", lineHeight: 1.5 }}>
            Tip: on iPad go to Settings &rarr; Accessibility &rarr; Spoken Content &rarr; Voices &rarr; Australian English and download Lee Enhanced for the best result.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Phrases</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {TABS.filter(t => t.id !== "keyboard" && t.id !== "favourites").map(t => (
              <Btn key={t.id} style={{ padding: "8px 14px", background: settingsTab === t.id ? t.color : "#F1F5F9", color: settingsTab === t.id ? "#fff" : "#475569", borderRadius: 10, fontSize: 13, fontWeight: 700 }} onClick={() => setSettingsTab(t.id)}>
                {t.emoji} {t.label}
              </Btn>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={newPhrases[settingsTab] || ""} onChange={e => setNewPhrases(p => ({ ...p, [settingsTab]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") addPhrase(settingsTab); }}
              placeholder={"Add a phrase to " + sc.label + "..."}
              style={{ flex: 1, padding: "12px 14px", fontSize: 16, border: "2px solid " + sc.color + "44", borderRadius: 10, fontFamily: "inherit", outline: "none" }} />
            <Btn style={{ padding: "12px 20px", background: sc.color, color: "#fff", borderRadius: 10, fontSize: 16, fontWeight: 700 }} onClick={() => addPhrase(settingsTab)}>Add</Btn>
          </div>
          {(phrases[settingsTab] || []).map((ph, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <div style={{ flex: 1, padding: "13px 16px", background: sc.light, border: "1.5px solid " + sc.color + "33", borderLeft: "4px solid " + sc.color, borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{ph}</div>
              <Btn style={{ width: 40, height: 44, background: "#FEE2E2", color: "#EF4444", borderRadius: 8, fontSize: 16 }} onClick={() => removePhrase(settingsTab, i)}>x</Btn>
            </div>
          ))}
          <Btn style={{ marginTop: 10, padding: "9px 16px", background: "#F1F5F9", color: "#64748B", borderRadius: 10, fontSize: 13, fontWeight: 600 }} onClick={() => resetCat(settingsTab)}>
            Reset to defaults
          </Btn>
        </div>
      </div>
    );
  }

  // MAIN SCREEN
  const PhraseGrid = ({ list }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {list.length === 0 && (
        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px 0", color: "#94A3B8", fontSize: 15 }}>
          {tab === "favourites" ? "Tap the ☆ on any phrase to add it here" : "No phrases yet"}
        </div>
      )}
      {list.map((ph, i) => (
        <div key={i} style={{ display: "flex", gap: 6 }}>
          <Btn style={{ flex: 1, padding: "15px 12px", background: flash === ph ? cur.color : cur.light, color: flash === ph ? "#fff" : "#0F172A", border: "1.5px solid " + cur.color + "33", borderLeft: "5px solid " + cur.color, borderRadius: 12, fontSize: 15, fontWeight: 600, textAlign: "left", lineHeight: 1.35, display: "block" }} onClick={() => tapPhrase(ph)}>
            {ph}
          </Btn>
          <Btn style={{ width: 40, background: favourites.includes(ph) ? "#FEF3C7" : "#F1F5F9", color: favourites.includes(ph) ? "#D97706" : "#CBD5E1", borderRadius: 10, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} onClick={() => toggleFav(ph)}>
            {favourites.includes(ph) ? "★" : "☆"}
          </Btn>
        </div>
      ))}
    </div>
  );

  return (
    <div style={root}>

      {/* TOP BAR */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", minHeight: 66 }}>
        <div style={{ flex: 1, fontSize: 19, fontWeight: 600, color: speaking ? "#1D4ED8" : "#0F172A", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lastSaid ? (speaking ? "Speaking: " + lastSaid : lastSaid) : <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 15 }}>Tap a phrase to speak...</span>}
        </div>
        {lastSaid && (
          <Btn style={{ background: speaking ? "#D97706" : "#1D4ED8", color: "#fff", borderRadius: 10, padding: "9px 14px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }} onClick={() => say(lastSaid)}>
            {speaking ? "Speaking..." : "Again"}
          </Btn>
        )}
        <Btn style={{ height: 42, padding: "0 12px", background: "#F1F5F9", color: "#475569", borderRadius: 10, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }} onClick={() => setShowHistory(true)}>
          📋 History {history.length > 0 ? "(" + history.length + ")" : ""}
        </Btn>
        <Btn style={{ height: 42, padding: "0 14px", background: "#DC2626", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", letterSpacing: 1 }} onClick={startPanic}>
          🚨 HELP
        </Btn>
        <Btn style={{ height: 42, padding: "0 12px", background: "#475569", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }} onClick={() => setShowSettings(true)}>
          ⚙️ Settings
        </Btn>
      </div>

      {/* TABS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {TABS.map(t => (
          <Btn key={t.id} style={{ padding: "11px 3px", background: tab === t.id ? t.color : t.pale, color: tab === t.id ? "#fff" : t.color, border: "2px solid " + t.color, borderRadius: 14, fontSize: 11, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s" }} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 20 }}>{t.emoji}</span>{t.label}
          </Btn>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", flex: 1 }}>
        {tab === "favourites" && <PhraseGrid list={favourites} />}
        {tab !== "favourites" && tab !== "keyboard" && <PhraseGrid list={phrases[tab] || []} />}

        {tab === "keyboard" && (
          <div>
            <div style={{ minHeight: 62, background: "#F8FAFC", border: "2px solid #CBD5E1", borderRadius: 12, padding: "12px 16px", fontSize: 20, fontWeight: 600, color: "#0F172A", marginBottom: 12, lineHeight: 1.4, wordBreak: "break-word" }}>
              {message || <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 17 }}>Tap the keys below...</span>}
            </div>
            {(suggestions.length > 0 || loadingS) && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", minHeight: 38 }}>
                {loadingS && <span style={{ color: "#94A3B8", fontSize: 14, alignSelf: "center" }}>thinking...</span>}
                {suggestions.map((w, i) => (
                  <Btn key={i} style={{ padding: "8px 16px", background: "#EEF2FF", color: "#3730A3", borderRadius: 10, fontSize: 16, fontWeight: 600 }} onClick={() => applyWord(w)}>{w}</Btn>
                ))}
              </div>
            )}
            {KB_ROWS.map((row, ri) => (
              <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                {row.map(k => (
                  <Btn key={k} style={{ height: 56, width: 54, background: "#F1F5F9", border: "2px solid #CBD5E1", borderRadius: 10, fontSize: 18, fontWeight: 700, color: "#1E293B", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setMessage(m => m + k.toLowerCase())}>{k}</Btn>
                ))}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn style={{ flex: 1, height: 54, background: "#E2E8F0", color: "#475569", borderRadius: 12, fontSize: 15, fontWeight: 700 }} onClick={() => setMessage(m => m.slice(0, -1))}>Back</Btn>
              <Btn style={{ flex: 2, height: 54, background: "#E2E8F0", color: "#475569", borderRadius: 12, fontSize: 15, fontWeight: 700 }} onClick={() => setMessage(m => m.endsWith(" ") ? m : m + " ")}>SPACE</Btn>
              <Btn style={{ flex: 1, height: 54, background: "#FEE2E2", color: "#B91C1C", borderRadius: 12, fontSize: 15, fontWeight: 700 }} onClick={() => { setMessage(""); setSugg([]); }}>Clear</Btn>
              <Btn style={{ flex: 1.5, height: 54, background: "#1D4ED8", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 700 }} onClick={() => say(message)}>Say it</Btn>
            </div>
          </div>
        )}
      </div>

      {/* YES / NO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Btn style={{ height: 64, fontSize: 22, fontWeight: 900, color: "#fff", background: flash === "Yes" ? "#14532D" : "#16A34A", borderRadius: 16, letterSpacing: 2, boxShadow: "0 4px 16px #16A34A44" }} onClick={() => tapYesNo("Yes")}>YES</Btn>
        <Btn style={{ height: 64, fontSize: 22, fontWeight: 900, color: "#fff", background: flash === "No" ? "#7F1D1D" : "#DC2626", borderRadius: 16, letterSpacing: 2, boxShadow: "0 4px 16px #DC262644" }} onClick={() => tapYesNo("No")}>NO</Btn>
      </div>

    </div>
  );
}
