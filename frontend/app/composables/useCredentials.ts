/// <reference types="../../.nuxt/nuxt.d.ts" />
import { computed } from 'vue'
import { useState } from '#app'

/**
 * Composable to manage account credentials
 * Can be used across the application and for backend API calls
 */
export const useCredentials = () => {
  const credentials = useState<{ username: string; password: string } | null>(
    'accountCredentials',
    () => null
  )

  const saveCredentials = (username: string, password: string) => {
    credentials.value = { username, password }
    if (typeof window !== 'undefined') {
      localStorage.setItem('accountCredentials', JSON.stringify(credentials.value))
    }
  }

  const getCredentials = () => {
    // Try to load from state first, then localStorage
    if (!credentials.value && typeof window !== 'undefined') {
      const saved = localStorage.getItem('accountCredentials')
      if (saved) {
        credentials.value = JSON.parse(saved)
      }
    }
    return credentials.value
  }

  const clearCredentials = () => {
    credentials.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accountCredentials')
    }
  }

  const hasCredentials = computed(() => credentials.value !== null)

  return {
    credentials,
    saveCredentials,
    getCredentials,
    clearCredentials,
    hasCredentials
  }
}
