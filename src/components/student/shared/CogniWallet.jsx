import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Coins, Crown, Gift, LoaderCircle, RefreshCw, ShoppingBag, Ticket, X } from 'lucide-react';
import { supabaseConfigured } from '../../../supabaseClient';
import { loadCogniRewards, loadCogniWallet, redeemCogniReward } from '../../../cogniRewards';
import './CogniWallet.css';

const dateTime = (value) => new Date(value).toLocaleString(document.documentElement.lang || 'en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const createRequestId = () => window.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });

export function CogniWallet({ signedIn, studentName }) {
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState({ subscriptions: [], workshops: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeOpen, setStoreOpen] = useState(false);
  const [category, setCategory] = useState('subscription');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const requestId = useRef(null);
  const storeDialogRef = useRef(null);
  const confirmDialogRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!signedIn || !supabaseConfigured) { setWallet(null); return; }
    setLoading(true);
    setError('');
    try {
      const [nextWallet, nextCatalog] = await Promise.all([loadCogniWallet(), loadCogniRewards()]);
      setWallet(nextWallet);
      setCatalog(nextCatalog);
    } catch (cause) {
      setError(cause.message || 'Could not load your Cogni Points wallet.');
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!storeOpen && !selected) return undefined;
    const dialog = selected ? confirmDialogRef.current : storeDialogRef.current;
    dialog?.querySelector('button:not(:disabled)')?.focus();
    const handleDialogKeys = (event) => {
      if (event.key === 'Escape' && !busy) { setSelected(null); setStoreOpen(false); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),[tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault(); focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault(); focusable[0].focus();
      }
    };
    document.addEventListener('keydown', handleDialogKeys);
    return () => document.removeEventListener('keydown', handleDialogKeys);
  }, [storeOpen, selected, busy]);

  const rewards = category === 'subscription' ? catalog.subscriptions : catalog.workshops;
  const openConfirm = (reward) => { setNotice(''); requestId.current = createRequestId(); setSelected(reward); };
  const confirmRedeem = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await redeemCogniReward(selected.id, requestId.current || createRequestId());
      await refresh();
      setSelected(null);
      setNotice(result.status === 'enrolled'
        ? `You're enrolled in ${selected.title}.`
        : `${selected.title} has been added to your rewards.`);
    } catch (cause) {
      setNotice(cause.message || 'Redemption failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const balance = Number(wallet?.balance || 0);
  const categories = [
    ['subscription', 'Premium access', <Crown size={17} key="crown" />],
    ['workshop', 'Workshops', <Ticket size={17} key="ticket" />],
  ];

  return <section className="cogni-wallet" aria-labelledby="cogni-wallet-title">
    <div className="cogni-wallet-head">
      <div className="cogni-wallet-brand"><span><Coins size={21} /></span><div><p className="eyebrow">COGNI POINTS</p><h2 id="cogni-wallet-title">{studentName ? `${studentName}'s wallet` : 'Your wallet'}</h2></div></div>
      <button className="cogni-store-open" type="button" onClick={() => { setStoreOpen(true); setNotice(''); }} disabled={!supabaseConfigured || !signedIn}><ShoppingBag size={17} /> Rewards Store</button>
    </div>
    {loading && !wallet ? <p className="cogni-wallet-state" role="status"><LoaderCircle size={17} className="cogni-spin" /> Loading wallet…</p>
      : !supabaseConfigured ? <p className="cogni-wallet-state">Sign in with the connected account database to create a secure, persistent wallet.</p>
        : !signedIn ? <p className="cogni-wallet-state">Sign in to view your points and rewards.</p>
          : error ? <div className="cogni-wallet-state cogni-wallet-error" role="alert">{error}<button type="button" onClick={refresh}><RefreshCw size={15} /> Retry</button></div>
            : <>
              <div className="cogni-wallet-stats">
                <div className="cogni-wallet-balance"><span>Available balance</span><strong>{balance.toLocaleString()} <small>pts</small></strong><span className="cogni-wallet-ambient" aria-hidden="true" /></div>
                <div><span>Total earned</span><strong>{Number(wallet?.total_earned || 0).toLocaleString()} <small>pts</small></strong></div>
                <div><span>Total redeemed</span><strong>{Number(wallet?.total_redeemed || 0).toLocaleString()} <small>pts</small></strong></div>
              </div>
              {wallet?.premium_expires_at && <p className="cogni-entitlement"><Crown size={16} /> Premium access through {dateTime(wallet.premium_expires_at)}</p>}
              {notice && <p className="cogni-wallet-notice" role="status"><Check size={16} /> {notice}</p>}
              <div className="cogni-wallet-lower">
                <section aria-labelledby="cogni-transactions-title"><h3 id="cogni-transactions-title">Recent transactions</h3>
                  {!wallet?.transactions?.length ? <p className="cogni-empty">Complete a session to earn your first points.</p> : <ul className="cogni-ledger">{wallet.transactions.slice(0, 5).map((transaction) => <li key={transaction.id}><span className={transaction.points > 0 ? 'cogni-earned' : 'cogni-spent'}>{transaction.points > 0 ? '+' : ''}{transaction.points} pts</span><span><strong>{transaction.reason}</strong><small>{dateTime(transaction.created_at)}</small></span><small>Balance {transaction.balance_after}</small></li>)}</ul>}
                </section>
                <section aria-labelledby="cogni-redemptions-title"><h3 id="cogni-redemptions-title">Your rewards</h3>
                  {!wallet?.redemptions?.length ? <p className="cogni-empty">Rewards you redeem will appear here.</p> : <ul className="cogni-redemption-list">{wallet.redemptions.slice(0, 4).map((item) => <li key={item.id}><Gift size={16} /><span><strong>{item.title}</strong><small>{item.status === 'enrolled' ? 'Workshop enrollment' : item.expires_at ? `Through ${dateTime(item.expires_at)}` : dateTime(item.issued_at)}</small></span></li>)}</ul>}
                </section>
              </div>
            </>}

    {storeOpen && createPortal(<div className={`cogni-modal-scrim cogni-store-scrim${document.querySelector('.app')?.classList.contains('theme-dark') ? ' theme-dark' : ''}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setStoreOpen(false); }}><section ref={storeDialogRef} className="cogni-store-modal" role="dialog" aria-modal="true" aria-labelledby="cogni-store-title" tabIndex={-1}><button className="cogni-modal-close" type="button" aria-label="Close Rewards Store" onClick={() => setStoreOpen(false)}><X size={19} /></button><p className="eyebrow">COGNIBRIDGE REWARDS</p><h2 id="cogni-store-title">Rewards Store</h2><p className="cogni-store-balance">Available: <strong>{balance.toLocaleString()} Cogni Points</strong></p>
      <div className="cogni-store-tabs" role="tablist" aria-label="Reward categories">{categories.map(([key, label, icon]) => <button key={key} role="tab" aria-selected={category === key} className={category === key ? 'active' : ''} type="button" onClick={() => setCategory(key)}>{icon}{label}</button>)}</div>
      {rewards.length ? <div className="cogni-reward-grid">{rewards.map((reward) => {
        const unavailable = reward.category === 'workshop' && reward.seats_left === 0;
        return <article className="cogni-reward-card" key={reward.id}><span className="cogni-reward-icon">{reward.category === 'workshop' ? <Ticket size={19} /> : <Crown size={19} />}</span><h3>{reward.title}</h3><p>{reward.description || (reward.category === 'workshop' ? 'A scheduled CogniBridge learning session.' : 'Premium Flow access.')}</p><div className="cogni-reward-meta">{reward.duration_days && <span>{reward.duration_days} days</span>}{reward.date && <span>{new Date(`${reward.date}T${reward.start_time || '00:00'}`).toLocaleString(document.documentElement.lang || 'en-IN', { dateStyle: 'medium', timeStyle: reward.start_time ? 'short' : undefined })}</span>}{reward.instructor && <span>With {reward.instructor}</span>}{reward.category === 'workshop' && <span>{reward.seats_left == null ? 'Seats not tracked' : `${reward.seats_left} seats left`}</span>}</div><div className="cogni-reward-footer"><strong><Coins size={16} /> {reward.points_cost.toLocaleString()} pts</strong><button type="button" disabled={unavailable || balance < reward.points_cost} onClick={() => openConfirm(reward)}>{unavailable ? 'Full' : balance < reward.points_cost ? 'Not enough points' : 'Redeem'}</button></div></article>;
      })}</div> : <p className="cogni-empty cogni-store-empty">{category === 'workshop' ? 'No point-redemption workshops are configured yet.' : 'No subscription rewards are available right now.'}</p>}
    </section></div>, document.body)}

    {selected && createPortal(<div className={`cogni-modal-scrim cogni-confirm-scrim${document.querySelector('.app')?.classList.contains('theme-dark') ? ' theme-dark' : ''}`}><section ref={confirmDialogRef} className="cogni-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="cogni-confirm-title" tabIndex={-1}><button className="cogni-modal-close" type="button" aria-label="Close confirmation" disabled={busy} onClick={() => setSelected(null)}><X size={19} /></button><p className="eyebrow">CONFIRM REDEMPTION</p><h2 id="cogni-confirm-title">{selected.title}</h2><p>Redeem for <strong>{selected.points_cost.toLocaleString()} points</strong>?</p><p className="cogni-after-balance">Remaining balance: <strong>{(balance - selected.points_cost).toLocaleString()} pts</strong></p>{notice && <p className="cogni-wallet-error" role="alert">{notice}</p>}<div className="cogni-confirm-actions"><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button><button type="button" disabled={busy || balance < selected.points_cost} onClick={confirmRedeem}>{busy ? <><LoaderCircle size={16} className="cogni-spin" /> Processing…</> : 'Confirm redemption'}</button></div></section></div>, document.body)}
  </section>;
}
