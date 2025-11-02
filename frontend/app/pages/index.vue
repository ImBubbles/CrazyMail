<script setup lang="ts">
import { useCredentials } from '../composables/useCredentials'
import { useEmails } from '../composables/useEmails'
import { watch, onMounted, ref, computed } from 'vue'
const { hasCredentials } = useCredentials()
import { useRouter } from 'vue-router'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import EmailCard from '../components/EmailCard.vue';
const router = useRouter()

const isPlayingAudio = ref(false)
const isGeneratingAudio = ref(false)
let currentAudio: HTMLAudioElement | null = null
let currentAudioUrl: string | null = null
const { 
  filteredEmails, 
  allTags, 
  selectedTag, 
  selectedEmail,
  loading, 
  error,
  emails,
  fetchEmails, 
  setSelectedTag,
  setSelectedEmail
} = useEmails()

// Use import.meta.env for Vite-based projects (client-side env vars)
// Ensure you assign the correct env var in your Vite config (e.g., VITE_ELEVENLABS_API_KEY)
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

// Initialize ElevenLabs client only if API key is available
let elevenlabs: ElevenLabsClient | null = null;
if (ELEVENLABS_API_KEY) {
  elevenlabs = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
  });
}

const createAudioStreamFromText = async (text: string): Promise<Uint8Array> => {
  if (!elevenlabs) {
    throw new Error('ElevenLabs API key is not configured. Please set VITE_ELEVENLABS_API_KEY in your environment variables.');
  }
  
  const audioStream = await elevenlabs.textToSpeech.stream('JBFqnCBsd6RMkjVDRZzb', {
    modelId: 'eleven_multilingual_v2',
    text,
    outputFormat: 'mp3_44100_128',
    // Optional voice settings that allow you to customize the output
    voiceSettings: {
      stability: 0,
      similarityBoost: 1.0,
      useSpeakerBoost: true,
      speed: 1.0,
    },
  });

  // Browser safe: accumulate Uint8Array chunks, then concat and return as a single Uint8Array
  const chunks: Uint8Array[] = [];
  // `audioStream` is a ReadableStream<Uint8Array> in browser, so we use a reader:
  const reader = audioStream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  // Concatenate all Uint8Array chunks into one
  let totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const content = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.length;
  }
  return content;
};

const playEmailAudio = async () => {
  if (!selectedEmail.value) return;

  // Check if API key is configured
  if (!ELEVENLABS_API_KEY || !elevenlabs) {
    alert('Audio playback is not available. Please configure VITE_ELEVENLABS_API_KEY in your environment variables.');
    return;
  }

  // If audio is paused, resume it
  if (currentAudio && !isPlayingAudio.value) {
    try {
      await currentAudio.play();
      isPlayingAudio.value = true;
      return;
    } catch (error) {
      console.error('Error resuming audio:', error);
      // If resume fails, clear and regenerate
      stopEmailAudio();
    }
  }

  // If audio is already playing, nothing to do (button should pause instead)
  if (currentAudio && isPlayingAudio.value) {
    return;
  }

  try {
    isGeneratingAudio.value = true;
    const audioData = await createAudioStreamFromText(selectedEmail.value.body);
    
    // Create a blob from the audio data and play it
    // Create a new ArrayBuffer from the Uint8Array to ensure proper type
    const arrayBuffer = new ArrayBuffer(audioData.length);
    const view = new Uint8Array(arrayBuffer);
    view.set(audioData);
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    currentAudioUrl = audioUrl;
    
    currentAudio = new Audio(audioUrl);
    
    currentAudio.addEventListener('ended', () => {
      isPlayingAudio.value = false;
      cleanupAudio();
    });
    
    currentAudio.addEventListener('error', (error) => {
      console.error('Error playing audio:', error);
      isPlayingAudio.value = false;
      isGeneratingAudio.value = false;
      cleanupAudio();
    });
    
    await currentAudio.play();
    isPlayingAudio.value = true;
    isGeneratingAudio.value = false;
  } catch (error) {
    console.error('Error generating or playing audio:', error);
    isGeneratingAudio.value = false;
    isPlayingAudio.value = false;
    cleanupAudio();
    alert('Failed to generate audio. Please try again.');
  }
};

const cleanupAudio = () => {
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
  currentAudio = null;
};

const stopEmailAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    isPlayingAudio.value = false;
    // Don't cleanup here - allow resume by keeping the audio element
  }
};

