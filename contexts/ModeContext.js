'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ModeContext = createContext({ mode: 'solve', setMode: () => {} });

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState('solve');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('quiz-mode');
      if (saved === 'solve' || saved === 'study') setModeState(saved);
    } catch {}
  }, []);

  const setMode = (next) => {
    setModeState(next);
    try { localStorage.setItem('quiz-mode', next); } catch {}
  };

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export const useMode = () => useContext(ModeContext);
