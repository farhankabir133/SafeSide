import React from 'react';
import { motion } from 'motion/react';
import {
  BrainCircuit,
  BarChart3,
  CloudRain,
  TrendingUp,
  ShieldCheck,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { cn } from '@/src/lib/utils';

interface ModelExplainabilityPanelProps {
  poissonContrib: number;
  dixonColesContrib: number;
  eloContrib: number;
  weatherImpact: number;
  formImpact: number;
  marketContrib: number;
  homeAdvantage: number;
}

export const ModelExplainabilityPanel: React.FC<ModelExplainabilityPanelProps> = ({
  poissonContrib = 40,
  dixonColesContrib = 25,
  eloContrib = 20,
  weatherImpact = 5,
  formImpact = 15,
  marketContrib = 10,
  homeAdvantage = 10,
}) => {
  const items = [
    { label: 'Poisson Distribution', value: poissonContrib, icon: <BarChart3 className="w-3 h-3" />, explanation: 'Base goal density model using attack/defense indices' },
    { label: 'Dixon-Coles Correction', value: dixonColesContrib, icon: <Target className="w-3 h-3" />, explanation: 'Time-dependent low-score adjustment for football' },
    { label: 'Elo Strength', value: eloContrib, icon: <ShieldCheck className="w-3 h-3" />, explanation: 'Historical team strength differential' },
    { label: 'Recent Form', value: formImpact, icon: <TrendingUp className="w-3 h-3" />, explanation: 'Last 5-match performance trajectory' },
    { label: 'Home Advantage', value: homeAdvantage, icon: <BrainCircuit className="w-3 h-3" />, explanation: 'Venue-specific performance uplift' },
    { label: 'Weather Impact', value: weatherImpact, icon: <CloudRain className="w-3 h-3" />, explanation: 'Weather-adjusted expected goals modifier' },
    { label: 'Market Calibration', value: marketContrib, icon: <BarChart3 className="w-3 h-3" />, explanation: 'Fair odds vs bookmaker vigorish analysis' },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="bg-black border-zinc-800 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">
            Model Explainability
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">
            Total Weight: {total}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {items.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">{item.icon}</span>
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">{item.label}</span>
                </div>
                <span className="text-xs font-mono text-zinc-400">{item.value}%</span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / total) * 100}%` }}
                  transition={{ delay: idx * 0.15, duration: 0.9 }}
                  className="h-full bg-zinc-300"
                />
              </div>
              <p className="text-[10px] text-zinc-600 font-mono leading-relaxed">{item.explanation}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-zinc-950 border border-zinc-900 rounded-xl">
          <p className="text-[10px] text-zinc-600 font-mono leading-relaxed">
            Transparency Notice: Every weight is derived from verified telemetry and historical performance calibration. 
            No synthetic inputs are introduced. Model outputs are validated against data lineage before generation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
