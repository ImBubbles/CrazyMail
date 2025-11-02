<script setup lang="ts">
import type { Email } from '../../composables/useEmails'

interface Props {
  email: Email
}

const props = defineProps<Props>()

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}
</script>

<template>
  <div :class="['email-item', { unread: !email.read }]">
    <div class="email-header">
      <div class="email-sender">
        <span class="sender-name">{{ email.from }}</span>
        <span class="email-date">{{ formatDate(email.date) }}</span>
      </div>
    </div>
    <div class="email-subject">{{ email.subject }}</div>
    <div class="email-preview">{{ email.body.substring(0, 100) }}...</div>
    <div class="email-tags">
      <span
        v-for="tag in email.tags"
        :key="tag"
        class="email-tag"
      >
        {{ tag }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.email-item {
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.email-item:hover {
  border-color: #cbd5e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.email-item.unread {
  background: #ebf8ff;
  border-color: #90cdf4;
  font-weight: 600;
}

.email-header {
  margin-bottom: 0.5rem;
}

.email-sender {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sender-name {
  font-weight: 600;
  color: #2d3748;
}

.email-date {
  font-size: 0.875rem;
  color: #718096;
}

.email-subject {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.email-preview {
  color: #4a5568;
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.email-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.email-tag {
  padding: 0.25rem 0.75rem;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}
</style>

