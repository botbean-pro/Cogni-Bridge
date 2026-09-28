import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import logoWithoutText from "../assets/logo without text.svg";

const LOGO_PATH = logoWithoutText;

export function LogoImage({ size = 28 }) {
  const [hasLogo, setHasLogo] = useState(true);
  return hasLogo ? <img src={LOGO_PATH} alt="" width={size} height={size} onError={() => setHasLogo(false)} /> : <Sparkles size={size} aria-hidden="true" />;
}
export function AnimatedLogo() {
  return (
    <div className="intro-mark" aria-hidden="true">
      <span className="intro-half intro-left">
        <img src={logoWithoutText} alt="" width={140} height={140} />
      </span>
      <span className="intro-half intro-right">
        <img src={logoWithoutText} alt="" width={140} height={140} />
      </span>
    </div>
  );
}
export function MouseTrail() {
  useEffect(() => {
    const circle = document.createElement('div');
    circle.className = 'mouse-trail-circle';
    document.body.appendChild(circle);

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrame = null;
    let fadeTimer = null;
    let hasPosition = false;

    const animate = () => {
      // Exponential easing: fast at first, then gently settling near the cursor.
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      circle.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;

      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        animationFrame = null;
      }
    };

    const handleMouseMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!hasPosition) {
        currentX = targetX;
        currentY = targetY;
        hasPosition = true;
      }

      circle.classList.add('is-visible');
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => circle.classList.remove('is-visible'), 700);

      if (animationFrame === null) animationFrame = requestAnimationFrame(animate);
    };

    const handleMouseLeave = () => {
      window.clearTimeout(fadeTimer);
      circle.classList.remove('is-visible');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.clearTimeout(fadeTimer);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      circle.remove();
    };
  }, []);

  return null;
}

