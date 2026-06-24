import { createContext, useContext, useState } from 'react';

const CelebrationContext = createContext(null);

export function CelebrationProvider({ children }) {
  const [triggerCelebration, setTriggerCelebration] = useState(false);

  const startCelebration = () => {
    setTriggerCelebration(true);
    setTimeout(() => {
      setTriggerCelebration(false);
    }, 5000); // Confetti effect lasts 5 seconds
  };

  return (
    <CelebrationContext.Provider value={{ triggerCelebration, startCelebration }}>
      {children}
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}
