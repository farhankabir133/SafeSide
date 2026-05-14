import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AgentContextType {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  selectedMatch: any | null;
  setSelectedMatch: (match: any | null) => void;
  openAgentWithMatch: (match: any) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const openAgentWithMatch = (match: any) => {
    setSelectedMatch(match);
    setIsChatOpen(true);
  };

  return (
    <AgentContext.Provider 
      value={{ 
        isChatOpen, 
        setIsChatOpen, 
        selectedMatch, 
        setSelectedMatch,
        openAgentWithMatch
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}
