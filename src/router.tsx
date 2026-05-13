import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { MainLayout } from './layouts/MainLayout';
import AuthPage from './pages/AuthPage';
import LeaguesIndexPage from './pages/LeaguesIndexPage';
import LeaguePage from './pages/LeaguePage';
import TeamPage from './pages/TeamPage';
import DashboardPage from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';

// Placeholder Pages
const BankrollPage = () => <div className="p-24 text-center font-black text-4xl uppercase tracking-tighter">Vault Encryption Active</div>;
const PricingPage = () => <div className="p-24 text-center font-black text-4xl uppercase tracking-tighter">Procurement Logic Initializing</div>;
const NotFoundPage = () => <div className="p-24 text-center font-black text-4xl uppercase tracking-tighter">Coordinate Error (404)</div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: '/', element: <App /> },
      { path: '/auth', element: <AuthPage /> },
      { 
        path: '/dashboard', 
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ) 
      },
      { path: '/leagues', element: <LeaguesIndexPage /> },
      { path: '/leagues/:slug', element: <LeaguePage /> },
      { path: '/teams/:id', element: <TeamPage /> },
      { 
        path: '/tools/bankroll', 
        element: (
          <ProtectedRoute>
            <BankrollPage />
          </ProtectedRoute>
        ) 
      },
      { path: '/pricing', element: <PricingPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
