import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Dealer } from '../types';
import api from '../lib/api';
import { useAuth } from './AuthContext';

interface DealerContextValue {
  dealer: Dealer | null;
  dealerId: string | null;
  dealerName: string | null;
  location: string | null;
  isLoading: boolean;
  error: string | null;
  refreshDealer: () => Promise<void>;
}

const DealerContext = createContext<DealerContextValue | null>(null);

export function DealerProvider({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDealer = useCallback(async () => {
    if (!user || role !== 'DEALER') {
      setDealer(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<Dealer>('/dealers/me');
      setDealer(data);
    } catch (err: any) {
      console.error('Failed to fetch authenticated dealer info:', err);
      setError(err?.message ?? 'Failed to load dealership profile');
      setDealer(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchDealer();
  }, [fetchDealer]);

  return (
    <DealerContext.Provider
      value={{
        dealer,
        dealerId: dealer?.dealerId ?? null,
        dealerName: dealer?.name ?? null,
        location: dealer?.location ?? null,
        isLoading,
        error,
        refreshDealer: fetchDealer,
      }}
    >
      {children}
    </DealerContext.Provider>
  );
}

export function useDealer(): DealerContextValue {
  const ctx = useContext(DealerContext);
  if (!ctx) {
    throw new Error('useDealer must be used inside DealerProvider');
  }
  return ctx;
}
