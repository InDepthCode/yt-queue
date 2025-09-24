import React from 'react';

interface DateGroupProps {
  date: string;
  children: React.ReactNode;
  count: number;
}

export const DateGroup: React.FC<DateGroupProps> = ({ date, children, count }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {date}
        </h2>
        <span className="text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="space-y-0">
        {children}
      </div>
    </div>
  );
};