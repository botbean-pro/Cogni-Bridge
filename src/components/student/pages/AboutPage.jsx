import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Globe2, HeartHandshake, Pause, Play, ShieldCheck, Sparkles } from "lucide-react";
import { TextPath } from "../shared/TextPath";
import pihuPhoto from "../../../assets/testimonials/pihu.png";
import lalitaPhoto from "../../../assets/testimonials/lalita.png";

const principles = [
  ["aboutWiderWorld", Globe2],
  ["aboutSafeSpace", ShieldCheck],
  ["aboutSupport", HeartHandshake],
  ["aboutOpenToEveryone", Sparkles],
];

const testimonials = [
  {
    quote: "Usually after like 20 mins of reading PDF assignments my eyes start burning and my head hurts really bad. With the low stimulation mode and audio summary stuff on cognibridge I can actually finish my schoolwork without feeling totally drained by dinner.",
    name: "Pihu", detail: "Class 9", kind: "student", photo: pihuPhoto,
  },
  {
    quote: "I honestly hate competitive leaderboards on other apps cause seeing everyone ahead of me just makes me anxious. The break reminders and cognipoints here feel super chill and actually encourage me to keep my study streak going.",
    name: "Lalita", detail: "Class 7", kind: "student", photo: lalitaPhoto,
  },
  {
    quote: "Homework time used to be an absolute battlefield at our house with constant meltdowns from sensory overload. The break popups on CogniBridge give my son a gentle cue to pause before he gets totally overwhelmed. It's made evening study time so much more peaceful.",
    name: "Priya S.", detail: "Mom to a 12-year-old", kind: "parent",
  },
  {
    quote: "Honestly, it’s just nice not having to stand over my daughter's shoulder all evening. I can check the dashboard to see how she’s pacing through her lessons without making her feel micromanaged.",
    name: "Meera N.", detail: "Parent", kind: "parent",
  },
  {
    quote: "Converting dense textbook chapters into simple mind maps with one click while being totally cost-efficient has been a game changer in my classroom. My students with learning differences on the website actually engage with the content now instead of just closing their laptops and losing the will to learn.",
    name: "Devansh Sharma", detail: "Special Educator", kind: "educator",
  },
  {
    quote: "Finding safe digital spaces for neurodivergent kids to collaborate is really tough. The small micro-groups here in Cognibridge give my students a quiet, comfortable environment where they feel safe enough to reach out and make friends.",
    name: "Sunita R.", detail: "Inclusive School Teacher", kind: "educator",
  },
];

