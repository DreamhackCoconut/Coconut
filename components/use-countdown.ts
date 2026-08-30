'use client';

import { useEffect, useState } from 'react';

export function useCountdown(targetIso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: diff <= 0,
  };
}
