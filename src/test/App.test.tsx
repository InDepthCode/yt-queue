import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the API service
vi.mock('../services/apiService', () => ({
  apiService: {
    fetchVideoData: vi.fn(),
    checkApiHealth: vi.fn(),
  },
}));

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// @ts-ignore
global.chrome = mockChrome;

describe('App Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ youtubeLinks: [], theme: 'light', sortBy: 'date-desc' });
    });
  });

  it('renders the main interface', () => {
    render(<App />);
    
    expect(screen.getByText('YT Queue')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste YouTube URL here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('shows empty state when no videos are saved', () => {
    render(<App />);
    
    expect(screen.getByText('No videos saved yet.')).toBeInTheDocument();
    expect(screen.getByText('Paste a link above to get started!')).toBeInTheDocument();
  });

  it('toggles theme when theme button is clicked', async () => {
    render(<App />);
    
    const themeButton = screen.getByRole('button', { name: /switch to dark mode/i });
    await user.click(themeButton);
    
    expect(themeButton).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('validates URL input before saving', async () => {
    render(<App />);
    
    const input = screen.getByPlaceholderText('Paste YouTube URL here');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    // Try to save with empty input
    await user.click(saveButton);
    expect(screen.getByText('Please enter a YouTube URL.')).toBeInTheDocument();
    
    // Try to save with invalid URL
    await user.type(input, 'invalid-url');
    await user.click(saveButton);
    expect(screen.getByText('Invalid URL. Please enter a valid YouTube video or playlist URL.')).toBeInTheDocument();
  });

  it('saves a valid YouTube video URL', async () => {
    const { apiService } = await import('../services/apiService');
    
    // Mock successful API response
    vi.mocked(apiService.fetchVideoData).mockResolvedValue({
      data: {
        title: 'Test Video',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      },
      success: true,
      source: 'primary',
    });

    render(<App />);
    
    const input = screen.getByPlaceholderText('Paste YouTube URL here');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(saveButton);
    
    // Wait for the success state to complete and video to be added
    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles API errors gracefully', async () => {
    const { apiService } = await import('../services/apiService');
    
    // Mock API error
    vi.mocked(apiService.fetchVideoData).mockRejectedValue(new Error('API Error'));

    render(<App />);
    
    const input = screen.getByPlaceholderText('Paste YouTube URL here');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch video information. Please try again.')).toBeInTheDocument();
    });
  });

  it('searches videos by title', async () => {
    const { apiService } = await import('../services/apiService');
    
    // Mock API response
    vi.mocked(apiService.fetchVideoData).mockResolvedValue({
      data: {
        title: 'Test Video',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      },
      success: true,
      source: 'primary',
    });

    render(<App />);
    
    // Add a video
    const input = screen.getByPlaceholderText('Paste YouTube URL here');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument();
    });
    
    // Search for the video
    const searchInput = screen.getByPlaceholderText('Search by title...');
    await user.type(searchInput, 'Test');
    
    expect(screen.getByText('Test Video')).toBeInTheDocument();
    
    // Search for non-matching term
    await user.clear(searchInput);
    await user.type(searchInput, 'NonExistent');
    
    expect(screen.getByText('No videos match your search.')).toBeInTheDocument();
  });

  it('sorts videos correctly', async () => {
    const { apiService } = await import('../services/apiService');
    
    // Mock API responses for multiple videos
    vi.mocked(apiService.fetchVideoData)
      .mockResolvedValueOnce({
        data: { title: 'Video A', thumbnailUrl: 'thumb1.jpg' },
        success: true,
        source: 'primary',
      })
      .mockResolvedValueOnce({
        data: { title: 'Video B', thumbnailUrl: 'thumb2.jpg' },
        success: true,
        source: 'primary',
      });

    render(<App />);
    
    // Add first video
    const input = screen.getByPlaceholderText('Paste YouTube URL here');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Video A')).toBeInTheDocument();
    });
    
    // Add second video
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Video B')).toBeInTheDocument();
    });
    
    // Test sorting by title A-Z
    const sortSelect = screen.getByRole('combobox', { name: /sort videos by/i });
    await user.selectOptions(sortSelect, 'title-asc');
    
    const videoTitles = screen.getAllByText(/Video [AB]/);
    expect(videoTitles[0]).toHaveTextContent('Video A');
    expect(videoTitles[1]).toHaveTextContent('Video B');
  });

  it('toggles watched status', async () => {
    const { apiService } = await import('../services/apiService');
    
    vi.mocked(apiService.fetchVideoData).mockResolvedValue({
      data: {
        title: 'Test Video',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      },
      success: true,
      source: 'primary',
    });

    render(<App />);
    
    // Add a video
    const input = screen.getByPlaceholderText('Paste YouTube URL here');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Toggle watched status
    const watchedButton = screen.getByRole('button', { name: /mark as watched/i });
    await user.click(watchedButton);
    
    expect(screen.getByRole('button', { name: /mark as unwatched/i })).toBeInTheDocument();
  });

  it('deletes videos', async () => {
    const { apiService } = await import('../services/apiService');
    
    vi.mocked(apiService.fetchVideoData).mockResolvedValue({
      data: {
        title: 'Test Video',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      },
      success: true,
      source: 'primary',
    });

    render(<App />);
    
    // Add a video
    const input = screen.getByPlaceholderText('Paste YouTube URL here');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Delete the video
    const deleteButton = screen.getByRole('button', { name: /delete item/i });
    await user.click(deleteButton);
    
    expect(screen.queryByText('Test Video')).not.toBeInTheDocument();
    expect(screen.getByText('No videos saved yet.')).toBeInTheDocument();
  });

  describe('Tag Filtering Functionality', () => {
    beforeEach(() => {
      // Mock items with different tags
      const mockItems = [
        {
          id: 1,
          url: 'https://www.youtube.com/watch?v=1',
          title: 'Video 1',
          thumbnail: 'thumb1.jpg',
          dateAdded: Date.now(),
          watched: false,
          type: 'video' as const,
          order: 0,
          tags: ['music']
        },
        {
          id: 2,
          url: 'https://www.youtube.com/watch?v=2',
          title: 'Video 2',
          thumbnail: 'thumb2.jpg',
          dateAdded: Date.now(),
          watched: false,
          type: 'video' as const,
          order: 1,
          tags: ['tutorial']
        },
        {
          id: 3,
          url: 'https://www.youtube.com/watch?v=3',
          title: 'Video 3',
          thumbnail: 'thumb3.jpg',
          dateAdded: Date.now(),
          watched: false,
          type: 'video' as const,
          order: 2,
          tags: ['music']
        }
      ];

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          youtubeLinks: mockItems,
          theme: 'light',
          sortBy: 'date-desc'
        });
      });
    });

    it('should display all videos when "All Videos" is selected', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Video 1')).toBeInTheDocument();
        expect(screen.getByText('Video 2')).toBeInTheDocument();
        expect(screen.getByText('Video 3')).toBeInTheDocument();
      });

      // Check that "All Videos" tab is active
      const allVideosTab = screen.getByText('All Videos (3)');
      expect(allVideosTab).toHaveClass('active');
    });

    it('should filter videos by selected tag', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Video 1')).toBeInTheDocument();
      });

      // Click on music tag
      const musicTab = screen.getByText('music (2)');
      await user.click(musicTab);

      await waitFor(() => {
        expect(screen.getByText('Video 1')).toBeInTheDocument();
        expect(screen.getByText('Video 3')).toBeInTheDocument();
        expect(screen.queryByText('Video 2')).not.toBeInTheDocument();
      });

      // Check that music tab is active
      expect(musicTab).toHaveClass('active');
    });

    it('should filter videos by tutorial tag', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Video 2')).toBeInTheDocument();
      });

      // Click on tutorial tag
      const tutorialTab = screen.getByText('tutorial (1)');
      await user.click(tutorialTab);

      await waitFor(() => {
        expect(screen.getByText('Video 2')).toBeInTheDocument();
        expect(screen.queryByText('Video 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Video 3')).not.toBeInTheDocument();
      });

      // Check that tutorial tab is active
      expect(tutorialTab).toHaveClass('active');
    });

    it('should show correct video counts in tag tabs', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('All Videos (3)')).toBeInTheDocument();
        expect(screen.getByText('music (2)')).toBeInTheDocument();
        expect(screen.getByText('tutorial (1)')).toBeInTheDocument();
      });
    });

    it('should clear search when switching tags', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Video 1')).toBeInTheDocument();
      });

      // Search for a video
      const searchInput = screen.getByPlaceholderText('Search by title...');
      await user.type(searchInput, 'Video 1');

      await waitFor(() => {
        expect(screen.getByText('Video 1')).toBeInTheDocument();
        expect(screen.queryByText('Video 2')).not.toBeInTheDocument();
      });

      // Switch to music tag
      const musicTab = screen.getByText('music (2)');
      await user.click(musicTab);

      // Search should be cleared and all music videos should be visible
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(screen.getByText('Video 1')).toBeInTheDocument();
        expect(screen.getByText('Video 3')).toBeInTheDocument();
      });
    });
  });

  describe('Video Adding with Tags', () => {
    it('should add video with tag', async () => {
      const { apiService } = await import('../services/apiService');
      apiService.fetchVideoData.mockResolvedValue({
        success: true,
        data: { title: 'New Video', thumbnailUrl: 'thumb.jpg' },
        source: 'primary'
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('No videos saved yet.')).toBeInTheDocument();
      });

      // Add URL
      const urlInput = screen.getByPlaceholderText('Paste YouTube URL here');
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      // Add tag
      const tagInput = screen.getByPlaceholderText('Tag name');
      await user.type(tagInput, 'test-tag');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Video saved to "test-tag" tag!')).toBeInTheDocument();
        expect(screen.getByText('New Video')).toBeInTheDocument();
        expect(screen.getByText('test-tag')).toBeInTheDocument();
      });

      // Check that tag tab appears
      expect(screen.getByText('test-tag (1)')).toBeInTheDocument();
    });

    it('should add video without tag (empty tags array)', async () => {
      const { apiService } = await import('../services/apiService');
      apiService.fetchVideoData.mockResolvedValue({
        success: true,
        data: { title: 'Untagged Video', thumbnailUrl: 'thumb.jpg' },
        source: 'primary'
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('No videos saved yet.')).toBeInTheDocument();
      });

      // Add URL only (no tag)
      const urlInput = screen.getByPlaceholderText('Paste YouTube URL here');
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Video saved to "" tag!')).toBeInTheDocument();
        expect(screen.getByText('Untagged Video')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop Functionality', () => {
    beforeEach(() => {
      // Mock items for drag and drop testing
      const mockItems = [
        {
          id: 1,
          url: 'https://www.youtube.com/watch?v=1',
          title: 'First Video',
          thumbnail: 'thumb1.jpg',
          dateAdded: Date.now(),
          watched: false,
          type: 'video' as const,
          order: 0,
          tags: ['music']
        },
        {
          id: 2,
          url: 'https://www.youtube.com/watch?v=2',
          title: 'Second Video',
          thumbnail: 'thumb2.jpg',
          dateAdded: Date.now(),
          watched: false,
          type: 'video' as const,
          order: 1,
          tags: ['music']
        },
        {
          id: 3,
          url: 'https://www.youtube.com/watch?v=3',
          title: 'Third Video',
          thumbnail: 'thumb3.jpg',
          dateAdded: Date.now(),
          watched: false,
          type: 'video' as const,
          order: 2,
          tags: ['tutorial']
        }
      ];

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          youtubeLinks: mockItems,
          theme: 'light',
          sortBy: 'date-desc'
        });
      });
    });

    it('should render drag handles for videos', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('First Video')).toBeInTheDocument();
      });

      // Check that drag handles are present
      const dragHandles = screen.getAllByLabelText('Drag to reorder');
      expect(dragHandles).toHaveLength(3);
    });

    it('should allow reordering within the same tag', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('First Video')).toBeInTheDocument();
      });

      // Switch to music tag to test reordering within same tag
      const musicTab = screen.getByText('music (2)');
      await user.click(musicTab);

      await waitFor(() => {
        expect(screen.getByText('First Video')).toBeInTheDocument();
        expect(screen.getByText('Second Video')).toBeInTheDocument();
        expect(screen.queryByText('Third Video')).not.toBeInTheDocument();
      });

      // Get drag handles for music videos
      const dragHandles = screen.getAllByLabelText('Drag to reorder');
      expect(dragHandles).toHaveLength(2);
    });

    it('should not allow cross-tag reordering', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('First Video')).toBeInTheDocument();
      });

      // Switch to music tag
      const musicTab = screen.getByText('music (2)');
      await user.click(musicTab);

      await waitFor(() => {
        expect(screen.getByText('First Video')).toBeInTheDocument();
        expect(screen.getByText('Second Video')).toBeInTheDocument();
      });

      // Switch to tutorial tag
      const tutorialTab = screen.getByText('tutorial (1)');
      await user.click(tutorialTab);

      await waitFor(() => {
        expect(screen.getByText('Third Video')).toBeInTheDocument();
        expect(screen.queryByText('First Video')).not.toBeInTheDocument();
        expect(screen.queryByText('Second Video')).not.toBeInTheDocument();
      });

      // Only one drag handle should be present for tutorial tag
      const dragHandles = screen.getAllByLabelText('Drag to reorder');
      expect(dragHandles).toHaveLength(1);
    });
  });

  describe('Search Functionality with Tags', () => {
    beforeEach(() => {
      const mockItems = [
        {
          id: 1,
          url: 'https://www.youtube.com/watch?v=1',
          title: 'Music Video',
          thumbnail: 'thumb1.jpg',
          dateAdded: Date.now(),
          watched: false,
          type: 'video' as const,
          order: 0,
          tags: ['music']
        },
        {
          id: 2,
          url: 'https://www.youtube.com/watch?v=2',
          title: 'Tutorial Video',
          thumbnail: 'thumb2.jpg',
          dateAdded: Date.now(),
          watched: false,
          type: 'video' as const,
          order: 1,
          tags: ['tutorial']
        }
      ];

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          youtubeLinks: mockItems,
          theme: 'light',
          sortBy: 'date-desc'
        });
      });
    });

    it('should search by video title', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Music Video')).toBeInTheDocument();
        expect(screen.getByText('Tutorial Video')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by title...');
      await user.type(searchInput, 'Music');

      await waitFor(() => {
        expect(screen.getByText('Music Video')).toBeInTheDocument();
        expect(screen.queryByText('Tutorial Video')).not.toBeInTheDocument();
      });
    });

    it('should search by tag name', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Music Video')).toBeInTheDocument();
        expect(screen.getByText('Tutorial Video')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by title...');
      await user.type(searchInput, 'music');

      await waitFor(() => {
        expect(screen.getByText('Music Video')).toBeInTheDocument();
        expect(screen.queryByText('Tutorial Video')).not.toBeInTheDocument();
      });
    });

    it('should search within selected tag only', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Music Video')).toBeInTheDocument();
      });

      // Switch to music tag
      const musicTab = screen.getByText('music (1)');
      await user.click(musicTab);

      await waitFor(() => {
        expect(screen.getByText('Music Video')).toBeInTheDocument();
        expect(screen.queryByText('Tutorial Video')).not.toBeInTheDocument();
      });

      // Search for "tutorial" within music tag (should find nothing)
      const searchInput = screen.getByPlaceholderText('Search by title...');
      await user.type(searchInput, 'tutorial');

      await waitFor(() => {
        expect(screen.queryByText('Music Video')).not.toBeInTheDocument();
        expect(screen.queryByText('Tutorial Video')).not.toBeInTheDocument();
      });
    });
  });
});
