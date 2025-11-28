/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_PLANTBUDDY_PACKAGE_ID?: string
  readonly VITE_PLANTBUDDY_REGISTRY_ID?: string
  readonly GEMINI_API_KEY?: string
  // Add more env variables as needed
  [key: string]: any
}

