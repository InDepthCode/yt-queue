import React from 'react';
import { Button } from './ui/button';
import { Sun, Moon } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  totalVideos: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onThemeToggle,
  totalVideos
}) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-lg font-medium text-foreground">Queue</h1>
        {totalVideos > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">{totalVideos} videos</p>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onThemeToggle}
        className="h-7 w-7 p-0 hover:bg-muted/50"
      >
        {theme === 'light' ? (
          <Moon className="h-3.5 w-3.5" />
        ) : (
          <Sun className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
};
