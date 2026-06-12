import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSupabase } from '@/src/lib/supabase';
import { BrainCircuit, Mail, Lock, LogIn, UserPlus, Github, Chrome, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardHeader, CardContent } from '@/src/components/ui/card';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabase();

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Identity Verified. Welcome back, Analyst.");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Record Created. Please verify your email.");
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    const supabase = getSupabase();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + from,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Abort to Intel Feed</span>
        </button>

        <div className="flex items-center gap-3 mb-12 justify-center">
          <div className="bg-yellow-500 p-2 rounded-xl">
            <BrainCircuit className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter uppercase leading-none text-zinc-100">Safe Side</h1>
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">Secure Access Terminal</p>
          </div>
        </div>

        <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
          
          <CardHeader className="pt-8 pb-4 text-center">
            <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">
              {isLogin ? 'Pro Analyst Access' : 'Register New Node'}
            </h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
              {isLogin ? 'Enter decrypted credentials' : 'Initialize professional profile'}
            </p>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                  <Input 
                    type="email" 
                    placeholder="EMAIL@ANALYST.IO" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-black border-zinc-900 rounded-xl pl-10 h-12 text-[10px] font-black tracking-widest uppercase focus:border-yellow-500/50 transition-all placeholder:text-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                  <Input 
                    type="password" 
                    placeholder="ENCRYPTED PASSWORD" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-black border-zinc-900 rounded-xl pl-10 h-12 text-[10px] font-black tracking-widest uppercase focus:border-yellow-500/50 transition-all placeholder:text-zinc-800"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert variant="destructive" className="bg-red-500/5 border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-tighter h-12 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.2)]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span>{isLogin ? 'Authenticate' : 'Initialize'}</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-900" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-zinc-950 px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Or Unified Auth</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={() => handleOAuth('google')}
                className="bg-black border-zinc-900 hover:bg-zinc-900 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                <Chrome className="w-4 h-4 mr-2" />
                Google
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleOAuth('github')}
                className="bg-black border-zinc-900 hover:bg-zinc-900 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            </div>

            <p className="mt-8 text-center text-xs font-medium text-zinc-500">
              {isLogin ? "New to the unit? " : "Already verified? "}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-yellow-500 hover:underline font-black uppercase tracking-tight"
              >
                {isLogin ? 'Initialize Node' : 'Authenticate Identity'}
              </button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
