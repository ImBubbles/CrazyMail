<script setup lang="ts">
import { ref, computed } from 'vue'

const subject = ref('')
const to = ref('')
const body = ref('')
const date = ref(new Date().toISOString())
const id = ref('')



const sendMail = async () => {
  const response = await fetch('http://localhost:3000/api/emails', {
    method: 'POST',
    body: JSON.stringify({ subject, to, body, date, id }),
  })
  const data = await response.json()
  console.log(data)
}

</script>

<template>
    <div id="app">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Composer</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Configure Tailwind for the Inter font and custom colors -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'primary-blue': '#4F46E5', // Indigo-600
                        'light-gray': '#F9FAFB', // Gray-50
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                }
            }
        }
    </script>
    <style>
        /* Custom scrollbar for the textarea */
        textarea::-webkit-scrollbar {
            width: 8px;
        }
        textarea::-webkit-scrollbar-thumb {
            background-color: #CBD5E1; /* Slate-300 */
            border-radius: 4px;
        }
        textarea::-webkit-scrollbar-track {
            background-color: #F1F5F9; /* Slate-100 */
        }
        /* Ensure the body takes full viewport height for centering */
        body {
            min-height: 100vh;
        }
    </style>
</head>
<body class="font-sans bg-gray-100 flex items-center justify-center p-4 sm:p-6 md:p-8">

    <div id="email-form-container" class="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-hidden">

        <!-- Header -->
        <header class="bg-primary-blue text-white p-5 sm:p-6 rounded-t-2xl">
            <h1 class="text-2xl sm:text-3xl font-bold">Compose New Email</h1>
        </header>

        <!-- Email Form Content -->
        <div class="p-5 sm:p-8 space-y-6">

            <!-- Recipient Input (To) -->
            <div>
                <label for="to-input" class="block text-sm font-medium text-gray-700 mb-1">
                    To
                </label>
                <input
                    type="email"
                    id="to-input"
                    placeholder="recipient@example.com"
                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-blue focus:ring-primary-blue transition duration-150 ease-in-out p-3 text-gray-800"
                >
            </div>

            <!-- Subject Input -->
            <div>
                <label for="subject-input" class="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                </label>
                <input
                    type="text"
                    id="subject-input"
                    placeholder="e.g., Quarterly Report Review"
                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-blue focus:ring-primary-blue transition duration-150 ease-in-out p-3 text-gray-800"
                >
            </div>

            <!-- Body Textarea -->
            <div>
                <label for="body-textarea" class="block text-sm font-medium text-gray-700 mb-1">
                    Body
                </label>
                <textarea
                    id="body-textarea"
                    rows="15"
                    placeholder="Start writing your email here..."
                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-blue focus:ring-primary-blue transition duration-150 ease-in-out p-3 text-gray-800 resize-none"
                ></textarea>
            </div>

            <!-- Send Button -->
            <div class="flex justify-end">
                <button
                    onclick="sendEmail()"
                    class="flex items-center space-x-2 px-6 py-3 bg-primary-blue text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-[1.02]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span>Send Email</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Confirmation Modal (Simple message box instead of alert) -->
    <div id="confirmation-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center p-4 z-50">
        <div class="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full transition-all transform scale-95 opacity-0 duration-300">
            <h3 class="text-xl font-bold text-gray-900 mb-3">Email Sent!</h3>
            <p id="modal-message" class="text-gray-600 mb-4 text-sm"></p>
            <button
                onclick="closeModal()"
                class="w-full px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-indigo-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2"
            >
                Close
            </button>
        </div>
    </div>
    
</body>
</div>
</template>