import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-zinc-900 border border-zinc-800 rounded',
        hover ? 'cursor-pointer transition-colors duration-150 hover:border-zinc-600 hover:bg-zinc-800/80' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function KpiCard({ label, value, change, icon, className = '' }: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0;
  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{label}</p>
        {icon && <div className="text-zinc-600">{icon}</div>}
      </div>
      <p className="font-display text-3xl font-semibold text-white mb-1">{value}</p>
      {change !== undefined && (
        <p className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(change)}% vs last month
        </p>
      )}
    </Card>
  );
}
