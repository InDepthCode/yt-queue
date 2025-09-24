import React from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Download } from 'lucide-react';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectedItems: number[];
  totalItems: number;
  onSelectAll: () => void;
  onExportText: () => void;
  onExportJSON: () => void;
  onDeselectAll: () => void;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedItems,
  totalItems,
  onSelectAll,
  onExportText,
  onExportJSON,
  onDeselectAll
}) => {
  const hasSelection = selectedItems.length > 0;
  const allSelected = totalItems > 0 && selectedItems.length === totalItems;

  return (
    <div className="space-y-2 mb-3">
      {/* Search and Sort Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 text-sm h-8"
          />
        </div>
        
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest</SelectItem>
            <SelectItem value="date-asc">Oldest</SelectItem>
          
          </SelectContent>
        </Select>
      </div>

      {/* Selection Controls */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="h-6 px-2 text-xs"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
          
          {hasSelection && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">{selectedItems.length} selected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExportText}
                className="h-6 px-2 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Text
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExportJSON}
                className="h-6 px-2 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                JSON
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};