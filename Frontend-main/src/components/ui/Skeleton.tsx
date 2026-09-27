import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-zinc-800 rounded animate-pulse ${i === lines - 1 ? 'w-3/4' : 'w-full'} ${className}`}
          />
        ))}
      </div>
    );
  }
  return <div className={`bg-zinc-800 rounded animate-pulse ${className}`} />;
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
      <div className="aspect-[16/10] bg-zinc-800 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-5 bg-zinc-800 animate-pulse rounded w-3/4" />
        <div className="h-4 bg-zinc-800 animate-pulse rounded w-1/2" />
        <div className="h-4 bg-zinc-800 animate-pulse rounded w-1/3 mt-3" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-zinc-800/50 px-4 py-3.5 flex gap-6">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-zinc-800 animate-pulse rounded"
              style={{ flex: j === 0 ? '2' : '1' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded p-5">
            <div className="h-3 bg-zinc-800 rounded w-2/3 mb-4 animate-pulse" />
            <div className="h-8 bg-zinc-800 rounded w-1/2 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded h-64 animate-pulse" />
    </div>
  );
}
