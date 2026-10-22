import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bird, CloudRain, Headphones, Music2, Pause, Play, Square, Waves } from "lucide-react";
import "./RelaxationRoom.css";

const soundscapes = [
  { id: "rain", title: "Soft rain", detail: "A gentle, steady rain ambience.", Icon: CloudRain },
  { id: "ocean", title: "Slow ocean", detail: "Soft waves with a slow, calming swell.", Icon: Waves },
  { id: "birds", title: "Morning birds", detail: "Light bird-like chirps over quiet air.", Icon: Bird },
  { id: "music", title: "Quiet melody", detail: "A soft, repeating instrumental tone.", Icon: Music2 },
];

function makeNoise(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * 0.45;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function RelaxationRoom({ onBack, t = (key) => key }) {
  const [active, setActive] = useState([]);
  const [volume, setVolume] = useState(18);
  const [message, setMessage] = useState("");
  const [voiceState, setVoiceState] = useState("idle");
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");
  const nodes = useRef({});
  const speech = typeof window !== "undefined" ? window.speechSynthesis : null;

  useEffect(() => {
    if (!speech) return undefined;
    const updateVoices = () => {
      const available = speech.getVoices();
      setVoices(available);
      setVoiceName((current) => current || available.find((voice) => voice.lang.toLowerCase().startsWith("en"))?.name || available[0]?.name || "");
    };
    updateVoices();
    speech.addEventListener?.("voiceschanged", updateVoices);
    return () => speech.removeEventListener?.("voiceschanged", updateVoices);
  }, [speech]);

  const stopOne = (id) => {
    const item = nodes.current[id];
    if (!item) return;
    item.sources.forEach((source) => { try { source.stop(); } catch { /* Already stopped. */ } });
    item.context.close().catch(() => {});
    delete nodes.current[id];
    setActive((current) => current.filter((key) => key !== id));
  };

  const stopVoice = () => {
    speech?.cancel();
    setVoiceState("idle");
  };

  const stopAll = () => {
    Object.keys(nodes.current).forEach(stopOne);
    stopVoice();
  };

  useEffect(() => () => {
    Object.values(nodes.current).forEach(({ sources, context }) => {
      sources.forEach((source) => { try { source.stop(); } catch { /* Already stopped. */ } });
      context.close().catch(() => {});
    });
    nodes.current = {};
    speech?.cancel();
  }, []);

  useEffect(() => {
    Object.values(nodes.current).forEach(({ gains }) => gains.forEach((gain) => { gain.gain.value = volume / 100 / Math.max(1, active.length); }));
  }, [volume, active.length]);

  const play = async (id) => {
    if (nodes.current[id]) { stopOne(id); return; }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { setMessage("Audio playback is not available in this browser."); return; }
    try {
      const context = new AudioContextClass();
      await context.resume();
      const master = context.createGain();
      master.gain.value = volume / 100 / (active.length + 1);
      master.connect(context.destination);
      const sources = [];
      const gains = [master];
      if (id === "rain" || id === "ocean") {
        const noise = makeNoise(context);
        const filter = context.createBiquadFilter();
        filter.type = id === "rain" ? "lowpass" : "bandpass";
        filter.frequency.value = id === "rain" ? 1200 : 420;
        filter.Q.value = id === "ocean" ? 0.65 : 0.2;
        const swell = context.createGain();
        swell.gain.value = id === "rain" ? 0.72 : 0.3;
        if (id === "ocean") {
          swell.gain.setValueAtTime(0.18, context.currentTime);
          swell.gain.linearRampToValueAtTime(0.65, context.currentTime + 4);
          swell.gain.linearRampToValueAtTime(0.18, context.currentTime + 8);
          const pulse = () => {
            if (!nodes.current[id]) return;
            swell.gain.cancelScheduledValues(context.currentTime);
            swell.gain.setValueAtTime(swell.gain.value, context.currentTime);
            swell.gain.linearRampToValueAtTime(0.65, context.currentTime + 4);
            swell.gain.linearRampToValueAtTime(0.18, context.currentTime + 8);
            window.setTimeout(pulse, 8000);
          };
          window.setTimeout(pulse, 8000);
        }
        noise.connect(filter); filter.connect(swell); swell.connect(master); noise.start(); sources.push(noise);
      } else {
        const notes = id === "music" ? [261.63, 329.63, 392, 329.63] : [880, 1174.66, 988, 783.99];
        const oscillator = context.createOscillator();
        const toneGain = context.createGain();
        oscillator.type = id === "music" ? "sine" : "sine";
        oscillator.frequency.value = notes[0];
        toneGain.gain.value = id === "birds" ? 0.16 : 0.12;
        oscillator.connect(toneGain); toneGain.connect(master); oscillator.start();
        let index = 0;
        const tick = () => {
          if (!nodes.current[id]) return;
          index = (index + 1) % notes.length;
          oscillator.frequency.setTargetAtTime(notes[index], context.currentTime, id === "birds" ? 0.025 : 0.8);
          window.setTimeout(tick, id === "birds" ? 420 : 1500);
        };
        window.setTimeout(tick, id === "birds" ? 420 : 1500);
        sources.push(oscillator);
      }
      nodes.current[id] = { context, sources, gains };
      setActive((current) => [...current, id]);
      setMessage("Sound is on. You can pause it anytime.");
    } catch {
      setMessage("Audio could not start. You can still enjoy a quiet pause.");
    }
  };

  const startVoice = () => {
    if (!speech || typeof window.SpeechSynthesisUtterance === "undefined") {
      setMessage("Spoken guidance is not available in this browser.");
      return;
    }
    speech.cancel();
    const guide = new window.SpeechSynthesisUtterance(
      "Settle into a comfortable position. Let your shoulders soften. Breathe in slowly through your nose. And gently breathe out. There is nothing you need to solve right now. Take one more easy breath in, and let it go. Stay here for as long as you need."
    );
    const selectedVoice = voices.find((voice) => voice.name === voiceName);
    if (selectedVoice) guide.voice = selectedVoice;
    guide.rate = 0.78;
    guide.pitch = 0.92;
    guide.volume = Math.min(1, volume / 100);
    guide.onend = () => setVoiceState("idle");
    guide.onerror = () => setVoiceState("idle");
    speech.speak(guide);
    setVoiceState("speaking");
    setMessage("A calming voice guide is playing. Pause or stop it whenever you like.");
  };

  const pauseVoice = () => {
    if (!speech) return;
    if (voiceState === "speaking") {
      speech.pause();
      setVoiceState("paused");
    } else if (voiceState === "paused") {
      speech.resume();
      setVoiceState("speaking");
    }
  };

  return <div className="relax-room">
    <div className="relax-room-glow relax-room-glow-one" aria-hidden="true" /><div className="relax-room-glow relax-room-glow-two" aria-hidden="true" />
    <header className="relax-room-header"><button type="button" className="relax-back" onClick={onBack}><ArrowLeft size={17} />{t("backToPortal")}</button><span><Headphones size={17} /> {t("quietSpaceEyebrow")}</span></header>
    <section className="relax-room-intro"><div className="relax-room-orb" aria-hidden="true"><span>☼</span></div><p className="relax-kicker">{t("quietSpaceEyebrow")}</p><h1>{t("quietSpaceTitle")}</h1><p>{t("quietSpaceCopy")}</p></section>
    <section className="relax-sound-grid" aria-label={t("soundscapes")}>
      {soundscapes.map(({ id, title, detail, Icon }) => <article className={`relax-sound-card${active.includes(id) ? " is-playing" : ""}`} key={id}>
        <span className="relax-sound-icon"><Icon size={23} /></span><h2>{t(`sound_${id}`) || title}</h2><p>{t(`sound_${id}_detail`) || detail}</p>
        <button type="button" aria-pressed={active.includes(id)} onClick={() => play(id)}>{active.includes(id) ? t("pauseSound") : t("playSound")}</button>
      </article>)}
    </section>
    <section className="relax-voice" aria-labelledby="relax-voice-title">
      <div className="relax-voice-copy"><span className="relax-voice-icon" aria-hidden="true">✦</span><div><p className="relax-voice-kicker">Optional guided pause</p><h2 id="relax-voice-title">A calming voice</h2><p>A gentle breathing guide, spoken aloud. It only starts when you press play.</p></div></div>
      <div className="relax-voice-actions">
        {voices.length > 0 && <label className="relax-voice-picker">Voice<select value={voiceName} onChange={(event) => setVoiceName(event.target.value)} disabled={voiceState !== "idle"}>{voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}</option>)}</select></label>}
        {voiceState === "idle" ? <button type="button" onClick={startVoice}><Play size={16} fill="currentColor" /> Play voice</button> : <><button type="button" onClick={pauseVoice}><Pause size={16} fill="currentColor" /> {voiceState === "paused" ? "Resume" : "Pause"}</button><button className="relax-voice-stop" type="button" onClick={stopVoice}><Square size={15} fill="currentColor" /> Stop voice</button></>}
      </div>
      {!speech && <p className="relax-voice-unavailable">Spoken guidance is not available in this browser.</p>}
    </section>
    <section className="relax-controls"><label htmlFor="relax-volume">{t("soundLevel")} <strong>{volume}%</strong></label><input id="relax-volume" type="range" min="0" max="200" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /><button type="button" onClick={stopAll} disabled={!active.length}>{t("stopAllSounds")}</button></section>
    <p className="relax-kind-note">{t("quietSpaceNote")}</p><p className="relax-status" role="status" aria-live="polite">{message}</p>
  </div>;
}
