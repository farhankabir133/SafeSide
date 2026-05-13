import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { BrainCircuit } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="bg-yellow-500 p-3 rounded-2xl animate-pulse mb-6">
          <BrainCircuit className="w-8 h-8 text-black" />
        </div>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] animate-pulse">Authenticating Analyst Node...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
