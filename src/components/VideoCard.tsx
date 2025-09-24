import React from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { 
  ExternalLink, 
  Trash2, 
  GripVertical,
  Check
} from 'lucide-react';

interface SavedItem {
  id: number;
  url: string;
  title: string;
  thumbnail: string;
  dateAdded: number;
  watched: boolean;
  type: 'video' | 'playlist';
  order: number;
  tags: string[];
}

interface VideoCardProps {
  item: SavedItem;
  onToggleWatched: (id: number) => void;
  onDelete: (id: number) => void;
  isSelected: boolean;
  onSelectionChange: (id: number, selected: boolean) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}

const formatDate = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString();
};

export const VideoCard: React.FC<VideoCardProps> = ({
  item,
  onToggleWatched,
  onDelete,
  isSelected,
  onSelectionChange,
  dragHandleProps,
  isDragging = false
}) => {
  return (
    <div 
      className={`group relative transition-all duration-150 hover:bg-muted/30 ${
        isDragging ? 'opacity-50' : ''
      } ${isSelected ? 'bg-muted/50' : ''} ${
        item.watched ? 'opacity-50' : ''
      } border-b border-border/30 py-3`}
    >
      <div className="flex items-start space-x-3">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-12 h-9 object-cover rounded"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCA0OCAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjM2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xOCAxMkwxOCAyNEwxOCAxMloiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMzAgMTJMMzAgMjRMMzAgMTJaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==';
            }}
          />
          {item.watched && (
            <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className={`text-sm font-normal text-foreground line-clamp-2 leading-tight ${
              item.watched ? 'line-through' : ''
            }`}>
              {item.title}
            </h3>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(item.id, checked as boolean)}
              className="h-4 w-4 ml-2"
            />
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{formatDate(item.dateAdded)}</span>
              {item.tags.length > 0 && (
                <>
                  <span>•</span>
                  <span>{item.tags[0]}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(item.url, '_blank')}
                className="h-6 px-2 text-xs hover:bg-muted"
              >
                Watch
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleWatched(item.id)}
                className="h-6 px-2 text-xs hover:bg-muted"
              >
                {item.watched ? 'Undo' : 'Done'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Drag Handle */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};