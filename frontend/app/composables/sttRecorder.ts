import { onBeforeUnmount, ref, type Ref } from "vue";

/**
 * Composable for handling speech-to-text audio recording.
 * Uses the browser's MediaRecorder API to capture audio and sends it to the backend for transcription.
 */
export default function useRecorder() {
  // Internal state for managing media stream and recorder
  const audioStream: Ref<MediaStream | null> = ref(null);
  const mediaRecorder: Ref<MediaRecorder | null> = ref(null);

  // Public reactive state
  const microphoneDisabled = ref(false);
  const recording = ref(false);
  const loading = ref(false);
  const recordedText = ref("");

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
          audioChunks.push(event.data);
        }
      });

      // Handle recording completion and send to transcription API
      mediaRecorder.value.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

        loading.value = true;
        try {
          const response = await fetch("/api/voice", {
            method: "POST",
            body: audioBlob,
          });

          if (response.ok && response.body) {
            const result = await response.json();
            if (result?.text) {
              recordedText.value = result.text;
            }
          }
        } catch (error) {
          console.error("Error sending audio for transcription:", error);
        } finally {
          loading.value = false;
        }
      });

      // Start recording
      mediaRecorder.value.start();
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