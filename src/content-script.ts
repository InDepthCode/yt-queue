// Content script for capturing video position from YouTube
// This script runs on YouTube pages to capture video playback data

interface VideoData {
  currentTime: number;
  duration: number;
  videoId: string;
  title: string;
}

// Function to get video ID from current YouTube URL
function getCurrentVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Function to get video element and extract data
function getVideoData(): VideoData | null {
  const video = document.querySelector('video') as HTMLVideoElement;
  if (!video) return null;

  const videoId = getCurrentVideoId();
  if (!videoId) return null;

  const titleElement = document.querySelector('h1.title yt-formatted-string, h1.ytd-video-primary-info-renderer');
  const title = titleElement?.textContent?.trim() || 'Unknown Title';

  return {
    currentTime: video.currentTime,
    duration: video.duration,
    videoId,
    title
  };
}

// Function to save video position
function saveVideoPosition() {
  const videoData = getVideoData();
  if (!videoData) {
    console.log('No video data available');
    return;
  }

  // Send message to background script
  chrome.runtime.sendMessage({
    type: 'SAVE_VIDEO_POSITION',
    data: {
      videoId: videoData.videoId,
      position: videoData.currentTime,
      duration: videoData.duration,
      title: videoData.title,
      timestamp: Date.now()
    }
  });
}

// Function to restore video position
function restoreVideoPosition(videoId: string, position: number) {
  const video = document.querySelector('video') as HTMLVideoElement;
  if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA
    video.currentTime = position;
    console.log(`Restored video position to ${position} seconds`);
  }
}

// Function to check URL for timestamp parameter and restore position
function checkAndRestoreFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const timestamp = urlParams.get('t');
  
  if (timestamp) {
    const position = parseInt(timestamp);
    if (!isNaN(position) && position > 0) {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        // Wait for video to be ready
        const restorePosition = () => {
          if (video.readyState >= 2) {
            video.currentTime = position;
            console.log(`Resumed video from URL timestamp: ${position} seconds`);
          } else {
            setTimeout(restorePosition, 100);
          }
        };
        restorePosition();
      }
    }
  }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.type === 'SAVE_POSITION') {
    saveVideoPosition();
    sendResponse({ success: true });
  } else if (message.type === 'RESTORE_POSITION') {
    const { videoId, position } = message.data;
    restoreVideoPosition(videoId, position);
    sendResponse({ success: true });
  } else if (message.type === 'GET_VIDEO_DATA') {
    console.log('Getting video data...');
    const videoData = getVideoData();
    console.log('Video data retrieved:', videoData);
    sendResponse({ success: !!videoData, data: videoData });
  }
  
  return true; // Keep message channel open for async response
});

// Removed automatic saving - now only manual saves via button

// Check for URL timestamp parameter on page load
checkAndRestoreFromURL();

// Also check when the page changes (for SPA navigation)
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    setTimeout(checkAndRestoreFromURL, 1000); // Wait a bit for video to load
  }
});
observer.observe(document.body, { childList: true, subtree: true });

console.log('YT Queue content script loaded');
