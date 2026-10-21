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
  '.mc-card', '.mc-level-card', '.mc-clue-game', '.mc-clue-level-intro', '.mc-clue-level-win',
  '.about-approach-card', '.about-value-card', '.home-feature-card', '.feature-card',
].join(', ');

export function useImmersiveEffects() {
  useEffect(() => {
    const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canTilt = !systemReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const tracked = new Set();
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
    };

    const unregister = (surface) => {
      if (!tracked.delete(surface)) return;
      revealObserver?.unobserve(surface);
      delete surface.dataset.depthSurface;
      delete surface.dataset.reveal;
      delete surface.dataset.visible;
      surface.style.removeProperty('--depth-delay');
      surface.style.removeProperty('--depth-rotation');
      surface.style.removeProperty('--depth-glow-x');
      surface.style.removeProperty('--depth-glow-y');
    };

    const scan = (node) => {
      if (!(node instanceof Element)) return;
      if (node.matches(surfaceSelector)) register(node);
      node.querySelectorAll(surfaceSelector).forEach(register);
    };

    scan(document.body);
    const mutations = new MutationObserver((records) => {
      const removedNodes = records.flatMap((record) => [...record.removedNodes]);
      const addedNodes = records.flatMap((record) => [...record.addedNodes]);
      removedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(surfaceSelector)) unregister(node);
        node.querySelectorAll(surfaceSelector).forEach(unregister);
      });
      addedNodes.forEach(scan);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    let activeSurface = null;
    const resetSurface = (surface) => {
      surface.style.removeProperty('--depth-rotation');
    };
    const movePointer = (event) => {
      if (!canTilt || document.documentElement.dataset.motion !== 'full' || event.pointerType === 'touch') return;
      const surface = event.target instanceof Element ? event.target.closest('[data-depth-surface="true"]') : null;
      if (!surface) {
        if (activeSurface) resetSurface(activeSurface);
        activeSurface = null;
        return;
      }
      if (surface.closest('.reduced-motion, .low-sensory-mode')) {
        if (activeSurface) resetSurface(activeSurface);
        activeSurface = null;
        return;
      }
      if (activeSurface && activeSurface !== surface) resetSurface(activeSurface);
      activeSurface = surface;
      const bounds = surface.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      const tiltX = -y * 6;
      const tiltY = x * 7;
      const tilt = Math.hypot(tiltX, tiltY);
      const axisX = tilt ? tiltX / tilt : 0;
      const axisY = tilt ? tiltY / tilt : 1;
      surface.style.setProperty('--depth-rotation', `${axisX.toFixed(3)} ${axisY.toFixed(3)} 0 ${tilt.toFixed(2)}deg`);
      surface.style.setProperty('--depth-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      surface.style.setProperty('--depth-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const leaveSurface = (event) => {
      if (!(event.target instanceof Element)) return;
      const previous = event.target.closest('[data-depth-surface="true"]');
      const next = event.relatedTarget instanceof Element
        ? event.relatedTarget.closest('[data-depth-surface="true"]')
        : null;
      if (!previous || previous === next) return;
      resetSurface(previous);
      if (activeSurface === previous) activeSurface = null;
    };
    document.addEventListener('pointermove', movePointer, { passive: true });
    document.addEventListener('pointerout', leaveSurface);
    const syncPageVisibility = () => { document.documentElement.dataset.pageVisible = String(document.visibilityState === 'visible'); };
    syncPageVisibility();
    document.addEventListener('visibilitychange', syncPageVisibility);

    return () => {
      mutations.disconnect();
      revealObserver?.disconnect();
      document.removeEventListener('pointermove', movePointer);
      document.removeEventListener('pointerout', leaveSurface);
      document.removeEventListener('visibilitychange', syncPageVisibility);
      delete document.documentElement.dataset.pageVisible;
      if (activeSurface) resetSurface(activeSurface);
      tracked.forEach((surface) => {
        delete surface.dataset.depthSurface;
        delete surface.dataset.reveal;
        delete surface.dataset.visible;
        surface.style.removeProperty('--depth-delay');
        surface.style.removeProperty('--depth-glow-x');
        surface.style.removeProperty('--depth-glow-y');
      });
    };
  }, []);
}
