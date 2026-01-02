import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyPerformance } from '../types';
import { getPerformanceHistory } from '../services/storage';
import { getAIInsight } from '../services/gemini';
import { Sparkles, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Button } from './Button';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DailyPerformance[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        const history = await getPerformanceHistory(30);
        setData(history);
    };
    loadData();
  }, []);

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    const text = await getAIInsight(data);
    setInsight(text);
    setLoadingInsight(false);
  };

  const currentRate = data.length > 0 ? data[data.length - 1].completionRate : 0;
  const previousRate = data.length > 1 ? data[data.length - 2].completionRate : 0;
  const isTrendUp = currentRate >= previousRate;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat Card 1 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 text-sm font-medium">Today's Completion</h3>
            <span className={`p-2 rounded-full ${isTrendUp ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {isTrendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{currentRate}%</p>
          <p className="text-xs text-slate-400 mt-1">vs {previousRate}% yesterday</p>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between">
            <h3 className="text-slate-500 text-sm font-medium">Active Tasks</h3>
             <span className="p-2 rounded-full bg-blue-100 text-blue-600">
              <Activity size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{data.length > 0 ? data[data.length - 1].totalTasks : 0}</p>
          <p className="text-xs text-slate-400 mt-1">Scheduled for today</p>
        </div>

        {/* AI Insight Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-xl shadow-md text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-indigo-100 text-sm font-medium flex items-center gap-2">
              <Sparkles size={14} /> AI Insight
            </h3>
          </div>
          
          {insight ? (
            <p className="text-sm font-medium leading-relaxed opacity-90 animate-in fade-in duration-500">
              "{insight}"
            </p>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-indigo-100 opacity-80">
                Get a personalized analysis of your productivity trend.
              </p>
              <Button 
                onClick={handleGenerateInsight} 
                size="sm" 
                className="bg-white/20 hover:bg-white/30 text-white border-none mt-2"
                disabled={loadingInsight}
              >
                {loadingInsight ? 'Analyzing...' : 'Generate Insight'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">30-Day Performance</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="formattedDate" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                minTickGap={30}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="completionRate" 
                stroke="#4f46e5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRate)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};