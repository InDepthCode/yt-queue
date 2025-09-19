import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from '../services/apiService';

// Mock fetch globally
global.fetch = vi.fn();

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchVideoData', () => {
    it('fetches video data successfully from noembed', async () => {
      const mockResponse = {
        title: 'Test Video',
        thumbnail_url: 'https://example.com/thumb.jpg',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await apiService.fetchVideoData('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Test Video');
      expect(result.data.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
      expect(result.source).toBe('primary');
    });

    it('fetches playlist data successfully', async () => {
      const mockResponse = {
        playlist_info: {
          title: 'Test Playlist',
          items: [
            { thumbnail: 'https://example.com/thumb1.jpg' },
          ],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await apiService.fetchVideoData('https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMOV7V4r4s_nloyEfR');

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Test Playlist');
      expect(result.data.thumbnailUrl).toBe('https://example.com/thumb1.jpg');
      expect(result.source).toBe('primary');
    });

    it('falls back to YouTube thumbnail API when primary APIs fail', async () => {
      // Mock primary API failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await apiService.fetchVideoData('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('YouTube Video (dQw4w9WgXcQ)');
      expect(result.data.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
      expect(result.source).toBe('fallback');
    });

    it('handles playlist fallback correctly', async () => {
      // Mock primary API failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await apiService.fetchVideoData('https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMOV7V4r4s_nloyEfR');

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('YouTube Playlist (PLrAXtmRdnEQy6nuLMOV7V4r4s_nloyEfR)');
      expect(result.data.thumbnailUrl).toBe('placeholder');
      expect(result.source).toBe('fallback');
    });

    it('retries failed requests with exponential backoff', async () => {
      // Mock multiple failures followed by success
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ title: 'Test Video' }),
        } as Response);

      const result = await apiService.fetchVideoData('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('handles timeout errors', async () => {
      // Mock a timeout error
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        })
      );

      const result = await apiService.fetchVideoData('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result.success).toBe(true);
      expect(result.source).toBe('fallback');
    });
  });

  describe('checkApiHealth', () => {
    it('checks API health successfully', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response);

      const result = await apiService.checkApiHealth();

      expect(result.noembed).toBe(true);
      expect(result.youtubemultidownloader).toBe(true);
    });

    it('reports API health failures', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await apiService.checkApiHealth();

      expect(result.noembed).toBe(false);
      expect(result.youtubemultidownloader).toBe(false);
    });
  });
});