const handleAudioButtonClick = () => {
  if (isPlayingAudio.value) {
    // If playing, pause it
    stopEmailAudio();
  } else {
    // If not playing, start or resume
    playEmailAudio();
  }
};

// Clean up audio when email modal is closed
watch(selectedEmail, (newEmail) => {
  if (!newEmail) {
    if (currentAudio) {
      currentAudio.pause();
      isPlayingAudio.value = false;
    }
    cleanupAudio();
  }
});
// Redirect to login if no credentials
watch(hasCredentials, (hasCreds) => {
  if (!hasCreds) {
    router.push('/login')
  }
}, { immediate: true })

onMounted(() => {
  if (hasCredentials.value) {
    fetchEmails()
  }
})

// Refresh emails when navigating back to this page
watch(() => router.currentRoute.value.path, (newPath) => {
  if (newPath === '/' && hasCredentials.value) {
    fetchEmails()
  }
})

const createEmail = () => {
  // TODO: Navigate to create email page or open modal
  router.push('/compose')
}

// Heatmap data computation
const heatmapData = computed(() => {
  // Initialize 24x7 grid (24 hours, 7 days)
  const grid: number[][] = Array(24).fill(null).map(() => Array(7).fill(0))
  
  if (!emails.value || emails.value.length === 0) {
    return grid
  }
  
  // Count emails per hour/day combination
  emails.value.forEach(email => {
    try {
      const date = new Date(email.date)
      const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
      const hour = date.getHours() // 0-23
      
      if (hour >= 0 && hour < 24 && dayOfWeek >= 0 && dayOfWeek < 7) {
        const row = grid[hour]
        if (row) {
          row[dayOfWeek] = (row[dayOfWeek] || 0) + 1
        }
      }
    } catch (e) {
      console.warn('Error parsing email date:', email.date, e)
    }
  })
  
  return grid
})

// Get max count for normalization
const maxCount = computed(() => {
  if (!heatmapData.value) return 1
  let max = 0
  for (let hour = 0; hour < 24; hour++) {
    const row = heatmapData.value[hour]
    if (row) {
      for (let day = 0; day < 7; day++) {
        const count = row[day] || 0
        max = Math.max(max, count)
      }
    }
  }
  return max || 1
})

// Get color intensity based on count
const getCellColor = (count: number) => {
  if (count === 0) return '#ebedf0' // Light gray for no emails
  const intensity = count / maxCount.value
  // Color scale from light blue (low) to dark blue/purple (high)
  if (intensity < 0.25) return '#c6e48b'
  if (intensity < 0.5) return '#7bc96f'
  if (intensity < 0.75) return '#239a3b'
  return '#196127'
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const hourLabels = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12
  const period = i < 12 ? 'AM' : 'PM'
  return `${hour}${period}`
})
</script>

