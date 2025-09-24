/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ErrorBoundary from './components/ErrorBoundary';
import ModernNotification from './components/ModernNotification';
import { useErrorHandler } from './hooks/useErrorHandler';
import { apiService } from './services/apiService';
import { VideoCard } from './components/VideoCard';
import { SearchAndFilter } from './components/SearchAndFilter';
import { TagNavigation } from './components/TagNavigation';
import { AddVideoForm } from './components/AddVideoForm';
import { EmptyState } from './components/EmptyState';
import { Header } from './components/Header';
import { DateGroup } from './components/DateGroup';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';

// Declare chrome globally for extension environment
declare var chrome: any;

// Helper to extract YouTube video ID from various URL formats
const getYouTubeID = (url: string): string | null => {
  // Handle youtu.be URLs
  const youtuBeMatch = url.match(/(?:youtu\.be\/)([^#&?]+)/);
  if (youtuBeMatch && youtuBeMatch[1].length === 11) {
    return youtuBeMatch[1];
  }
  
  // Handle youtube.com URLs
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/)([^#&?]+)/);
  if (youtubeMatch && youtubeMatch[1].length === 11) {
    return youtubeMatch[1];
  }
  
  // Handle other formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
};

// Helper to extract YouTube playlist ID
const getYouTubePlaylistID = (url: string): string | null => {
    const regExp = /[?&]list=([^#&?]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
};

// Define the structure of a saved item (video or playlist)
interface SavedItem {
  id: number;
  url: string;
  title: string;
  thumbnail: string;
  dateAdded: number;
  watched: boolean;
  type: 'video' | 'playlist';
  order: number; // For drag-and-drop reordering
  tags: string[]; // Array of tag strings
}

type Theme = 'light' | 'dark';
type SaveState = 'idle' | 'loading' | 'success';
type SortBy = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';
type ExportFormat = 'text' | 'json';


// Formats a timestamp into a relative date string
const formatDateGroup = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Function to download a file from blob URL
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export selected videos to text format
const exportToText = (items: SavedItem[]) => {
  const textLines = items.map(item =>
    `- [${item.watched ? 'x' : ' '}] ${item.title}\n  URL: ${item.url}\n  Tags: ${item.tags.join(', ') || 'none'}\n  Type: ${item.type}\n  Added: ${new Date(item.dateAdded).toLocaleDateString()}\n`);
  const content = textLines.join('\n');
  downloadFile(content, 'yt-queue-export.txt', 'text/plain');
};

// Export selected videos to JSON format
const exportToJSON = (items: SavedItem[]) => {
  const content = JSON.stringify(items, null, 2);
  downloadFile(content, 'yt-queue-export.json', 'application/json');
};

// Sortable Video Item Component
interface SortableVideoItemProps {
  item: SavedItem;
  onToggleWatched: (id: number) => void;
  onDelete: (id: number) => void;
  isSelected: boolean;
  onSelectionChange: (id: number, selected: boolean) => void;
}

const SortableVideoItem = ({ item, onToggleWatched, onDelete, isSelected, onSelectionChange }: SortableVideoItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <VideoCard
        item={item}
        onToggleWatched={onToggleWatched}
        onDelete={onDelete}
        isSelected={isSelected}
        onSelectionChange={onSelectionChange}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
};

function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({ show: false, type: 'info', message: '' });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const { error, setError, clearError, handleAsyncError } = useErrorHandler();

  // Selection handling functions
  const handleSelectionChange = (id: number, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleSelectAll = () => {
    const filteredItems = selectedTag === 'all' ? items : items.filter(item => item.tags.includes(selectedTag));
    if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ show: true, type, message });
  };

  // Export functionality
  const handleExportText = () => {
    if (selectedItems.length === 0) {
      showNotification('warning', 'Please select videos to export');
      return;
    }
    const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
    exportToText(selectedItemsData);
    showNotification('success', `Exported ${selectedItems.length} videos to text file`);
  };

  const handleExportJSON = () => {
    if (selectedItems.length === 0) {
      showNotification('warning', 'Please select videos to export');
      return;
    }
    const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
    exportToJSON(selectedItemsData);
    showNotification('success', `Exported ${selectedItems.length} videos to JSON file`);
  };

  // Migration function to add order and tags properties to existing items
  const migrateItems = (items: SavedItem[]): SavedItem[] => {
    return items.map((item, index) => ({
      ...item,
      order: item.order !== undefined ? item.order : index,
      tags: item.tags || [], // Default to empty tags array
    }));
  };

  // Load data from chrome.storage.local on component mount
  useEffect(() => {
    const loadData = async () => {
      if (chrome && chrome.storage && chrome.storage.local) {
        try {
          const result = await chrome.storage.local.get(['youtubeLinks', 'theme', 'sortBy']);
          if (result.youtubeLinks) {
            const migratedItems = migrateItems(result.youtubeLinks);
            setItems(migratedItems);
            console.log('Loaded videos from storage:', migratedItems.length);
          }

          const savedTheme = result.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          setTheme(savedTheme);
          if(result.sortBy) setSortBy(result.sortBy);
          setIsLoaded(true);
        } catch (error) {
          console.error('Error loading data from storage:', error);
          const savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          setTheme(savedTheme);
          setIsLoaded(true);
        }
      } else {
        const savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(savedTheme);
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Save theme, items, and sort preference to storage when they change
  useEffect(() => {
    document.body.className = theme;
    if (isLoaded && chrome && chrome.storage && chrome.storage.local) {
      const saveData = async () => {
        try {
          await chrome.storage.local.set({
            theme,
            youtubeLinks: items,
            sortBy
          });
          console.log('Saved videos to storage:', items.length);
        } catch (error) {
          console.error('Error saving data to storage:', error);
        }
      };
      saveData();
    }
  }, [theme, items, sortBy, isLoaded]);

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  const handleSaveItem = async (url?: string, tag?: string) => {
    clearError();
    const videoUrl = url || newUrl;
    const videoTag = tag || newTag;
    
    if (!videoUrl) {
      setError('Please enter a YouTube URL.', 'validation');
      return;
    }

    const playlistId = getYouTubePlaylistID(videoUrl);
    const videoId = getYouTubeID(videoUrl);

    if (!videoId && !playlistId) {
        setError('Invalid URL. Please enter a valid YouTube video or playlist URL.', 'validation');
        return;
    }

    setSaveState('loading');

    const result = await handleAsyncError(async () => {
      const response = await apiService.fetchVideoData(videoUrl);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch video data');
      }
      return response.data;
    }, 'Failed to fetch video information. Please try again.');

    if (result) {
      const newItem: SavedItem = {
        id: Date.now(),
        url: videoUrl,
        title: result.title,
        thumbnail: result.thumbnailUrl,
        dateAdded: Date.now(),
        watched: false,
        type: playlistId ? 'playlist' : 'video',
        order: items.filter(item => item.tags.includes(videoTag)).length, // Order within the tag
        tags: videoTag ? [videoTag] : [], // Single tag
      };

      console.log('Adding new video item:', newItem);
      setItems(prevItems => {
        const updatedItems = [newItem, ...prevItems];
        console.log('Updated items array:', updatedItems.length, 'items');
        return updatedItems;
      });
      setNewUrl('');
      setNewTag(''); // Clear tag after saving
      setSaveState('success');
      showNotification('success', `Video saved to "${videoTag}" tag!`);

      setTimeout(() => {
          setSaveState('idle');
      }, 2000);
    } else {
      setSaveState('idle');
    }
  };

  const handleDeleteItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    showNotification('info', 'Video removed from queue');
  };

  const handleToggleWatched = (id: number) => {
    setItems(items.map(item => item.id === id ? { ...item, watched: !item.watched } : item));
    const item = items.find(item => item.id === id);
    if (item) {
      showNotification('info', item.watched ? 'Marked as unwatched' : 'Marked as watched');
    }
  };

  const toggleTheme = () => {
      setTheme(theme === 'light' ? 'dark' : 'light');
  }

  // Get all unique tags from items
  const getAllTags = (): string[] => {
    const allTags = items.flatMap(item => item.tags);
    return Array.from(new Set(allTags)).sort();
  };

  // Tag management functions
  const addTag = (tag: string) => {
    if (tag.trim()) {
      setNewTag(tag.trim());
    }
  };

  const switchToTag = (tag: string) => {
    console.log('switchToTag called with:', tag);
    setSelectedTag(tag);
    setSearchQuery(''); // Clear search when switching tags
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setItems((items) => {
        const draggedItem = items.find(item => item.id === active.id);
        const targetItem = items.find(item => item.id === over.id);

        if (!draggedItem || !targetItem) return items;

        // Only allow reordering within the same tag
        if (selectedTag !== 'all' && draggedItem.tags[0] !== targetItem.tags[0]) {
          return items; // Don't allow cross-tag reordering
        }

        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update order property for items in the same tag
        const tagToUpdate = selectedTag === 'all' ? draggedItem.tags[0] : selectedTag;
        return newItems.map((item, index) => {
          if (item.tags.includes(tagToUpdate)) {
            const tagItems = newItems.filter(i => i.tags.includes(tagToUpdate));
            const tagOrder = tagItems.findIndex(tagItem => tagItem.id === item.id);
            return { ...item, order: tagOrder };
          }
          return item;
        });
      });
    }
  };

  const getButtonContent = () => {
      switch (saveState) {
          case 'loading': return 'Saving...';
          case 'success': return 'Saved!';
          default: return 'Save';
      }
  };

  const processedItems = useMemo(() => {
    // First filter by selected tag
    const tagFiltered = selectedTag === 'all'
      ? items
      : items.filter(item => item.tags.includes(selectedTag));

    // Then filter by search query
    const filtered = tagFiltered.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = searchQuery === '' || item.tags.some(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchesSearch || matchesTags;
    });

    const sorted = [...filtered].sort((a, b) => {
        switch (sortBy) {
            case 'date-asc': return a.dateAdded - b.dateAdded;
            case 'title-asc': return a.title.localeCompare(b.title);
            case 'title-desc': return b.title.localeCompare(a.title);
            case 'date-desc':
            default: return b.dateAdded - a.dateAdded; // Sort by date descending (newest first)
        }
    });

    const result = sorted.reduce((acc, item) => {
        const dateGroup = formatDateGroup(item.dateAdded);
        if (!acc[dateGroup]) acc[dateGroup] = [];
        acc[dateGroup].push(item);
        return acc;
    }, {} as Record<string, SavedItem[]>);

    // Debug logging
    console.log('Debug - processedItems:', {
      items: items.length,
      tagFiltered: tagFiltered.length,
      filtered: filtered.length,
      sorted: sorted.length,
      result: Object.keys(result).map(key => ({ date: key, count: result[key].length }))
    });

    return result;

  }, [items, searchQuery, sortBy, selectedTag]);

  const dateGroups = Object.keys(processedItems);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate totals for export controls
  const totalItems = dateGroups.length > 0 ? Object.values(processedItems).flat().length : 0;
  const hasSelection = selectedItems.length > 0;
  const allSelected = totalItems > 0 && selectedItems.length === totalItems;

  return (
    <ErrorBoundary>
      <div className="w-[420px] h-[600px] bg-background overflow-hidden">
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <Header
            theme={theme}
            onThemeToggle={toggleTheme}
            totalVideos={items.length}
          />

          <div className="flex-1 flex flex-col">
            {/* Add Video Form */}
            <AddVideoForm
              onSave={(url, tag) => {
                handleSaveItem(url, tag);
              }}
              isLoading={saveState === 'loading'}
              isSuccess={saveState === 'success'}
            />

            {/* Error Message */}
            {error.hasError && (
              <div className="p-3 border border-destructive/50 bg-destructive/10 rounded text-destructive text-xs mb-4">
                {error.message}
              </div>
            )}

            {/* Tag Navigation */}
            {items.length > 0 && (
              <>
                <TagNavigation
                  selectedTag={selectedTag}
                  onTagChange={switchToTag}
                  allTags={getAllTags()}
                  items={items}
                />

                {/* Search and Filter */}
                <SearchAndFilter
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sortBy={sortBy}
                  onSortChange={(sort) => setSortBy(sort as SortBy)}
                  selectedItems={selectedItems}
                  totalItems={totalItems}
                  onSelectAll={handleSelectAll}
                  onExportText={handleExportText}
                  onExportJSON={handleExportJSON}
                  onDeselectAll={handleDeselectAll}
                />
              </>
            )}

            {/* Video List */}
            <div className="flex-1 min-h-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <ScrollArea className="h-full">
                <div className="space-y-4">
                  {dateGroups.length > 0 ? (
                    dateGroups.map(date => (
                      <DateGroup
                        key={date}
                        date={date}
                        count={processedItems[date].length}
                      >
                        <SortableContext
                          items={processedItems[date].map(item => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-0">
                            {processedItems[date].map(item => (
                              <SortableVideoItem
                                key={item.id}
                                item={item}
                                onToggleWatched={handleToggleWatched}
                                onDelete={handleDeleteItem}
                                isSelected={selectedItems.includes(item.id)}
                                onSelectionChange={handleSelectionChange}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DateGroup>
                    ))
                  ) : items.length > 0 && searchQuery ? (
                    <EmptyState type="no-search-results" searchQuery={searchQuery} />
                  ) : (
                    <EmptyState type="no-videos" />
                  )}
                </div>
                </ScrollArea>

                <DragOverlay>
                {activeId ? (
                  <VideoCard
                    item={items.find(item => item.id === activeId)!}
                    onToggleWatched={() => {}}
                    onDelete={() => {}}
                    isSelected={false}
                    onSelectionChange={() => {}}
                    isDragging={true}
                  />
                ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>

        <ModernNotification
          show={notification.show}
          type={notification.type}
          message={notification.message}
          onClose={hideNotification}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
