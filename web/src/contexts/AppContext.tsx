import React, { createContext, useContext, ReactNode } from 'react';
import type { DocumentContent } from '@/lib/types';

interface AppContextType {
  selectedDocId: string | null;
  selectedSectionId: string | null;
  docContent: DocumentContent | null;
  setSelectedDocId: (id: string | null) => void;
  setSelectedSectionId: (id: string | null) => void;
  setDocContent: (content: DocumentContent | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
  value: AppContextType;
}

export function AppProvider({ children, value }: AppProviderProps) {
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
