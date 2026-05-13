import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Users, Calendar, Trophy, MapPin, Globe, ArrowLeft, Zap, Shield, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ai, MODEL_ID } from '@/src/services/geminiService';
import { PredictionCard } from '@/src/components/PredictionCard';
import { usePredictions } from '@/src/hooks/usePredictions';

export default function TeamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [aiReport, setAiReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { matches, predictions } = usePredictions();

  useEffect(() => {
    if (id) {
      fetchTeamDetails();
      fetchTeamMatches();
    }
  }, [id]);

  const fetchTeamDetails = async () => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      const data = await res.json();
      setTeam(data);
    } catch (e) {
      console.error("Failed to fetch team details");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMatches = async () => {
    try {
      const res = await fetch(`/api/teams/${id}/matches?status=SCHEDULED`);
      const data = await res.json();
      setFixtures(data.matches || []);
    } catch (e) {
      console.error("Failed to fetch team matches");
    }
  };

  const generateTeamReport = async () => {
    if (!team || isGeneratingReport) return;
    setIsGeneratingReport(true);
    setAiReport('');

    const prompt = `Role: Professional Tactical Analyst.
Analyze ${team.name}. 
Base Info: Founded ${team.founded}, Stadium: ${team.venue}, Colors: ${team.clubColors}.
Squad size: ${team.squad?.length || 'Unknown'}.

Requirements:
1. Provide a professional risk assessment for their upcoming period.
2. Consider tactical setup and dependency on key nodes (players).
3. Factor in 'Safe Side' fatigue mechanics for this specific squad size.
Output in markdown.`;

    try {
      const result = await ai.generateContent(prompt);
      setAiReport(result.response.text());
    } catch (e) {
      setAiReport("Tactical uplink failed. Signal blocked.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-24 space-y-12">
      <Skeleton className="h-12 w-64 bg-zinc-900" />
      <div className="flex gap-8">
        <Skeleton className="w-32 h-32 rounded-full bg-zinc-900" />
        <div className="space-y-4 flex-1">
          <Skeleton className="h-10 w-3/4 bg-zinc-900" />
          <Skeleton className="h-6 w-1/2 bg-zinc-900" />
        </div>
      </div>
    </div>
  );

  if (!team) return <div className="p-24 text-center font-black text-4xl uppercase tracking-tighter text-zinc-800">Target Node Not Found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <button 
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">Abort to Command Post</span>
      </button>

      {/* Team Header */}
      <div className="relative mb-24">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-blue-500/10 blur-[100px] opacity-50" />
        
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-48 h-48 bg-zinc-950 border border-zinc-900 rounded-[40px] p-8 flex items-center justify-center shadow-2xl relative group"
          >
            <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors rounded-[40px]" />
            <img 
              src={team.crest} 
              alt={team.name} 
              className="w-full h-full object-contain relative z-10" 
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
              <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 font-mono text-[10px] py-1 px-3 border border-zinc-800 uppercase tracking-[0.2em]">
                Node ID: {team.id}
              </Badge>
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/5 font-mono text-[10px] py-1 px-3 uppercase tracking-[0.2em]">
                {team.area?.name || 'International'}
              </Badge>
            </div>
            
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none mb-6">
              {team.name}
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Venue', value: team.venue, icon: MapPin },
                { label: 'Founded', value: team.founded, icon: Calendar },
                { label: 'Colors', value: team.clubColors, icon: Shield },
                { label: 'Web Entry', value: team.website?.replace('http://', '').replace('https://', ''), icon: Globe },
              ].map((info, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-900">
                    <info.icon className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{info.label}</p>
                    <p className="text-xs font-bold text-zinc-300 truncate max-w-[150px]">{info.value || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="squad" className="space-y-12">
        <TabsList className="bg-zinc-950/50 border border-zinc-900 p-1 h-14 rounded-2xl w-full md:w-auto overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="squad" className="h-full rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8">Squad Roster</TabsTrigger>
          <TabsTrigger value="fixtures" className="h-full rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8">Next Fixtures</TabsTrigger>
          <TabsTrigger value="intelligence" className="h-full rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8">AI Tactical Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="squad">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {team.squad?.length > 0 ? (
              team.squad.map((player: any, i: number) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className="bg-zinc-950 border-zinc-900 p-5 rounded-2xl hover:border-zinc-700 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-700 font-mono text-xs group-hover:border-yellow-500/50 group-hover:text-yellow-500 transition-colors">
                        {player.shirtNumber || '#'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-100 group-hover:text-white">{player.name}</h4>
                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">{player.position?.replace('GOALKEEPER', 'GK').replace('DEFENDER', 'DEF').replace('MIDFIELDER', 'MID').replace('OFFENCE', 'FWD') || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">{player.nationality}</p>
                       <p className="text-[10px] font-mono text-zinc-500">{player.dateOfBirth ? new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear() : '??'} yrs</p>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full p-24 text-center border-2 border-dashed border-zinc-900 rounded-[40px] opacity-30">
                <Users className="w-16 h-16 mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">Node Data Encrypted or Empty</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fixtures" className="space-y-6">
          {fixtures.length > 0 ? (
            fixtures.map((m: any) => (
              <PredictionCard 
                key={m.id}
                match={m}
                analysis={predictions[m.id] as any}
                onQueryAgent={() => {}}
                onViewDetails={() => navigate(`/teams/${m.id === team.id ? (m.homeTeam.id === team.id ? m.awayTeam.id : m.homeTeam.id) : m.homeTeam.id}`)}
              />
            ))
          ) : (
            <div className="p-24 text-center border-2 border-dashed border-zinc-900 rounded-[40px] opacity-30">
              <Calendar className="w-16 h-16 mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">No Scheduled Engagement Logged</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="intelligence">
          <Card className="bg-zinc-950 border-zinc-900 p-12 rounded-[40px] relative overflow-hidden">
            {!aiReport && !isGeneratingReport ? (
              <div className="text-center py-12">
                 <BrainCircuit className="w-16 h-16 text-zinc-800 mx-auto mb-8 animate-pulse" />
                 <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">Tactical Node Analysis</h3>
                 <p className="text-zinc-500 max-w-lg mx-auto mb-10 text-sm">Deploy SafeSide Oracle to perform a full deep-dive tactical audit on {team.name}'s current squad configuration and fatigue bottlenecks.</p>
                 <button 
                  onClick={generateTeamReport}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-tighter h-14 px-12 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all"
                 >
                   Initiate Tactical Scan
                 </button>
              </div>
            ) : isGeneratingReport ? (
              <div className="space-y-8 py-12">
                 <div className="flex items-center gap-4 text-yellow-500">
                    <Zap className="w-6 h-6 animate-bounce" />
                    <span className="text-2xl font-black uppercase tracking-tighter">Parsing Squad Matrix...</span>
                 </div>
                 <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4 bg-zinc-900 rounded-lg" />
                    <Skeleton className="h-6 w-full bg-zinc-900 rounded-lg" />
                    <Skeleton className="h-32 w-full bg-zinc-900 rounded-3xl" />
                 </div>
              </div>
            ) : (
              <div className="prose prose-invert prose-zinc max-w-none">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-500 p-2 rounded-xl">
                      <BrainCircuit className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter m-0">Tactical Audit: {team.name}</h3>
                  </div>
                  <button 
                    onClick={generateTeamReport}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
                  >
                    Re-Verify Node
                  </button>
                </div>
                <div className="bg-black/40 border border-zinc-900 p-8 md:p-12 rounded-[32px] font-medium leading-relaxed text-zinc-400">
                  <ReactMarkdown>{aiReport}</ReactMarkdown>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
