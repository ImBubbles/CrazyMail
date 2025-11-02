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
    try {
      const config = useRuntimeConfig()
      const baseURL = config.public.apiBase || 'http://localhost:3000'
      
      // Send account creation request to backend
      try {
        await $fetch(`${baseURL}/api/users`, {
          method: 'POST',
          body: {
            username,
            password
          },
          headers: {
            'Content-Type': 'application/json',
          },
        })
        console.log('Account created successfully in backend')
      } catch (err: any) {
        // Log error but don't block local storage
        // In case backend is down or endpoint doesn't exist yet
        console.warn('Failed to create account in backend:', err?.message || err)
        // Continue with local storage even if backend fails
      }
    } catch (err: any) {
      console.error('Error during account creation:', err)
    }
    
    // Save credentials locally regardless of backend result
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
