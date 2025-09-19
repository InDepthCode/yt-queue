import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    const user = userEvent.setup();
    render(<App />);
    
    const themeButton = screen.getByRole('button', { name: /switch to dark mode/i });
    await user.click(themeButton);
    
    expect(themeButton).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('validates URL input before saving', async () => {
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    
    await user.type(input, 'https://www.youtube.com/watch?v=video1');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Video A')).toBeInTheDocument();
    });
    
    // Add second video
    await user.type(input, 'https://www.youtube.com/watch?v=video2');
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
});
