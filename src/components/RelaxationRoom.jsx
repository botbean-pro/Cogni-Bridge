import React, { useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Music2, Youtube } from "lucide-react";
import "./RelaxationRoom.css";

const soundscapes = [
  { id: "rain", title: "Healing Vibes", detail: "Soft and calm English love songs.", Icon: Music2 },
  { id: "ocean", title: "Classical Music", detail: "Beautiful classical pieces for a peaceful pause.", Icon: Music2 },
  { id: "channel", title: "Calming Music", detail: "Browse calming music videos from this channel.", Icon: Youtube },
  { id: "music", title: "Featured Music", detail: "A music video for a quiet pause.", Icon: Music2 },
];

export function RelaxationRoom({ onBack, t = (key) => key }) {
  const [channelOpen, setChannelOpen] = useState(false);
  const [oceanOpen, setOceanOpen] = useState(false);
  const [rainOpen, setRainOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const channelFrame = useRef(null);

  const moveChannelVideo = (direction) => {
    const func = direction === "next" ? "nextVideo" : "previousVideo";
    channelFrame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "https://www.youtube-nocookie.com",
    );
  };

  return <div className="relax-room">
    <div className="relax-room-glow relax-room-glow-one" aria-hidden="true" /><div className="relax-room-glow relax-room-glow-two" aria-hidden="true" />
    <header className="relax-room-header"><button type="button" className="relax-back" onClick={onBack}><ArrowLeft size={17} />{t("backToPortal")}</button></header>
    <section className="relax-room-intro"><div className="relax-room-orb" aria-hidden="true"><span>☼</span></div><h1>{t("quietSpaceTitle")}</h1><p>{t("quietSpaceCopy")}</p></section>
    <section className="relax-sound-grid" aria-label={t("soundscapes")}>
      {soundscapes.map(({ id, title, detail, Icon }) => <article className="relax-sound-card" key={id}>
        <span className="relax-sound-icon"><Icon size={23} /></span><h2>{id === "channel" ? title : t(`sound_${id}`) || title}</h2><p>{id === "channel" ? detail : t(`sound_${id}_detail`) || detail}</p>
        {id === "channel"
          ? <button type="button" aria-expanded={channelOpen} onClick={() => setChannelOpen((open) => !open)}>{channelOpen ? "Hide channel videos" : "Browse channel videos"}</button>
          : id === "ocean"
            ? <button type="button" aria-expanded={oceanOpen} onClick={() => setOceanOpen((open) => !open)}>{oceanOpen ? "Hide video" : "Play video"}</button>
            : id === "rain"
              ? <button type="button" aria-expanded={rainOpen} onClick={() => setRainOpen((open) => !open)}>{rainOpen ? "Hide video" : "Play video"}</button>
              : <button type="button" aria-expanded={musicOpen} onClick={() => setMusicOpen((open) => !open)}>{musicOpen ? "Hide video" : "Play video"}</button>}
      </article>)}
    </section>
    {rainOpen && <section className="relax-channel" aria-label="Healing Vibes music video">
      <h2>{t("sound_rain") || "Healing Vibes"}</h2>
      <p>{t("sound_rain_detail") || "Soft and calm English love songs."}</p>
      <div className="relax-channel-player">
        <iframe
          title="Healing Vibes music video"
          src="https://www.youtube-nocookie.com/embed/5mxT40MnNi0?rel=0"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>}
    {oceanOpen && <section className="relax-channel" aria-label="Classical music video">
      <h2>{t("sound_ocean") || "Classical Music"}</h2>
      <p>{t("sound_ocean_detail") || "Beautiful classical pieces for a peaceful pause."}</p>
      <div className="relax-channel-player">
        <iframe
          title="Classical music video"
          src="https://www.youtube-nocookie.com/embed/WQhFl7RdBh8?rel=0"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>}
    {musicOpen && <section className="relax-channel" aria-label="Featured music video">
      <h2>{t("sound_music") || "Featured Music"}</h2>
      <p>{t("sound_music_detail") || "A music video for a quiet pause."}</p>
      <div className="relax-channel-player">
        <iframe
          title="Featured music video"
          src="https://www.youtube-nocookie.com/embed/FS93cEWcwQA?rel=0"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>}
    {channelOpen && <section className="relax-channel" aria-label="Calming Music channel videos">
      <h2>Calming Music</h2>
      <p>Browse videos from the channel here.</p>
      <div className="relax-channel-nav" role="group" aria-label="Channel video navigation">
        <button type="button" onClick={() => moveChannelVideo("previous")}><ChevronLeft size={18} /> Previous video</button>
        <button type="button" onClick={() => moveChannelVideo("next")}>Next video <ChevronRight size={18} /></button>
      </div>
      <div className="relax-channel-player">
        <iframe
          ref={channelFrame}
          title="Calming Music channel videos"
          src={`https://www.youtube-nocookie.com/embed/videoseries?list=UUXMznD66TYLRiJM4mx0ewog&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>}
    <p className="relax-kind-note">{t("quietSpaceNote")}</p>
  </div>;
}
