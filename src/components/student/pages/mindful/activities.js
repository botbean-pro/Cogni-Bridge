// Mindful Corner activities, grouped by what a student is in the mood for.
// Every game here is either written for Cogni-Bridge after an MIT-licensed
// original, or embedded from its own site. See each component for the credit.
export const categoryOrder = ['Educational', 'Puzzles', 'Playing', 'Relaxing'];

export const categoryKeys = {
  Educational: 'mcCategoryEducational',
  Puzzles: 'mcCategoryPuzzles',
  Playing: 'mcCategoryPlay',
  Relaxing: 'mcCategoryRelax',
};

export const activities = [
  { id: 'wordCoach', path: 'word-coach', icon: '📖', group: 'Educational', titleKey: 'mcWordCoachTitle', noteKey: 'mcWordCoachNote', title: 'Word Coach' },
  { id: 'wordSearch', path: 'word-search', icon: '🔤', group: 'Educational', titleKey: 'mcWordSearchTitle', noteKey: 'mcWordSearchNote', title: 'Word Search' },
  { id: 'untrusted', path: 'untrusted', icon: '💻', group: 'Educational', titleKey: 'mcUntrustedTitle', noteKey: 'mcUntrustedNote', title: 'Untrusted', desktopOnly: true, fullScreen: true },
  { id: 'g2048', path: '2048', icon: '🔢', group: 'Puzzles', titleKey: 'mc2048Title', noteKey: 'mc2048Note', title: '2048' },
  { id: 'lights', path: 'lights-out', icon: '💡', group: 'Puzzles', titleKey: 'mcLightsTitle', noteKey: 'mcLightsNote', title: 'Lights Out' },
  { id: 'pipes', path: 'flow-pipes', icon: '🔗', group: 'Puzzles', titleKey: 'mcPipesTitle', noteKey: 'mcPipesNote', title: 'Flow Pipes' },
  { id: 'snake', path: 'snake', icon: '🐍', group: 'Playing', titleKey: 'mcSnakeTitle', noteKey: 'mcSnakeNote', title: 'Snake' },
  { id: 'simon', path: 'simon-memory', icon: '🎵', group: 'Playing', titleKey: 'mcSimonTitle', noteKey: 'mcSimonNote', title: 'Simon Memory' },
  { id: 'breathing', path: 'breathing-buddy', icon: '🌈', group: 'Relaxing', titleKey: 'mcBreathingTitle', noteKey: 'mcBreathingNote', title: 'Breathing Buddy' },
  { id: 'garden', path: 'sensory-garden', icon: '🌻', group: 'Relaxing', titleKey: 'mcGardenTitle', noteKey: 'mcGardenNote', title: 'Sensory Garden' },
];

export const activityById = (id) => activities.find((item) => item.id === id);
export const activityByPath = (path) => activities.find((item) => item.path === path);
