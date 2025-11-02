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

  const saveCredentials = async (username: string, password: string) => {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBase || 'http://localhost:4000'
    
    // Send account creation request to backend
    try {
      const response = await $fetch(`${baseURL}/users`, {
        method: 'POST',
        body: {
          username,
          password
        },
        headers: {
          'Content-Type': 'application/json',
        },
      })
      console.log('Account created successfully in backend:', response)
      
      // Only save credentials locally if backend request succeeds
      credentials.value = { username, password }
      if (typeof window !== 'undefined') {
        localStorage.setItem('accountCredentials', JSON.stringify(credentials.value))
      }
    } catch (err: any) {
      console.error('Failed to create account in backend:', err)
      // Re-throw to let the UI handle the error
      throw new Error(err?.message || err?.data?.message || 'Failed to create account. Please try again.')
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
