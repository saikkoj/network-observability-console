import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface DemoModeContextValue {
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  demoMode: true,
  setDemoMode: () => {},
});

export const DemoModeProvider = ({ children }: { children: ReactNode }) => {
  const [demoMode, setDemoMode] = useState(true);
  return (
    <DemoModeContext.Provider value={{ demoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = () => useContext(DemoModeContext);
