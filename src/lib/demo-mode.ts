"use client";

import { useState, useEffect } from 'react';

export function useDemoMode() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('aero_demo_mode');
    if (saved === 'true') setIsDemo(true);

    const handleStorage = () => setIsDemo(localStorage.getItem('aero_demo_mode') === 'true');
    window.addEventListener('storage', handleStorage);
    window.addEventListener('aero:demo-toggle', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('aero:demo-toggle', handleStorage);
    };
  }, []);

  const toggleDemo = (val: boolean) => {
    localStorage.setItem('aero_demo_mode', String(val));
    window.dispatchEvent(new Event('aero:demo-toggle'));
  };

  return { isDemo, toggleDemo };
}
