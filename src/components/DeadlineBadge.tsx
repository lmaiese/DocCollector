import React from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface DeadlineBadgeProps {
  deadline?: string | null;
  status: 'pending' | 'uploaded';
}

export default function DeadlineBadge({ deadline, status }: DeadlineBadgeProps) {
  if (status === 'uploaded') {
    return (
      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
        <CheckCircle className="w-3 h-3" /> Completato
      </span>
    );
  }

  if (!deadline) return <span className="text-gray-400 text-xs">—</span>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(parseISO(deadline), today);

  if (diff < 0) {
    return (
      <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Scaduta ({Math.abs(diff)}gg fa)
      </span>
    );
  }
  if (diff <= 3) {
    return (
      <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" />
        {diff === 0 ? 'Scade oggi!' : `${diff}gg`}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" />
      {diff}gg
    </span>
  );
}