<template>
  <div id="app">
  <div class="inbox-container">
    <header class="inbox-header">
      <div class="header-content">
        <h1 class="inbox-title">Inbox</h1>
        <button @click="createEmail" class="create-button">
          <span class="button-icon">✉</span>
          Create Email
        </button>
      </div>
    </header>

    <div class="inbox-content">
      <!-- Tag Filter Section -->
      <div class="tags-section">
        <div class="tags-header">
          <h2 class="tags-title">Filter by Tags</h2>
          <button 
            v-if="selectedTag" 
            @click="setSelectedTag(null)" 
            class="clear-filter-button"
          >
            Clear Filter
          </button>
        </div>
        <div class="tags-list">
          <button
            v-for="tag in (allTags || [])"
            :key="tag"
            @click="setSelectedTag(selectedTag === tag ? null : tag)"
            :class="['tag-button', { active: selectedTag === tag }]"
          >
            {{ tag }}
            <span v-if="selectedTag === tag" class="tag-check">✓</span>
          </button>
          <p v-if="!allTags || allTags.length === 0" class="no-tags">No tags available</p>
        </div>
        <p v-if="selectedTag" class="filter-indicator">
          Showing emails tagged: <strong>{{ selectedTag }}</strong>
        </p>
        
        <!-- Email Activity Heatmap -->
        <div class="heatmap-section">
          <h3 class="heatmap-title">Email Activity</h3>
          <div class="heatmap-container">
            <div class="heatmap-grid">
              <!-- Day labels row -->
              <div class="heatmap-label-row">
                <div class="heatmap-corner"></div>
                <div 
                  v-for="(day, dayIndex) in dayLabels" 
                  :key="dayIndex"
                  class="heatmap-day-label"
                >
                  {{ day }}
                </div>
              </div>
              <!-- Hour rows -->
              <div 
                v-for="(hour, hourIndex) in hourLabels" 
                :key="hourIndex"
                class="heatmap-row"
              >
                <div class="heatmap-hour-label">{{ hour }}</div>
                <div 
                  v-for="(day, dayIndex) in dayLabels" 
                  :key="dayIndex"
                  class="heatmap-cell"
                  :style="{ backgroundColor: getCellColor(heatmapData[hourIndex]?.[dayIndex] || 0) }"
                  :title="`${dayLabels[dayIndex]} ${hour}: ${heatmapData[hourIndex]?.[dayIndex] || 0} email${(heatmapData[hourIndex]?.[dayIndex] || 0) !== 1 ? 's' : ''}`"
                >
                  <span v-if="(heatmapData[hourIndex]?.[dayIndex] || 0) > 0" class="cell-count">
                    {{ heatmapData[hourIndex]?.[dayIndex] || 0 }}
                  </span>
                </div>
              </div>
            </div>
            <div class="heatmap-legend">
              <span class="legend-label">Less</span>
              <div class="legend-gradient">
                <div class="legend-color" style="background-color: #ebedf0;"></div>
                <div class="legend-color" style="background-color: #c6e48b;"></div>
                <div class="legend-color" style="background-color: #7bc96f;"></div>
                <div class="legend-color" style="background-color: #239a3b;"></div>
                <div class="legend-color" style="background-color: #196127;"></div>
              </div>
              <span class="legend-label">More</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Email List -->
      <div class="emails-section">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading emails...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p class="error-message">{{ error }}</p>
          <button @click="fetchEmails" class="retry-button">Retry</button>
        </div>

        <div v-else-if="!filteredEmails || filteredEmails.length === 0" class="empty-state">
          <p class="empty-message">
            {{ selectedTag ? `No emails with tag "${selectedTag}"` : 'No emails in inbox' }}
          </p>
        </div>

        <div v-else class="emails-list">
          <EmailCard
            v-for="email in (filteredEmails || [])"
            :key="email.id"
            :email="email"
            @click="setSelectedEmail(email)"
          />
        </div>
      </div>
    </div>
    
    <!-- Email Detail Modal -->
    <div 
      v-if="selectedEmail" 
      class="email-modal-overlay"
      @click.self="setSelectedEmail(null)"
      @keydown.escape="setSelectedEmail(null)"
      tabindex="0"
    >
      <div class="email-modal">
        <div class="email-modal-header">
          <h2 class="email-modal-subject">{{ selectedEmail.subject }}</h2>
          <div class="header-actions">
            <button 
              @click="handleAudioButtonClick()"
              :disabled="isGeneratingAudio || !ELEVENLABS_API_KEY"
              class="audio-button"
              :class="{ playing: isPlayingAudio, loading: isGeneratingAudio }"
              :aria-label="ELEVENLABS_API_KEY ? 'Play/Pause email audio' : 'Audio unavailable - API key not configured'"
              :title="!ELEVENLABS_API_KEY ? 'Audio playback requires VITE_ELEVENLABS_API_KEY to be configured' : ''"
            >
              <span v-if="isGeneratingAudio" class="audio-icon">⏳</span>
              <span v-else-if="isPlayingAudio" class="audio-icon">⏸</span>
              <span v-else class="audio-icon">🔊</span>
              <span class="audio-text">{{ isGeneratingAudio ? 'Generating...' : isPlayingAudio ? 'Pause' : 'Listen' }}</span>
            </button>
            <button 
              @click="setSelectedEmail(null)"
              class="close-button"
              aria-label="Close email"
            >
              ×
            </button>
          </div>
        </div>
        <div class="email-modal-content">
          <div class="email-modal-meta">
            <div class="email-meta-row">
              <span class="email-meta-label">From:</span>
              <span class="email-meta-value">{{ selectedEmail.from }}</span>
            </div>
            <div class="email-meta-row">
              <span class="email-meta-label">To:</span>
              <span class="email-meta-value">{{ selectedEmail.to }}</span>
            </div>
            <div class="email-meta-row" v-if="selectedEmail && selectedEmail.cc && selectedEmail.cc.length > 0">
              <span class="email-meta-label">CC:</span>
              <span class="email-meta-value">{{ selectedEmail.cc.join(', ') }}</span>
            </div>
            <div class="email-meta-row" v-if="selectedEmail && selectedEmail.bcc && selectedEmail.bcc.length > 0">
              <span class="email-meta-label">BCC:</span>
              <span class="email-meta-value">{{ selectedEmail.bcc.join(', ') }}</span>
            </div>
            <div class="email-meta-row">
              <span class="email-meta-label">Date:</span>
              <span class="email-meta-value">{{ new Date(selectedEmail.date).toLocaleString() }}</span>
            </div>
              <div class="email-meta-row" v-if="selectedEmail && selectedEmail.tags && selectedEmail.tags.length > 0">
              <span class="email-meta-label">Tags:</span>
              <div class="email-meta-tags">
                <span
                  v-for="tag in (selectedEmail.tags || [])"
                  :key="tag"
                  class="email-modal-tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
          <div class="email-modal-body">
            {{ selectedEmail.body }}
          </div>

        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.inbox-container {
  min-height: 100vh;
  background: #f7fafc;
}

