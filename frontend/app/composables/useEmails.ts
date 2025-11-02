import { readonly, computed } from 'vue'

/**
 * Composable for managing emails from the backend
 */
export interface Email {
  id: string
  subject: string
  from: string
  to: string
  body: string
  date: string
  tags: string[]
  read?: boolean
}

export const useEmails = () => {
  const emails = useState<Email[]>('emails', () => [])
  const loading = useState<boolean>('emailsLoading', () => false)
  const error = useState<string | null>('emailsError', () => null)
  const selectedTag = useState<string | null>('selectedTag', () => null)
  const selectedEmail = useState<Email | null>('selectedEmail', () => null)

  const fetchEmails = async () => {
    loading.value = true
    error.value = null
    
    try {
      // TODO: Replace with actual backend API endpoint
      // For now, using mock data
      const config = useRuntimeConfig()
      const baseURL = config.public.apiBase || 'http://localhost:3000'
      
      // Try to fetch from backend with timeout, fallback to mock data if unavailable
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 2000) // 2 second timeout
        })
        
        // Race between fetch and timeout
        const response = await Promise.race([
          $fetch<Email[]>(`${baseURL}/api/emails`, {
            method: 'GET',
            timeout: 2000,
          }).catch((err) => {
            // If fetch fails, throw to be caught by outer catch
            throw err
          }),
          timeoutPromise
        ])
        
        // If response is valid and not empty, use it
        if (response && Array.isArray(response) && response.length > 0) {
          emails.value = response
        } else {
          // Empty response, use mock data
          console.warn('Backend returned empty response, using mock data')
          emails.value = getMockEmails()
        }
      } catch (err: any) {
        // If backend is not available or times out, use mock data
        console.warn('Backend not available, using mock data:', err?.message || err)
        emails.value = getMockEmails()
        // Clear error since we have mock data
        error.value = null
      }
    } catch (err: any) {
      console.error('Error fetching emails:', err)
      // Use mock data on error
      emails.value = getMockEmails()
      // Clear error since we have mock data
      error.value = null
    } finally {
      loading.value = false
    }
  }

  const getMockEmails = (): Email[] => {
    return [
      {
        id: '1',
        subject: 'Welcome to CrazyMail',
        from: 'system@crazymail.com',
        to: 'user@example.com',
        body: 'Welcome to CrazyMail! Start creating emails and organizing them with tags. How long will this go until it cant be displayed in the email card?',
        date: new Date().toISOString(),
        tags: ['welcome', 'system'],
        read: false
      },
      {
        id: '2',
        subject: 'Getting Started Guide',
        from: 'support@crazymail.com',
        to: 'user@example.com',
        body: 'Here are some tips to get you started with CrazyMail...',
        date: new Date(Date.now() - 86400000).toISOString(),
        tags: ['support', 'guide'],
        read: false
      },
      {
        id: '3',
        subject: 'Weekly Newsletter',
        from: 'newsletter@crazymail.com',
        to: 'user@example.com',
        body: 'Check out this week\'s updates and features...',
        date: new Date(Date.now() - 172800000).toISOString(),
        tags: ['newsletter'],
        read: true
      }
    ]
  }

  const filteredEmails = computed(() => {
    if (!emails.value) {
      return []
    }
    if (!selectedTag.value) {
      return emails.value
    }
    return emails.value.filter(email => 
      email?.tags?.some(tag => tag.toLowerCase() === selectedTag.value?.toLowerCase())
    )
  })

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    if (emails.value) {
      emails.value.forEach(email => {
        if (email?.tags) {
          email.tags.forEach(tag => tagSet.add(tag))
        }
      })
    }
    return Array.from(tagSet).sort()
  })

  const setSelectedTag = (tag: string | null) => {
    selectedTag.value = tag
  }

  const setSelectedEmail = (email: Email | null) => {
    selectedEmail.value = email
    // Mark email as read when selected
    if (email && !email.read) {
      const emailIndex = emails.value.findIndex(e => e.id === email.id)
      if (emailIndex !== -1) {
        const existingEmail = emails.value[emailIndex]
        if (existingEmail) {
          emails.value[emailIndex] = {
            ...existingEmail,
            read: true
          }
        }
      }
    }
  }

  return {
    emails: readonly(emails),
    loading: readonly(loading),
    error: readonly(error),
    filteredEmails,
    allTags,
    selectedTag: readonly(selectedTag),
    selectedEmail: readonly(selectedEmail),
    fetchEmails,
    setSelectedTag,
    setSelectedEmail
  }
}
