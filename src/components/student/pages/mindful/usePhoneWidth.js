import { useEffect, useState } from 'react';

// True on phone-width screens, matching the 640px breakpoint the rest of the app uses.
const QUERY = '(max-width: 640px)';

export function usePhoneWidth() {
  const [phone, setPhone] = useState(() => Boolean(window.matchMedia?.(QUERY).matches));
  useEffect(() => {
    const list = window.matchMedia?.(QUERY);
    if (!list) return undefined;
    const update = () => setPhone(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return phone;
}
