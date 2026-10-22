import { useEffect } from 'react';

const surfaceSelector = [
  '.session-card', '.my-session-row', '.student-note-card', '.leaderboard-row', '.stats-grid article',
  '.podium-card', '.mindful-points-card', '.sensory-card', '.career-card',
  '.settings-card', '.settings-details', '.feature-grid article', '.about-value',
  '.points-info-box', '.career-result', '.sensory-history-entry', '.calm-breath-card', '.calm-videos',
  '.mentor-session-card', '.performance-card', '.mentor-sensory-card',
  '.mentor-parent-thread', '.private-session-list article', '.parent-summary article',
  '.parent-child-card', '.parent-connect-card', '.parent-teacher-thread',
  '.premium-plan', '.premium-plan-card', '.premium-feature-card', '.premium-checkout-card',
  '.study-profile-card', '.practice-question', '.student-subject-setup-card',
  '.profile-flow-card', '.uploaded-notes > div', '.performance-empty',
  '.mentor-rankings article',
  '.quick-prompt-row', '.related-question-row', '.career-opportunity-card',
  '.about-approach-card', '.about-value-card', '.home-feature-card', '.feature-card',
  '.learning-path-preview-card', '.testimonial-card', '.learning-path-choice',
].join(', ');
const floatSelector = '.hero-orb-book, .hero-float-coral, .hero-float-yellow, .hero-float-mint, .hero-art-label, .learning-path-node, .learning-path-spark-one, .learning-path-spark-two';
const floatTimings = [[6.1, -1.4], [7.3, -2.7], [5.6, -0.8], [8.2, -3.1], [6.8, -2.1], [7.7, -0.6], [5.9, -2.4], [8.5, -1.7]];

export function useImmersiveEffects() {
  useEffect(() => {
    const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tracked = new Set();
    const floating = new Set();
    let revealObserver;

    if (!systemReducedMotion && document.documentElement.dataset.motion !== 'off' && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.dataset.reveal = 'shown';
            entry.target.dataset.visible = 'true';
          } else {
            entry.target.dataset.visible = 'false';
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    }

    const register = (surface) => {
      if (tracked.has(surface)) return;
      tracked.add(surface);
      surface.dataset.depthSurface = 'true';
      surface.dataset.reveal = systemReducedMotion || document.documentElement.dataset.motion === 'off' || !revealObserver ? 'shown' : 'pending';
      surface.style.setProperty('--depth-delay', `${(tracked.size - 1) % 5 * 45}ms`);
      if (revealObserver) revealObserver.observe(surface);
      const tiltAtPointer = (event) => {
        if (event.pointerType === 'touch' || systemReducedMotion
          || ['off', 'reduced'].includes(document.documentElement.dataset.motion)
          || document.documentElement.dataset.lowSensory === 'true') return;
        const bounds = surface.getBoundingClientRect();
        const x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
        const y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
        const angle = Math.hypot(x, y) * 9;
        surface.style.setProperty('--depth-rotation', angle < 0.1 ? '0 0 1 0deg' : `${(-y).toFixed(3)} ${x.toFixed(3)} 0 ${angle.toFixed(2)}deg`);
        surface.style.setProperty('--depth-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
        surface.style.setProperty('--depth-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
      };
      const resetPointer = (event) => {
        if (event.pointerType === 'touch') return;
        surface.style.removeProperty('--depth-rotation');
        surface.style.removeProperty('--depth-glow-x');
        surface.style.removeProperty('--depth-glow-y');
      };
      surface.addEventListener('pointermove', tiltAtPointer, { passive: true });
      surface.addEventListener('pointerleave', resetPointer, { passive: true });
      surface.__cogniDepthHandlers = [tiltAtPointer, resetPointer];
    };

    const unregister = (surface) => {
      if (!tracked.delete(surface)) return;
      revealObserver?.unobserve(surface);
      delete surface.dataset.depthSurface;
      delete surface.dataset.reveal;
      delete surface.dataset.visible;
      surface.style.removeProperty('--depth-delay');
      surface.__cogniDepthHandlers?.forEach((handler, index) => surface.removeEventListener(index === 0 ? 'pointermove' : 'pointerleave', handler));
      delete surface.__cogniDepthHandlers;
      surface.style.removeProperty('--depth-rotation');
      surface.style.removeProperty('--depth-glow-x');
      surface.style.removeProperty('--depth-glow-y');
    };

    const registerFloat = (element) => {
      if (floating.has(element)) return;
      floating.add(element);
      element.dataset.floatSurface = 'true';
      const [duration, delay] = floatTimings[(floating.size - 1) % floatTimings.length];
      element.style.setProperty('--float-duration', `${duration}s`);
      element.style.setProperty('--float-delay', `${delay}s`);
    };

    const unregisterFloat = (element) => {
      if (!floating.delete(element)) return;
      delete element.dataset.floatSurface;
      element.style.removeProperty('--float-duration');
      element.style.removeProperty('--float-delay');
    };

    const scan = (node) => {
      if (!(node instanceof Element)) return;
      if (node.matches(surfaceSelector)) register(node);
      node.querySelectorAll(surfaceSelector).forEach(register);
      if (node.matches(floatSelector)) registerFloat(node);
      node.querySelectorAll(floatSelector).forEach(registerFloat);
    };

    scan(document.body);
    const mutations = new MutationObserver((records) => {
      const removedNodes = records.flatMap((record) => [...record.removedNodes]);
      const addedNodes = records.flatMap((record) => [...record.addedNodes]);
      removedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(surfaceSelector)) unregister(node);
        node.querySelectorAll(surfaceSelector).forEach(unregister);
        if (node.matches(floatSelector)) unregisterFloat(node);
        node.querySelectorAll(floatSelector).forEach(unregisterFloat);
      });
      addedNodes.forEach(scan);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    const syncPageVisibility = () => { document.documentElement.dataset.pageVisible = String(document.visibilityState === 'visible'); };
    syncPageVisibility();
    document.addEventListener('visibilitychange', syncPageVisibility);

    return () => {
      mutations.disconnect();
      revealObserver?.disconnect();
      document.removeEventListener('visibilitychange', syncPageVisibility);
      delete document.documentElement.dataset.pageVisible;
      tracked.forEach((surface) => {
        delete surface.dataset.depthSurface;
        delete surface.dataset.reveal;
        delete surface.dataset.visible;
        surface.style.removeProperty('--depth-delay');
        surface.__cogniDepthHandlers?.forEach((handler, index) => surface.removeEventListener(index === 0 ? 'pointermove' : 'pointerleave', handler));
        delete surface.__cogniDepthHandlers;
        surface.style.removeProperty('--depth-rotation');
        surface.style.removeProperty('--depth-glow-x');
        surface.style.removeProperty('--depth-glow-y');
      });
      floating.forEach((element) => {
        delete element.dataset.floatSurface;
        element.style.removeProperty('--float-duration');
        element.style.removeProperty('--float-delay');
      });
    };
  }, []);
}
