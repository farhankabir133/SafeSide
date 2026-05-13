import React from 'react';
import { BrainCircuit, Globe, LogIn, LayoutDashboard, Settings, LogOut, Menu, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { Separator } from '@/src/components/ui/separator';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
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
            <Link to="/leagues" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Leagues</Link>
            <Link to="/tools/bankroll" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Tools</Link>
            <Link to="/pricing" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Pricing</Link>
          </div>
          
          <Separator orientation="vertical" className="h-8 bg-zinc-800" />
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest leading-none">Global Accuracy</span>
              <span className="text-sm font-black text-emerald-500">{accuracy.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-600" />
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest leading-none whitespace-nowrap">Active Leagues: {leagueCount}</span>
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
        <Button variant="ghost" className="lg:hidden p-2 text-zinc-400">
          <Menu className="w-6 h-6" />
        </Button>
      </div>
    </nav>
  );
};
