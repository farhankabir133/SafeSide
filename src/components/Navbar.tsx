import React, { useState } from 'react';
import { BrainCircuit, Globe, LogIn, LayoutDashboard, Settings, LogOut, Menu, X, User, Zap, Search, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { Separator } from '@/src/components/ui/separator';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAgent } from '@/src/contexts/AgentContext';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";

interface NavbarProps {
  accuracy: number;
  leagueCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ accuracy, leagueCount }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { setIsChatOpen } = useAgent();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="border-b border-zinc-900 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="bg-yellow-500 p-1.5 rounded-lg">
            <BrainCircuit className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter uppercase leading-none text-zinc-100">Safe Side</h1>
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">Intelligence Unit</p>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Home</Link>
            <Link to="/live-analysis" className="text-[10px] font-black uppercase tracking-widest text-yellow-500 hover:text-yellow-450 transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Analysis
            </Link>
            <Link to="/leagues" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Leagues</Link>
            <Link to="/tools/bankroll" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Tools</Link>
            <Link to="/pricing" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Pricing</Link>
          </div>
          
          <Separator orientation="vertical" className="h-8 bg-zinc-800" />
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openConsole'))}
              className="p-2 border border-zinc-800 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 transition-colors group"
            >
              <Search className="w-4 h-4 text-zinc-500 group-hover:text-white" />
            </button>

            <button 
              onClick={() => setIsChatOpen(true)}
              className="group flex flex-col items-center hover:opacity-80 transition-all"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <BrainCircuit className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-[10px] uppercase font-black text-yellow-500 tracking-[0.2em] leading-none">Agent</span>
              </div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300">Tactical Scan</span>
            </button>

            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest leading-none">Global Accuracy</span>
              <span className="text-sm font-black text-emerald-500">{(accuracy || 0).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-600" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest leading-none">Active Zones</span>
                <span className="text-[11px] font-black text-zinc-300">{leagueCount}</span>
              </div>
            </div>
          </div>

          <Separator orientation="vertical" className="h-8 bg-zinc-800" />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 p-0 overflow-hidden">
                  <User className="h-5 w-5 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-zinc-300" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black leading-none uppercase tracking-tighter">
                      {user.email?.split('@')[0] || 'Analyst'}
                    </p>
                    <p className="text-xs leading-none text-zinc-500 font-mono">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="hover:bg-zinc-900 focus:bg-zinc-900 cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-zinc-900 focus:bg-zinc-900 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="hover:bg-zinc-900 focus:bg-zinc-900 text-red-400 focus:text-red-400 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-tighter h-10 px-6 rounded-xl"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Access Unit
            </Button>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <Button 
          variant="ghost" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-zinc-400 hover:text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6 text-yellow-500" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Animated Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden border-t border-zinc-900 bg-black/95 backdrop-blur-2xl overflow-hidden"
          >
            <div className="px-6 py-8 space-y-6">
              {/* Primary Links */}
              <div className="grid grid-cols-2 gap-4">
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl hover:bg-zinc-800 transition-colors text-[10px] font-black uppercase tracking-widest text-zinc-300"
                >
                  <LayoutDashboard className="w-4 h-4 text-zinc-500" />
                  <span>Home</span>
                </Link>
                <Link 
                  to="/live-analysis" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl hover:bg-zinc-800 transition-colors text-[10px] font-black uppercase tracking-widest text-yellow-500"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live HUD</span>
                </Link>
                <Link 
                  to="/leagues" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl hover:bg-zinc-800 transition-colors text-[10px] font-black uppercase tracking-widest text-zinc-300"
                >
                  <Globe className="w-4 h-4 text-zinc-500" />
                  <span>Leagues</span>
                </Link>
                <Link 
                  to="/tools/bankroll" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl hover:bg-zinc-800 transition-colors text-[10px] font-black uppercase tracking-widest text-zinc-300"
                >
                  <Settings className="w-4 h-4 text-zinc-500" />
                  <span>Bankroll</span>
                </Link>
                <Link 
                  to="/pricing" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="col-span-2 flex items-center justify-between p-3.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/10 transition-colors text-[10px] font-black uppercase tracking-widest text-yellow-500"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>View Pricing Plans</span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <Separator className="bg-zinc-900" />

              {/* Auxiliary Quick Scanners & Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                      <Search className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Search Match Console</p>
                      <p className="text-xs text-zinc-300 font-bold font-mono">Instant Scans</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      window.dispatchEvent(new CustomEvent('openConsole'));
                    }}
                    className="border-zinc-800 hover:border-zinc-700 bg-zinc-900 font-black text-[9px] uppercase tracking-wider rounded-lg"
                  >
                    Open
                  </Button>
                </div>

                <div 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsChatOpen(true);
                  }}
                  className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-yellow-500/15 transition-all"
                >
                  <BrainCircuit className="w-8 h-8 text-yellow-500 animate-pulse shrink-0" />
                  <div className="space-y-1">
                     <p className="text-xs font-black text-white uppercase tracking-tight">AI Predictions Lab</p>
                     <p className="text-[10px] text-zinc-400 font-sans">Open Oracle copilot to trace Physical telemetry vectors</p>
                  </div>
                </div>
              </div>

              {/* Global Accuracy Metric and Statistics */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-950 border border-zinc-900 p-4 rounded-2xl font-mono text-center">
                <div>
                  <span className="text-[8px] uppercase font-bold text-zinc-550 tracking-widest block mb-0.5">Accuracy</span>
                  <span className="text-sm font-black text-emerald-500">{(accuracy || 0).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-zinc-550 tracking-widest block mb-0.5">Active Zones</span>
                  <span className="text-sm font-black text-zinc-300">{leagueCount}</span>
                </div>
              </div>

              <Separator className="bg-zinc-900" />

              {/* User Sign In/Profile Area */}
              <div className="pt-2">
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 p-4 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-black text-zinc-650 tracking-widest">Logged In as</span>
                          <span className="text-xs font-black text-white">{user.email?.split('@')[0].toUpperCase()}</span>
                        </div>
                        <Button
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            navigate('/dashboard');
                          }}
                          className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-black text-[9px] uppercase tracking-wider"
                        >
                          Cockpit
                        </Button>
                    </div>
                    
                    <Button 
                      onClick={async () => {
                        setIsMobileMenuOpen(false);
                        await handleSignOut();
                      }}
                      className="w-full bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 font-black uppercase text-xs tracking-wider h-11 rounded-xl"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      De-Authorize Session
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate('/auth');
                    }}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wider h-11 rounded-xl"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Access Tactical Unit
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
