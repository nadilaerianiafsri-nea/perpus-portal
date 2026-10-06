"use client";

import { useEffect, useRef, useState } from "react";

export function useCountdown(deadline: string, onExpire: () => void) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const notified = useRef(false);
  const callback = useRef(onExpire);
  useEffect(() => { callback.current = onExpire; }, [onExpire]);
  useEffect(() => {
    notified.current = false;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !notified.current) { notified.current = true; callback.current(); }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  return seconds;
}
