/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `threeds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Wait for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface DecodedCaptureContext {
  clientLibrary: string
  clientLibraryIntegrity?: string
  allowedCardNetworks?: string[]
  allowedPaymentTypes?: string[]
}

/**
 * Decode CyberSource Capture Context (JWT) and extract client library info
 */
export function decodeCaptureContext(
  captureContext: string
): DecodedCaptureContext {
  if (!captureContext) {
    throw new Error('Capture context is required')
  }

  const parts = captureContext.split('.')

  if (parts.length !== 3) {
    throw new Error('Invalid capture context format - expected JWT with 3 parts')
  }

  const payload = parts[1]

  try {
    // Base64url to Base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.substring(0, (4 - base64.length % 4) % 4)

    const decodedJson = JSON.parse(atob(padded))

    // Handle both array and object ctx formats
    const contextData = Array.isArray(decodedJson.ctx)
      ? decodedJson.ctx[0]?.data
      : decodedJson.ctx?.data

    const clientLibrary = contextData?.clientLibrary

    if (!clientLibrary) {
      console.error('Decoded capture context:', decodedJson)
      throw new Error('clientLibrary not found in capture context')
    }

    return {
      clientLibrary,
      clientLibraryIntegrity: contextData?.clientLibraryIntegrity,
      allowedCardNetworks: contextData?.allowedCardNetworks,
      allowedPaymentTypes: contextData?.allowedPaymentTypes
    }
  } catch (error) {
    if ((error as Error).message.includes('clientLibrary')) {
      throw error
    }
    throw new Error(
      'Failed to decode capture context: ' + (error as Error).message
    )
  }
}

export * from './logger'