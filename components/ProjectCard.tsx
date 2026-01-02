import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { BulkTask } from '../types';
import { Building2, CheckCircle2 } from 'lucide-react';

interface ProjectCardProps {
  project: BulkTask;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const completedCount = project.subTasks.filter(st => st.isCompleted).length;
  const totalCount = project.subTasks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = percent === 100;

  const chartData = [
    { name: 'Completed', value: completedCount, color: isComplete ? '#22c55e' : '#4f46e5' }, // Green if done, Indigo if active
    { name: 'Remaining', value: totalCount - completedCount, color: '#f1f5f9' }
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
      {/* Decorative Department Header */}
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <Building2 size={16} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Department Project
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="z-10">
          <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{project.title}</h3>
          <p className="text-sm text-slate-500 mb-4">
             {completedCount} / {totalCount} Tasks Verified
          </p>
          
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            isComplete ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-700'
          }`}>
             {isComplete ? <CheckCircle2 size={12} /> : <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />}
             {isComplete ? 'Certified Complete' : 'In Progress'}
          </div>
        </div>

        {/* The "Certificate" Chart */}
        <div className="relative w-24 h-24 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        innerRadius={28}
                        outerRadius={40}
                        dataKey="value"
                        stroke="none"
                        startAngle={90}
                        endAngle={-270}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${isComplete ? 'text-green-600' : 'text-indigo-600'}`}>
                    {percent}%
                </span>
            </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-slate-50 rounded-full z-0 group-hover:bg-indigo-50/50 transition-colors" />
    </div>
  );
};