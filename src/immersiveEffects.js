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
].join(', ');

export function useImmersiveEffects() {
  useEffect(() => {
    const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      });
    };
  }, []);
}
