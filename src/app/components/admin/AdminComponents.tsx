import React, { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, AlertCircle, SearchX, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Data State Wrapper
interface DataStateWrapperProps {
  status: 'loading' | 'error' | 'empty' | 'success';
  children: ReactNode;
  emptyMessage?: string;
  errorMessage?: string;
}

export function DataStateWrapper({
  status,
  children,
  emptyMessage = "No se encontraron datos.",
  errorMessage = "Ocurrió un error al cargar la información."
}: DataStateWrapperProps) {
  if (status === 'loading') {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm font-medium">Cargando datos...</p>
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-red-200 bg-red-50/50">
        <div className="flex flex-col items-center gap-2 text-red-500">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{errorMessage}</p>
          <button className="mt-2 text-xs font-semibold underline hover:text-red-600">Reintentar</button>
        </div>
      </div>
    );
  }
  if (status === 'empty') {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <SearchX className="h-8 w-8" />
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

// Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number; // percentage
  icon: ReactNode;
  subtitle?: string;
}

export function StatCard({ title, value, trend, icon, subtitle }: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;
  
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium tracking-tight text-neutral-500">{title}</h3>
        <div className="text-neutral-400">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : isNegative ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-500'}`}>
            {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : isNegative ? <TrendingDown className="mr-1 h-3 w-3" /> : <Minus className="mr-1 h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {subtitle && <p className="mt-2 text-xs text-neutral-500">{subtitle}</p>}
    </div>
  );
}

// UI Elements
export function Badge({ children, variant = 'default', className }: { children: ReactNode, variant?: string, className?: string }) {
  const variants: Record<string, string> = {
    default: 'bg-neutral-100 text-neutral-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'border border-neutral-200 text-neutral-800 bg-white'
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", variants[variant] || variants.default, className)}>
      {children}
    </span>
  );
}

export function Table({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className="relative w-full overflow-auto rounded-xl border border-neutral-200 bg-white">
      <table className={cn("w-full caption-bottom text-sm text-left", className)}>{children}</table>
    </div>
  );
}
export function TableHeader({ children }: { children: ReactNode }) { return <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500">{children}</thead>; }
export function TableBody({ children }: { children: ReactNode }) { return <tbody className="divide-y divide-neutral-100">{children}</tbody>; }
export function TableRow({ children, className }: { children: ReactNode, className?: string }) { return <tr className={cn("hover:bg-neutral-50/50 transition-colors", className)}>{children}</tr>; }
export function TableHead({ children, className }: { children: ReactNode, className?: string }) { return <th className={cn("h-12 px-6 align-middle font-medium", className)}>{children}</th>; }
export function TableCell({ children, className }: { children: ReactNode, className?: string }) { return <td className={cn("p-4 px-6 align-middle", className)}>{children}</td>; }

export function Card({ children, className }: { children: ReactNode, className?: string }) { return <div className={cn("rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden", className)}>{children}</div>; }
export function CardHeader({ children, className }: { children: ReactNode, className?: string }) { return <div className={cn("flex flex-col space-y-1.5 p-6 border-b border-neutral-100", className)}>{children}</div>; }
export function CardTitle({ children, className }: { children: ReactNode, className?: string }) { return <h3 className={cn("font-bold leading-none tracking-tight text-neutral-900 text-lg", className)}>{children}</h3>; }
export function CardDescription({ children, className }: { children: ReactNode, className?: string }) { return <p className={cn("text-sm text-neutral-500", className)}>{children}</p>; }
export function CardContent({ children, className }: { children: ReactNode, className?: string }) { return <div className={cn("p-6", className)}>{children}</div>; }
