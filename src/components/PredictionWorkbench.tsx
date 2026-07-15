import React from 'react';
import { motion } from 'motion/react';
import { 
  BrainCircuit, 
  Target, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp,
  Activity,
  BarChart3,
  Zap,
  Info
} from 'lucide-react';
import { Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Progress } from '@/src/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { MultiModelPrediction } from '@/src/types/prediction';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { cn } from '@/src/lib/utils';

interface PredictionWorkbenchProps {
  prediction: MultiModelPrediction;
  match: any;
}

export const PredictionWorkbench: React.FC<PredictionWorkbenchProps> = ({ prediction, match }) => {
  const pf = prediction.poissonForecast;
  const dcf = prediction.dcForecast;
  const mrkt = prediction.marketSummary;
  const anomaly = prediction.anomalyReport;
  const cal = prediction.calibrationResult;
  const qr = prediction.quantitativeReasoning;

  const probabilityData = [
    { name: 'Home Win', value: pf.homeWinProb, color: '#22c55e' },
    { name: 'Draw', value: pf.drawProb, color: '#eab308' },
    { name: 'Away Win', value: pf.awayWinProb, color: '#ef4444' },
  ];

  const modelAgreement = [
    { model: 'Poisson', home: pf.homeWinProb, draw: pf.drawProb, away: pf.awayWinProb },
    { model: 'Dixon-Coles', home: dcf.homeWinProb, draw: dcf.drawProb, away: dcf.awayWinProb },
  ];

  const modelWeightData = [
    { subject: 'Poisson', value: 40, fullMark: 100 },
    { subject: 'Dixon-Coles', value: 35, fullMark: 100 },
    { subject: 'Elo Strength', value: 25, fullMark: 100 },
    { subject: 'Form', value: 20, fullMark: 100 },
    { subject: 'Home Adv.', value: 15, fullMark: 100 },
    { subject: 'Weather', value: 10, fullMark: 100 },
    { subject: 'Market', value: 20, fullMark: 100 },
  ];

  const riskLevel = anomaly.volatilityIndex > 70 ? 'High' : anomaly.volatilityIndex > 40 ? 'Medium' : 'Low';
  const riskColor = riskLevel === 'High' ? 'text-red-500' : riskLevel === 'Medium' ? 'text-yellow-500' : 'text-emerald-500';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-1 bg-black border-zinc-800 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Verdict</CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                {qr.finalQuantitativeVerdict}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-black font-mono tracking-tight">
              {pf.homeWinProb.toFixed(1)}% / {pf.drawProb.toFixed(1)}% / {pf.awayWinProb.toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              xG {pf.expectedGoalsHome.toFixed(2)} - {pf.expectedGoalsAway.toFixed(2)}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 uppercase tracking-wider font-black">Risk</span>
              <span className={cn('font-black uppercase', riskColor)}>{riskLevel}</span>
            </div>
            <Progress value={100 - anomaly.volatilityIndex} className="h-1 bg-zinc-900" />
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2 bg-black border-zinc-800 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Probability Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={probabilityData}>
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Probability']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {probabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="probability" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="probability" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Probability Matrix</TabsTrigger>
          <TabsTrigger value="xg" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Expected Goals</TabsTrigger>
          <TabsTrigger value="models" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Model Agreement</TabsTrigger>
          <TabsTrigger value="weights" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Feature Weights</TabsTrigger>
          <TabsTrigger value="explainability" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Explainability</TabsTrigger>
        </TabsList>

        <TabsContent value="probability" className="space-y-4">
          <Card className="bg-black border-zinc-800 text-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBlock label="Home Win" value={`${pf.homeWinProb.toFixed(1)}%`} icon={<Target className="w-4 h-4" />} color="text-emerald-500" />
                <MetricBlock label="Draw" value={`${pf.drawProb.toFixed(1)}%`} icon={<Activity className="w-4 h-4" />} color="text-yellow-500" />
                <MetricBlock label="Away Win" value={`${pf.awayWinProb.toFixed(1)}%`} icon={<AlertTriangle className="w-4 h-4" />} color="text-red-500" />
                <MetricBlock label="BTTS" value={`${(pf.bttsProb * 100).toFixed(1)}%`} icon={<Zap className="w-4 h-4" />} color="text-blue-500" />
                <MetricBlock label="Over 2.5" value={`${(pf.over25Prob * 100).toFixed(1)}%`} icon={<TrendingUp className="w-4 h-4" />} color="text-purple-500" />
                <MetricBlock label="Kelly %" value={`${pf.kellyPercentage.toFixed(2)}%`} icon={<Calculator className="w-4 h-4" />} color="text-cyan-500" />
                <MetricBlock label="Confidence" value={`${(cal.calibratedHighestProb * 100).toFixed(0)}%`} icon={<ShieldCheck className="w-4 h-4" />} color="text-emerald-400" />
                <MetricBlock label="Volatility" value={`${anomaly.volatilityIndex.toFixed(0)}/100`} icon={<BarChart3 className="w-4 h-4" />} color="text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xg">
          <Card className="bg-black border-zinc-800 text-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-zinc-500">Home Expected Goals</div>
                  <div className="text-4xl font-black font-mono">{pf.expectedGoalsHome.toFixed(2)}</div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    Poisson λ={pf.expectedGoalsHome.toFixed(2)} | DC adj={dcf.expectedGoalsHome.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-zinc-500">Away Expected Goals</div>
                  <div className="text-4xl font-black font-mono">{pf.expectedGoalsAway.toFixed(2)}</div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    Poisson λ={pf.expectedGoalsAway.toFixed(2)} | DC adj={dcf.expectedGoalsAway.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card className="bg-black border-zinc-800 text-white">
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={modelAgreement}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="model" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <Radar name="Home Win" dataKey="home" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                  <Radar name="Draw" dataKey="draw" stroke="#eab308" fill="#eab308" fillOpacity={0.2} />
                  <Radar name="Away Win" dataKey="away" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                  <Tooltip 
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#e4e4e7' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weights">
          <Card className="bg-black border-zinc-800 text-white">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {modelWeightData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-32 text-xs font-black uppercase tracking-widest text-zinc-500">{item.subject}</div>
                    <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ delay: idx * 0.1, duration: 0.8 }}
                        className="h-full bg-zinc-200"
                      />
                    </div>
                    <div className="w-12 text-right text-xs font-mono text-zinc-400">{item.value}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="explainability">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-black border-zinc-800 text-white">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Model Contributions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ContributionBar label="Poisson Distribution" value={40} explanation="Base goal density model" />
                <ContributionBar label="Dixon-Coles Correction" value={25} explanation="Low-score time-dependent adjustment" />
                <ContributionBar label="Elo Strength Differential" value={20} explanation="Historical team strength gap" />
                <ContributionBar label="Recent Form" value={15} explanation="Last 5-match performance trajectory" />
                <ContributionBar label="Home Advantage" value={10} explanation="Venue-specific performance uplift" />
                <ContributionBar label="Weather Impact" value={5} explanation="Conditions-adjusted xG modifier" />
                <ContributionBar label="Market Calibration" value={10} explanation="Fair odds vs bookmaker vig" />
              </CardContent>
            </Card>
            <Card className="bg-black border-zinc-800 text-white">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Evidence Chain</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {qr.evidenceChain.map((ev, i) => (
                    <div key={i} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-300">{ev.metricName}</span>
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {ev.statisticalSignificance}
                        </Badge>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 mb-1">{ev.observedValueString}</div>
                      <div className="text-xs text-zinc-400">{ev.deducedImpact}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card className="bg-black border-zinc-800 text-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-zinc-500" />
            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Uncertainty & Assumptions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500 leading-relaxed font-mono">
            {qr.uncertaintyExplicitLog}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

function MetricBlock({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
      <div className="flex items-center gap-2 text-zinc-500 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-xl font-black font-mono text-white">{value}</div>
    </div>
  );
}

function ContributionBar({ label, value, explanation }: { label: string; value: number; explanation: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-300">{label}</span>
        <span className="text-xs font-mono text-zinc-500">+{value}%</span>
      </div>
      <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1 }}
          className="h-full bg-zinc-400"
        />
      </div>
      <p className="text-[10px] text-zinc-600 font-mono">{explanation}</p>
    </div>
  );
}
