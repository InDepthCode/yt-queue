import React from 'react';
import { Button } from './ui/button';

interface TagNavigationProps {
  selectedTag: string;
  onTagChange: (tag: string) => void;
  allTags: string[];
  items: any[];
}

export const TagNavigation: React.FC<TagNavigationProps> = ({
  selectedTag,
  onTagChange,
  allTags,
  items
}) => {
  const getTagCount = (tag: string) => {
    if (tag === 'all') return items.length;
    return items.filter(item => item.tags.includes(tag)).length;
  };

  return (
    <div className="flex gap-1 mb-3 overflow-x-auto pb-1 scrollbar-hide">
      <Button
        variant={selectedTag === 'all' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTagChange('all')}
        className="flex-shrink-0 text-xs h-7 px-2"
      >
        All ({getTagCount('all')})
      </Button>
      
      {allTags.map(tag => (
        <Button
          key={tag}
          variant={selectedTag === tag ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onTagChange(tag)}
          className="flex-shrink-0 text-xs h-7 px-2"
        >
          {tag} ({getTagCount(tag)})
        </Button>
      ))}
    </div>
  );
};