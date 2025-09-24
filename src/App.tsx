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
import Notification from './components/Notification';
import { useErrorHandler } from './hooks/useErrorHandler';
import { apiService } from './services/apiService';

// Declare chrome globally for extension environment
declare var chrome: any;

// Helper to extract YouTube video ID from various URL formats
const getYouTubeID = (url: string): string | null => {
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

// SVG Icons for UI Actions
const DeleteIcon = () => (
  <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
);
const SunIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.02 12.02c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zM20 6.01c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39.39-1.03.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"></path></svg>
);
const MoonIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M9.37 5.51c-.18.64.27 1.21.91 1.39.64.18 1.21-.27 1.39-.91s-.27-1.21-.91-1.39c-.64-.18-1.21.27-1.39.91zM10 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm7.13 10.13c-1.16-1.16-2.5-1.92-3.9-2.35.48-1.24.2-2.73-.85-3.78-1.4-1.4-3.6-1.63-5.26-.59-1.05.65-1.74 1.86-1.9 3.2C2.73 12.56 2 14.65 2 17c0 3.31 2.69 6 6 6 2.2 0 4.15-1.21 5.18-3.04.49.12 1 .18 1.52.18 2.76 0 5-2.24 5-5 .01-2.02-1.22-3.75-2.99-4.51z"></path></svg>
);
const EmptyIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M21.99 8c0-.72-.37-1.35-.94-1.7L12 1 2.95 6.3C2.38 6.65 2 7.28 2 8v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2l-.01-10zM12 13L3.74 7.84 12 3l8.26 4.84L12 13z"></path></svg>
);
const YouTubeIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23-1.54.91-1.77 1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM9.5 15.5V8.5l6 3.5-6 3.5z"></path></svg>
);
const PlaylistIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M3 10h11v2H3v-2zm0-4h11v2H3V6zm0 8h7v2H3v-2zm13-1v8l6-4-6-4z"></path></svg>
);
const SpinnerIcon = () => (
    <svg className="spinner" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
);
const CheckIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path></svg>
);
const OpenNewTabIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"></path></svg>
);
const DragHandleIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
);
const AddIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
);
const MoreIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
);
const DownloadIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7z"></path></svg>
);

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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`video-item-wrapper ${item.watched ? 'watched' : ''} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelectionChange(item.id, e.target.checked)}
        className="video-checkbox"
        onClick={(e) => e.stopPropagation()}
      />
      <button className="watched-toggle" onClick={() => onToggleWatched(item.id)} aria-label={item.watched ? 'Mark as unwatched' : 'Mark as watched'}>
        <CheckIcon />
      </button>

      <div className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        <DragHandleIcon />
      </div>

      <a href={item.url} target="_blank" rel="noopener noreferrer" className="video-item-link">
        <div className="video-item">
          {item.thumbnail && item.thumbnail !== 'placeholder' ? (
            <img src={item.thumbnail} alt={`Thumbnail for ${item.title}`} className="thumbnail" />
          ) : (
            <div className="playlist-placeholder">
              <PlaylistIcon />
            </div>
          )}
          <div className="video-info">
            <h3 className="video-title" title={item.title}>{item.title}</h3>
            <div className="video-meta">
              <div className="video-source">
                {item.type === 'playlist' ? <PlaylistIcon /> : <YouTubeIcon />}
                <span>YouTube {item.type}</span>
              </div>
              {item.tags.length > 0 && (
                <div className="video-tag">
                  {item.tags[0]}
                </div>
              )}
            </div>
          </div>
          <div className="video-actions">
            <span className="action-icon" title="Open in new tab"><OpenNewTabIcon /></span>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }} className="action-icon delete-btn" aria-label="Delete item" title="Delete"><DeleteIcon /></button>
          </div>
        </div>
      </a>
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
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['youtubeLinks', 'theme', 'sortBy'], (result) => {
        if (result.youtubeLinks) {
          const migratedItems = migrateItems(result.youtubeLinks);
          setItems(migratedItems);
        }

        const savedTheme = result.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(savedTheme);
        if(result.sortBy) setSortBy(result.sortBy);
        setIsLoaded(true);
      });
    } else {
        const savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(savedTheme);
        setIsLoaded(true);
    }
  }, []);

  // Save theme, items, and sort preference to storage when they change
  useEffect(() => {
    document.body.className = theme;
    if (isLoaded && chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          theme,
          youtubeLinks: items,
          sortBy
        });
    }
  }, [theme, items, sortBy, isLoaded]);

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  const handleSaveItem = async () => {
    clearError();
    if (!newUrl) {
      setError('Please enter a YouTube URL.', 'validation');
      return;
    }

    const playlistId = getYouTubePlaylistID(newUrl);
    const videoId = getYouTubeID(newUrl);

    if (!videoId && !playlistId) {
        setError('Invalid URL. Please enter a valid YouTube video or playlist URL.', 'validation');
        return;
    }

    setSaveState('loading');

    const result = await handleAsyncError(async () => {
      const response = await apiService.fetchVideoData(newUrl);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch video data');
      }
      return response.data;
    }, 'Failed to fetch video information. Please try again.');

    if (result) {
      const newItem: SavedItem = {
        id: Date.now(),
        url: newUrl,
        title: result.title,
        thumbnail: result.thumbnailUrl,
        dateAdded: Date.now(),
        watched: false,
        type: playlistId ? 'playlist' : 'video',
        order: items.filter(item => item.tags.includes(newTag)).length, // Order within the tag
        tags: newTag ? [newTag] : [], // Single tag
      };

      setItems([newItem, ...items]);
      setNewUrl('');
      setNewTag(''); // Clear tag after saving
      setSaveState('success');
      showNotification('success', `Video saved to "${newTag}" tag!`);

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
          case 'loading': return <SpinnerIcon />;
          case 'success': return <><CheckIcon /> Saved!</>;
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
            default: return a.order - b.order; // Use order for custom arrangement
        }
    });

    return sorted.reduce((acc, item) => {
        const dateGroup = formatDateGroup(item.dateAdded);
        if (!acc[dateGroup]) acc[dateGroup] = [];
        acc[dateGroup].push(item);
        return acc;
    }, {} as Record<string, SavedItem[]>);

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
      <div className="container">
        <header>
          <h1>YT Queue</h1>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </header>
        <main>
          {/* Tag Navigation */}
          <div className="tag-navigation">
            <button
              className={`tag-nav-item ${selectedTag === 'all' ? 'active' : ''}`}
              onClick={() => switchToTag('all')}
            >
              All Videos ({items.length})
            </button>
            {getAllTags().map(tag => (
              <button
                key={tag}
                className={`tag-nav-item ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => {
                  console.log('Clicked tag button:', tag);
                  switchToTag(tag);
                }}
              >
                {tag} ({items.filter(item => item.tags.includes(tag)).length})
              </button>
            ))}
          </div>

          {/* Add Video Form */}
          <form className="input-form" onSubmit={(e) => { e.preventDefault(); handleSaveItem(); }}>
            <div className="form-row">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Paste YouTube URL here"
                aria-label="YouTube URL Input"
                disabled={saveState !== 'idle'}
                className="url-input"
              />
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Tag name"
                aria-label="Tag Input"
                disabled={saveState !== 'idle'}
                className="tag-input"
              />
              <button type="submit" disabled={saveState !== 'idle'} className={`save-btn ${saveState}`}>
                {getButtonContent()}
              </button>
            </div>
          </form>

          {error.hasError && (
            <div className="error-message">
              {error.message}
            </div>
          )}

          {items.length > 0 && (
              <div className="controls-container">
                  <div className="selection-controls">
                      <button onClick={handleSelectAll} className="control-btn">
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                      {hasSelection && (
                        <>
                          <span className="selection-count">{selectedItems.length} selected</span>
                          <button onClick={handleExportText} className="control-btn export-btn" title="Export as text file">
                            <DownloadIcon /> Text
                          </button>
                          <button onClick={handleExportJSON} className="control-btn export-btn" title="Export as JSON file">
                            <DownloadIcon /> JSON
                          </button>
                        </>
                      )}
                  </div>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by title..." className="search-input" aria-label="Search saved videos"/>
                   <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} aria-label="Sort videos by">
                      <option value="date-desc">Newest First</option>
                      <option value="date-asc">Oldest First</option>
                      <option value="title-asc">Title (A-Z)</option>
                      <option value="title-desc">Title (Z-A)</option>
                  </select>
              </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="video-list" aria-live="polite">
                {dateGroups.length > 0 ? (
                    dateGroups.map(date => (
                        <section key={date} className="date-group">
                            <h2 className="date-group-header">{date}</h2>
                            <SortableContext items={processedItems[date].map(item => item.id)} strategy={verticalListSortingStrategy}>
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
                            </SortableContext>
                        </section>
                    ))
                ) : items.length > 0 && searchQuery ? (
                    <div className="empty-state"><EmptyIcon /><p>No videos match your search.</p></div>
                ) : (
                    <div className="empty-state"><EmptyIcon /><p>No videos saved yet.</p><p>Paste a link above to get started!</p></div>
                )}
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="video-item-wrapper dragging-overlay">
                  <button className="watched-toggle" aria-label="Mark as watched">
                    <CheckIcon />
                  </button>
                  <div className="drag-handle">
                    <DragHandleIcon />
                  </div>
                  <div className="video-item">
                    <div className="playlist-placeholder">
                      <PlaylistIcon />
                    </div>
                    <div className="video-info">
                      <h3 className="video-title">Dragging...</h3>
                      <div className="video-source">
                        <YouTubeIcon />
                        <span>YouTube video</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </main>

        <Notification
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
