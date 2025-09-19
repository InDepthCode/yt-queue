interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  source: 'primary' | 'fallback';
}

class ApiService {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this.retryConfig.maxRetries) {
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount),
        this.retryConfig.maxDelay
      );

      console.log(`Retry attempt ${retryCount + 1} after ${delay}ms`);
      await this.delay(delay);
      
      return this.retryWithBackoff(operation, retryCount + 1);
    }
  }

  private async fetchWithTimeout(
    url: string, 
    options: RequestInit = {}, 
    timeout = 10000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async fetchVideoData(url: string): Promise<ApiResponse<{ title: string; thumbnailUrl: string }>> {
    const videoId = this.getYouTubeID(url);
    const playlistId = this.getYouTubePlaylistID(url);

    // Try primary APIs first
    try {
      if (playlistId && !videoId) {
        return await this.fetchPlaylistData(url);
      } else {
        return await this.fetchVideoDataFromNoEmbed(url);
      }
    } catch (error) {
      console.warn('Primary API failed, trying fallback:', error);
      
      // Fallback to YouTube thumbnail API
      return await this.fetchWithFallback(url, videoId);
    }
  }

  private async fetchPlaylistData(url: string): Promise<ApiResponse<{ title: string; thumbnailUrl: string }>> {
    const operation = async () => {
      const response = await this.fetchWithTimeout(
        `https://api.youtubemultidownloader.com/playlist?url=${encodeURIComponent(url)}`
      );
      
      if (!response.ok) {
        throw new Error(`Playlist API response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error || !data.playlist_info || data.playlist_info.items.length === 0) {
        throw new Error('Playlist data is invalid or empty');
      }
      
      const playlistInfo = data.playlist_info;
      const firstVideoThumbnail = playlistInfo.items[0]?.thumbnail;

      return {
        data: {
          title: playlistInfo.title || 'YouTube Playlist',
          thumbnailUrl: firstVideoThumbnail || 'placeholder',
        },
        success: true,
        source: 'primary' as const,
      };
    };

    return await this.retryWithBackoff(operation);
  }

  private async fetchVideoDataFromNoEmbed(url: string): Promise<ApiResponse<{ title: string; thumbnailUrl: string }>> {
    const operation = async () => {
      const response = await this.fetchWithTimeout(
        `https://noembed.com/embed?url=${encodeURIComponent(url)}`
      );
      
      if (!response.ok) {
        throw new Error(`oEmbed network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(`oEmbed error: ${data.error}`);
      }
      
      const currentVideoId = this.getYouTubeID(url);
      const thumbnailUrl = currentVideoId 
        ? `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg` 
        : data.thumbnail_url;

      return {
        data: {
          title: data.title || 'Untitled',
          thumbnailUrl,
        },
        success: true,
        source: 'primary' as const,
      };
    };

    return await this.retryWithBackoff(operation);
  }

  private async fetchWithFallback(
    url: string, 
    videoId: string | null
  ): Promise<ApiResponse<{ title: string; thumbnailUrl: string }>> {
    try {
      // Fallback: Use YouTube's thumbnail API and extract title from URL
      const thumbnailUrl = videoId 
        ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        : 'placeholder';
      
      const title = this.extractTitleFromUrl(url);

      return {
        data: {
          title,
          thumbnailUrl,
        },
        success: true,
        source: 'fallback' as const,
      };
    } catch (error) {
      return {
        data: {
          title: 'Untitled',
          thumbnailUrl: 'placeholder',
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'fallback' as const,
      };
    }
  }

  private getYouTubeID(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    return null;
  }

  private getYouTubePlaylistID(url: string): string | null {
    const regExp = /[?&]list=([^#&?]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  private extractTitleFromUrl(url: string): string {
    // Basic title extraction from URL - this is a fallback
    const videoId = this.getYouTubeID(url);
    if (videoId) {
      return `YouTube Video (${videoId})`;
    }
    
    const playlistId = this.getYouTubePlaylistID(url);
    if (playlistId) {
      return `YouTube Playlist (${playlistId})`;
    }
    
    return 'YouTube Content';
  }

  // Health check for APIs
  async checkApiHealth(): Promise<{ noembed: boolean; youtubemultidownloader: boolean }> {
    const results = await Promise.allSettled([
      this.fetchWithTimeout('https://noembed.com/embed?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ', {}, 5000),
      this.fetchWithTimeout('https://api.youtubemultidownloader.com/playlist?url=https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMOV7V4r4s_nloyEfR', {}, 5000),
    ]);

    return {
      noembed: results[0].status === 'fulfilled',
      youtubemultidownloader: results[1].status === 'fulfilled',
    };
  }
}

export const apiService = new ApiService();
export default apiService;
