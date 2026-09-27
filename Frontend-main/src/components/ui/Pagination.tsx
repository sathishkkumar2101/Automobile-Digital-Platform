import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalElements?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalElements, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i;
    if (page < 4) return i;
    if (page > totalPages - 4) return totalPages - 7 + i;
    return page - 3 + i;
  });

  const start = totalElements !== undefined && pageSize !== undefined
    ? page * pageSize + 1
    : null;
  const end = totalElements !== undefined && pageSize !== undefined
    ? Math.min((page + 1) * pageSize, totalElements)
    : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
      {totalElements !== undefined ? (
        <p className="text-xs text-zinc-600 font-mono">
          {start}–{end} of {totalElements}
        </p>
      ) : (
        <p className="text-xs text-zinc-600 font-mono">Page {page + 1} of {totalPages}</p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
        >
          ‹
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={[
              'w-7 h-7 flex items-center justify-center rounded text-xs font-mono transition-colors',
              p === page
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800',
            ].join(' ')}
          >
            {p + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
        >
          ›
        </button>
      </div>
    </div>
  );
}