export function AboutPage({ t, onExploreSessions }) {
  const trackRef = useRef(null);
  const scrollEndRef = useRef(null);
  const activeIndexRef = useRef(1);
  const [activeIndex, setActiveIndex] = useState(1);
  const [userPaused, setUserPaused] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);

  const scrollToIndex = useCallback((index, requestedBehavior) => {
    const track = trackRef.current;
    const cards = track?.querySelectorAll(".testimonial-card");
    if (!track || !cards?.length) return;
    const nextIndex = (index + cards.length) % cards.length;
    const card = cards[nextIndex];
    const prefersStill = document.documentElement.dataset.lowSensory === "true"
      || document.documentElement.dataset.motion !== "full"
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = requestedBehavior || (prefersStill ? "auto" : "smooth");
    const trackBounds = track.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    const targetLeft = track.scrollLeft + cardBounds.left + cardBounds.width / 2 - trackBounds.left - track.clientWidth / 2;
    const left = Math.max(0, Math.min(track.scrollWidth - track.clientWidth, targetLeft));
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    track.scrollTo({ left, behavior });
  }, []);
  const moveCarousel = useCallback((direction) => scrollToIndex(activeIndexRef.current + direction), [scrollToIndex]);

  const syncActiveCard = () => {
    const track = trackRef.current;
    if (!track) return;
    const trackBounds = track.getBoundingClientRect();
    const center = trackBounds.left + track.clientWidth / 2;
    const cards = [...track.querySelectorAll(".testimonial-card")];
    const nearestIndex = cards.reduce((best, card, index) => {
      const bounds = card.getBoundingClientRect();
      const distance = Math.abs(bounds.left + bounds.width / 2 - center);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;
    activeIndexRef.current = nearestIndex;
    setActiveIndex(nearestIndex);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => scrollToIndex(1, "auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [scrollToIndex]);

  useEffect(() => () => window.clearTimeout(scrollEndRef.current), []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (userPaused || pointerInside || focusInside) return;
      if (document.documentElement.dataset.lowSensory === "true") return;
      if (document.documentElement.dataset.motion !== "full") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      moveCarousel(1);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [userPaused, pointerInside, focusInside, moveCarousel]);

  return (
    <div className="about-page" id="about-us">
      <section className="about-values-section">
        <p className="about-section-label">{t("aboutUs")}</p>
        <TextPath
          text={[t("aboutHeading"), t("aboutEyebrow")]}
          duration={30}
          className="about-heading-text"
        />
        <div className="about-values-grid">
          {principles.map(([key, Icon], index) => (
            <article className={`about-value about-value-${index + 1}`} key={key}>
              <span className="about-value-icon"><Icon size={23} /></span>
              <h2>{t(`${key}Title`)}</h2>
              <p>{t(`${key}Description`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="about-approach-section">
        <div className="about-approach-copy">
          <p className="eyebrow">{t("aboutApproachEyebrow")}</p>
          <h2>{t("aboutApproachHeading")}</h2>
          <p>{t("aboutApproachDescription")}</p>
        </div>
        <button className="about-approach-cta" onClick={onExploreSessions}>
          {t("seeWhatLearning")} <ArrowRight size={18} />
        </button>
      </section>
      <section className="community-testimonials" aria-labelledby="community-testimonials-title">
        <header className="testimonials-heading">
          <p className="eyebrow">{t("testimonialEyebrow")}</p>
          <h2 id="community-testimonials-title">{t("testimonialHeading")}</h2>
          <p>{t("testimonialDescription")}</p>
        </header>

        <div className="testimonial-carousel">
          <div className="testimonial-stage" onMouseEnter={() => setPointerInside(true)} onMouseLeave={() => setPointerInside(false)} onFocusCapture={() => setFocusInside(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false); }}>
            <button type="button" className="testimonial-control testimonial-arrow testimonial-arrow-prev" aria-label={t("previousTestimonial")} onClick={() => moveCarousel(-1)}><ChevronLeft size={21} /></button>
            <div className="testimonial-carousel-track" ref={trackRef} role="region" aria-roledescription="carousel" aria-label={t("testimonialCarouselLabel")} tabIndex={0} aria-live="off" onScroll={() => {
              window.clearTimeout(scrollEndRef.current);
              scrollEndRef.current = window.setTimeout(syncActiveCard, 110);
            }} onKeyDown={(event) => {
              if (event.key === "ArrowRight") { event.preventDefault(); moveCarousel(1); }
              if (event.key === "ArrowLeft") { event.preventDefault(); moveCarousel(-1); }
            }}>
              {testimonials.map((item, index) => (
                <figure className={`testimonial-card testimonial-card-${item.kind}${activeIndex === index ? " testimonial-card-active" : ""}`} key={item.name} style={{ "--card-index": index, "--side-tilt": index < activeIndex ? "3deg" : "-3deg" }} role="group" aria-roledescription="slide" aria-label={`${index + 1} / ${testimonials.length}`}>
                  <span className="testimonial-kind">{t(`${item.kind}TestimonialGroup`)}</span>
                  {item.photo && <img className="testimonial-photo" src={item.photo} alt="" loading="lazy" />}
                  <blockquote>&ldquo;{item.quote}&rdquo;</blockquote>
                  <figcaption><strong>{item.name}</strong><span>{item.detail}</span></figcaption>
                </figure>
              ))}
            </div>
            <button type="button" className="testimonial-control testimonial-arrow testimonial-arrow-next" aria-label={t("nextTestimonial")} onClick={() => moveCarousel(1)}><ChevronRight size={21} /></button>
          </div>
          <div className="testimonial-carousel-footer">
            <div className="testimonial-dots" role="group" aria-label={t("testimonialPagination")}>
              {testimonials.map((item, index) => <button type="button" className={`testimonial-dot${activeIndex === index ? " active" : ""}`} key={item.name} aria-label={t("goToTestimonial", { number: index + 1 })} aria-current={activeIndex === index ? "true" : undefined} onClick={() => scrollToIndex(index)} />)}
            </div>
            <button type="button" className="testimonial-control testimonial-pause" aria-label={t(userPaused ? "resumeTestimonials" : "pauseTestimonials")} aria-pressed={userPaused} onClick={() => setUserPaused((paused) => !paused)}>
              {userPaused ? <Play size={16} /> : <Pause size={16} />}<span>{t(userPaused ? "resumeTestimonials" : "pauseTestimonials")}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
