import React from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { 
  ExternalLink, 
  Trash2, 
  GripVertical,
  Check,
  Bookmark,
  Clock
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
  savedPosition?: number;
  videoDuration?: number;
  lastWatched?: number;
}

interface VideoCardProps {
  item: SavedItem;
  onToggleWatched: (id: number) => void;
  onDelete: (id: number) => void;
  isSelected: boolean;
  onSelectionChange: (id: number, selected: boolean) => void;
  onSavePosition?: (id: number) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}

const formatDate = (timestamp: number) => {
  // Validate timestamp
  if (!timestamp || isNaN(timestamp) || !isFinite(timestamp)) {
    return 'Unknown';
  }
  
  const date = new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Unknown';
  }
  
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Don't show "Today" - just return empty string for today's videos
  if (days === 0) return '';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
};

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const getProgressPercentage = (position: number, duration: number) => {
  if (!duration || duration === 0) return 0;
  return Math.min((position / duration) * 100, 100);
};

export const VideoCard: React.FC<VideoCardProps> = ({
  item,
  onToggleWatched,
  onDelete,
  isSelected,
  onSelectionChange,
  onSavePosition,
  dragHandleProps,
  isDragging = false
}) => {
  const hasSavedPosition = item.savedPosition && item.savedPosition > 0;
  const progressPercentage = hasSavedPosition && item.videoDuration 
    ? getProgressPercentage(item.savedPosition, item.videoDuration)
    : 0;
  return (
    <div 
      className={`group relative transition-colors duration-200 hover:bg-muted/30 ${
        isDragging ? 'opacity-50' : ''
      } ${isSelected ? 'bg-primary/5' : ''} ${
        item.watched ? 'opacity-60' : ''
      } border-b border-border/30 py-2 px-2 video-card-divider`}
    >
      <div className="flex items-start space-x-2">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 mt-0.5">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-10 h-7 object-cover rounded"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCA0OCAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjM2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xOCAxMkwxOCAyNEwxOCAxMloiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMzAgMTJMMzAgMjRMMzAgMTJaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==';
            }}
          />
          
          {/* Simple Progress Bar */}
          {hasSavedPosition && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
              <div 
                className="h-full bg-primary"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
          
          {item.watched && (
            <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between mb-1">
            <h3 className={`text-xs text-foreground line-clamp-2 leading-tight flex-1 mr-2 ${
              item.watched ? 'line-through opacity-60' : ''
            }`}>
              {item.title}
            </h3>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(item.id, checked as boolean)}
              className="h-3 w-3 flex-shrink-0"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-0.5">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                {formatDate(item.dateAdded) && (
                  <>
                    <span>{formatDate(item.dateAdded)}</span>
                    {item.tags.length > 0 && <span>•</span>}
                  </>
                )}
                
              </div>
              {hasSavedPosition && item.videoDuration && (
                <div className="flex items-center space-x-1 text-xs">
                  <Clock className="h-3 w-3 text-primary" />
                  <span className="text-primary font-medium">
                    {formatTime(item.savedPosition)} / {formatTime(item.videoDuration)}
                  </span>
                </div>
                
              )}
                


            </div>
            
            <div className="flex items-center space-x-1">

             
              {item.type === 'video' && onSavePosition && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSavePosition(item.id)}
                  className="h-6 px-1.5 text-xs flex-shrink-0"
                  title="Save current position"
                >
                  <Bookmark className="h-2.5 w-2.5" />
                </Button>
              )}
               
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasSavedPosition && item.savedPosition) {
                    // Add timestamp parameter to resume from saved position
                    const url = new URL(item.url);
                    url.searchParams.set('t', Math.floor(item.savedPosition).toString());
                    window.open(url.toString(), '_blank');
                  } else {
                    window.open(item.url, '_blank');
                  }
                }}
                className="h-6 px-2 text-xs flex-shrink-0"
              >
                {hasSavedPosition ? 'Resume' : 'Watch'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                className="h-6 px-1.5 text-xs hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};