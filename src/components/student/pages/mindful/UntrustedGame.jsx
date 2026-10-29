import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { usePhoneWidth } from './usePhoneWidth';

// Untrusted by Alex Nisnevich and Greg Shuflin, embedded from its own site
// (CC BY-NC-SA 3.0). Nothing from the game is copied into this repository.
// It needs a keyboard and a wide code editor, so it stays off on phones.
const GAME_URL = 'https://untrustedgame.com/';

export function UntrustedGame({ t, onExit }) {
  const phone = usePhoneWidth();
  if (phone) {
    return <div className="mc-untrusted-away">
      <p>{t('Untrusted needs a keyboard and a wide screen for its code editor, so it is only available on a computer.')}</p>
      <p className="mc-credit">{t('Untrusted was made by Alex Nisnevich and Greg Shuflin and runs here from its own site, under CC BY-NC-SA 3.0.')}</p>
    </div>;
  }
  return <div className="mc-untrusted">
    <div className="mc-untrusted-bar">
      <button type="button" onClick={onExit}><ArrowLeft size={17} /> {t('Exit activity')}</button>
      <p>{t('Escape each room by rewriting the JavaScript that builds it. Click inside the game, then use the arrow keys to move.')}</p>
      <a href={GAME_URL} target="_blank" rel="noreferrer noopener">{t('Open it in a new tab')} <ExternalLink size={14} /></a>
    </div>
    <iframe className="mc-untrusted-frame" src={GAME_URL} title={t('Untrusted, a JavaScript puzzle game')} allow="fullscreen" />
    <p className="mc-credit">{t('Untrusted was made by Alex Nisnevich and Greg Shuflin and runs here from its own site, under CC BY-NC-SA 3.0.')}</p>
  </div>;
}
