import React from 'react';
import { Play, Search } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-videos' | 'no-search-results';
  searchQuery?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, searchQuery }) => {
  if (type === 'no-search-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="h-8 w-8 text-muted-foreground mb-3" />
        <h3 className="text-sm font-medium mb-1">No results</h3>
        <p className="text-xs text-muted-foreground">
          No videos match "{searchQuery}"
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Play className="h-8 w-8 text-muted-foreground mb-3" />
      <h3 className="text-sm font-medium mb-1">No videos yet</h3>
      <p className="text-xs text-muted-foreground">
        Add your first video above
      </p>
    </div>
  );
};