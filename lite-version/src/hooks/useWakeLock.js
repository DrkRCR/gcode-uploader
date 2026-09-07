import { useState, useEffect, useCallback } from 'react';

export function useWakeLock() {
  const [isSupported] = useState('wakeLock' in navigator);
  const [isActive, setIsActive] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);

  const request = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const lock = await navigator.wakeLock.request('screen');
      
      lock.addEventListener('release', () => {
        setIsActive(false);
        setWakeLock(null);
      });
      
      setWakeLock(lock);
      setIsActive(true);
      return true;
    } catch (err) {
      console.error('Wake Lock error:', err);
      return false;
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setIsActive(false);
    }
  }, [wakeLock]);

  // Re-acquire lock if visibility changes (e.g. user minimized and came back)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await request();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [wakeLock, request]);

  return { isSupported, isActive, request, release };
}
