import { onBeforeUnmount, ref, type Ref } from "vue";

// Note: useRuntimeConfig is auto-imported in Nuxt 3

/**
 * Composable for handling speech-to-text audio recording.
 * Uses the browser's MediaRecorder API to capture audio and sends it to the backend for transcription.
 */
export default function useRecorder(baseURL?: string) {
  // Internal state for managing media stream and recorder
  const audioStream: Ref<MediaStream | null> = ref(null);
  const mediaRecorder: Ref<MediaRecorder | null> = ref(null);

  // Public reactive state
  const microphoneDisabled = ref(false);
  const recording = ref(false);
  const loading = ref(false);
  const recordedText = ref("");

  // Get API base URL - use provided parameter, try runtime config, or default
  const getApiBaseURL = (): string => {
    // Prefer passed parameter
    if (baseURL && typeof baseURL === 'string' && baseURL.trim()) {
      return baseURL.trim();
    }
    
    // Try to use runtime config if available (Nuxt context)
    try {
      const config = useRuntimeConfig();
      const apiBase = (config as any).public?.apiBase;
      if (apiBase && typeof apiBase === 'string') {
        return apiBase.trim();
      }
    } catch (e) {
      // Runtime config not available
    }
    
    // Always return absolute URL as fallback (backend runs on 3001, frontend on 3000)
    return 'http://localhost:3001';
  };

  /**
   * Stops the current recording session and cleans up resources
   */
  const stopRecording = async (): Promise<void> => {
    recording.value = false;

    // Stop the media recorder if it exists
    if (mediaRecorder.value) {
      mediaRecorder.value.stop();
    }

    // Stop all audio tracks to release microphone access
    if (audioStream.value) {
      audioStream.value.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Clean up references
    mediaRecorder.value = null;
    audioStream.value = null;
  };

  /**
   * Starts a new audio recording session
   */
  const startRecording = async (): Promise<void> => {
    microphoneDisabled.value = false;

    try {
      // Request microphone access
      audioStream.value = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      recording.value = true;

      // Initialize MediaRecorder with audio stream
      const audioChunks: Blob[] = [];
      mediaRecorder.value = new MediaRecorder(audioStream.value, {
        mimeType: "audio/webm",
      });

      // Collect audio data chunks as they become available
      mediaRecorder.value.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          console.log("Audio chunk received, size:", event.data.size);
          audioChunks.push(event.data);
        }
      });

      // Handle recording completion and send to transcription API
      mediaRecorder.value.addEventListener("stop", async () => {
        console.log("Recording stopped. Audio chunks collected:", audioChunks.length);
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        console.log("Audio blob created, size:", audioBlob.size, "bytes");

        loading.value = true;
        recordedText.value = ""; // Clear previous text
        
        try {
          // Get API base URL (always use absolute URL to avoid Vue Router interception)
          let apiBaseURL = getApiBaseURL();
          
          // Force absolute URL - strip any protocol-relative or relative paths
          if (!apiBaseURL.startsWith('http://') && !apiBaseURL.startsWith('https://')) {
            console.warn('API base URL is not absolute, defaulting to http://localhost:3001. Received:', apiBaseURL);
            apiBaseURL = 'http://localhost:3001';
          }
          
          // Remove trailing slash if present
          apiBaseURL = apiBaseURL.replace(/\/$/, '');
          
          // Construct absolute URL
          const transcriptURL = `${apiBaseURL}/api/transcript`;
          
          // Verify it's absolute before making the request
          if (!transcriptURL.startsWith('http://') && !transcriptURL.startsWith('https://')) {
            throw new Error(`Invalid transcript URL (must be absolute): ${transcriptURL}`);
          }
          
          // Debug: Log the URL to verify it's absolute
          console.log('Sending transcription request to:', transcriptURL);
          
          const response = await fetch(transcriptURL, {
            method: "POST",
            body: audioBlob,
            headers: {
              'Content-Type': 'audio/webm',
            },
          });

          if (response.ok) {
            const result = await response.json();
            console.log("Transcription API response:", result);
            
            if (result?.text) {
              console.log("Setting recordedText to:", result.text);
              recordedText.value = result.text;
              console.log("recordedText.value is now:", recordedText.value);
            } else {
              console.warn("No text returned from transcription API. Response:", result);
            }
          } else {
            const errorText = await response.text();
            console.error("Transcription API error:", response.status, errorText);
            recordedText.value = ""; // Clear on error
          }
        } catch (error) {
          console.error("Error sending audio for transcription:", error);
          recordedText.value = ""; // Clear on error
        } finally {
          loading.value = false;
        }
      });

      // Start recording with timeslice to ensure data is collected periodically
      // Passing 1000ms ensures we get data every second, but for short recordings
      // we'll get all data when stop() is called
      mediaRecorder.value.start(1000);
      console.log("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      microphoneDisabled.value = true;
      await stopRecording();
    }
  };

  // Clean up on component unmount
  onBeforeUnmount(() => {
    stopRecording();
  });

  return {
    microphoneDisabled,
    recording,
    loading,
    recordedText,
    startRecording,
    stopRecording,
  };
}