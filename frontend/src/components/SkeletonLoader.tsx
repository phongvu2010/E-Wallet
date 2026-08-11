import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
      <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
    </div>
    <div className="h-7 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-4 min-h-[300px] flex flex-col justify-between">
    <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
    <div className="h-48 w-full bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <tr className="border-b border-slate-100 dark:border-slate-800/60 animate-pulse">
    <td className="p-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" /></td>
    <td className="p-4"><div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" /></td>
    <td className="p-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" /></td>
    <td className="p-4"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" /></td>
    <td className="p-4 text-right"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
  </tr>
);