.inbox-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 1.5rem 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inbox-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
}

.create-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.create-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.button-icon {
  font-size: 1.2rem;
}

.inbox-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
}

.heatmap-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.heatmap-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 0.75rem 0;
}

.heatmap-container {
  overflow-x: auto;
  width: 100%;
}

.heatmap-grid {
  display: inline-block;
  width: 100%;
}

.heatmap-label-row {
  display: flex;
  margin-bottom: 0.25rem;
}

.heatmap-corner {
  width: 28px;
  flex-shrink: 0;
}

.heatmap-day-label {
  flex: 1;
  text-align: center;
  font-size: 0.6rem;
  font-weight: 600;
  color: #4a5568;
  padding: 0.125rem;
  min-width: 0;
}

.heatmap-row {
  display: flex;
  margin-bottom: 1px;
  align-items: center;
}

.heatmap-hour-label {
  width: 28px;
  flex-shrink: 0;
  font-size: 0.55rem;
  color: #718096;
  text-align: right;
  padding-right: 0.25rem;
}

.heatmap-cell {
  flex: 1;
  aspect-ratio: 1;
  min-width: 0;
  min-height: 16px;
  margin: 0 1px;
  border-radius: 2px;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.heatmap-cell:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.cell-count {
  font-size: 0.5rem;
  font-weight: 600;
  color: #2d3748;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
}

.legend-label {
  font-size: 0.6rem;
  color: #718096;
}

.legend-gradient {
  display: flex;
  gap: 1px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.tags-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  height: fit-content;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.tags-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.clear-filter-button {
  padding: 0.25rem 0.75rem;
  background: #fed7d7;
  color: #742a2a;
  border: 1px solid #fc8181;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.clear-filter-button:hover {
  background: #fc8181;
  color: white;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag-button {
  padding: 0.5rem 1rem;
  background: #edf2f7;
  color: #2d3748;
  border: 2px solid transparent;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tag-button:hover {
  background: #e2e8f0;
  border-color: #cbd5e0;
}

.tag-button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.tag-check {
  font-weight: bold;
}

.no-tags {
  color: #718096;
  font-size: 0.875rem;
  font-style: italic;
}

.filter-indicator {
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  color: #4a5568;
  font-size: 0.875rem;
  margin: 0;
}

.emails-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #718096;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #e53e3e;
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.empty-message {
  font-size: 1.1rem;
}

.emails-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.email-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(4px);
}

.email-modal {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.email-modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.email-modal-subject {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
  padding-right: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.audio-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.audio-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.audio-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.audio-button.playing {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.audio-icon {
  font-size: 1rem;
}

.audio-text {
  font-size: 0.875rem;
}

.close-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 2rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.email-modal-content {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.email-modal-meta {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.email-meta-row {
  display: flex;
  margin-bottom: 0.75rem;
  align-items: flex-start;
}

.email-meta-row:last-child {
  margin-bottom: 0;
}

.email-meta-label {
  font-weight: 600;
  color: #4a5568;
  min-width: 60px;
  margin-right: 1rem;
}

.email-meta-value {
  color: #2d3748;
  flex: 1;
}

.email-meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex: 1;
}

.email-modal-tag {
  padding: 0.25rem 0.75rem;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.email-modal-body {
  color: #2d3748;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .inbox-content {
    grid-template-columns: 1fr;
  }

  .tags-section {
    order: 2;
  }

  .emails-section {
    order: 1;
  }

  .email-modal-overlay {
    padding: 1rem;
  }

  .email-modal-header {
    padding: 1rem 1.5rem;
  }

  .email-modal-subject {
    font-size: 1.25rem;
  }

  .email-modal-content {
    padding: 1.5rem;
  }
}
</style>
