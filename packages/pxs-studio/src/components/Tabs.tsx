'use client';

import { ReactNode } from 'react';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

interface TabsListProps {
  children: ReactNode;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
}

export function Tabs({ value, onValueChange, children }: TabsProps) {
  return (
    <div className="pxs-tabs" data-value={value}>
      {children}
    </div>
  );
}

export function TabsList({ children }: TabsListProps) {
  return (
    <div className="flex border-b border-border bg-background-elevated">
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  return (
    <button
      data-value={value}
      className="pxs-tab-trigger flex-1 px-4 py-3 text-sm font-medium transition-colors hover:bg-background-overlay data-[active=true]:border-b-2 data-[active=true]:border-primary data-[active=true]:text-primary text-text-secondary"
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: TabsContentProps) {
  return (
    <div data-value={value} className="pxs-tab-content">
      {children}
    </div>
  );
}
