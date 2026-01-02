import React, { useEffect, useState } from 'react';
import { ActivityLog } from '../types';
import { getActivities } from '../services/storage';
import { Clock, CheckCircle2, PlusCircle, RotateCcw, Edit, Trash2 } from 'lucide-react';

export const ActivityFeed: React.FC = () => {
    const [activities, setActivities] = useState<ActivityLog[]>([]);

    useEffect(() => {
        const fetchActivities = async () => {
             const data = await getActivities();
             setActivities(data);
        };
        fetchActivities();
    }, []); // In a real app, this would listen to updates or a prop trigger

    const getIcon = (action: ActivityLog['action']) => {
        switch (action) {
            case 'CREATED': return <PlusCircle size={14} className="text-blue-500" />;
            case 'COMPLETED': return <CheckCircle2 size={14} className="text-green-500" />;
            case 'UNDO': return <RotateCcw size={14} className="text-orange-500" />;
            case 'UPDATED': return <Edit size={14} className="text-indigo-500" />;
            case 'DELETED': return <Trash2 size={14} className="text-red-500" />;
            default: return <Clock size={14} className="text-slate-400" />;
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    const formatDate = (isoString: string) => {
         const date = new Date(isoString);
         const today = new Date();
         if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth()) {
             return 'Today';
         }
         return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <Clock className="text-indigo-600" size={18} />
                <h2 className="text-sm font-semibold text-slate-800">Activity Log</h2>
            </div>
            <div className="overflow-y-auto max-h-[300px] p-0">
                {activities.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                        No recent activity recorded.
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {activities.map((log) => (
                            <li key={log.id} className="p-3 hover:bg-slate-50 transition-colors flex gap-3 items-start">
                                <div className="mt-1 flex-shrink-0">
                                    {getIcon(log.action)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        <span className="font-semibold text-slate-900">{log.user}</span>
                                        <span className="text-slate-400 mx-1">•</span>
                                        {log.action.toLowerCase()}
                                        <span className="text-slate-400 mx-1">•</span>
                                        <span className="font-medium text-slate-800 truncate">{log.targetTitle}</span>
                                    </p>
                                    <div className="flex gap-2 mt-1">
                                         <span className="text-[10px] text-slate-400">{formatDate(log.timestamp)}</span>
                                         <span className="text-[10px] text-slate-400">{formatTime(log.timestamp)}</span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};