import { DeviceDataCollector } from './ui/device-data-collector'
import { collectBrowserInfo } from './ui/browser-info-collector'
import { ChallengeModal } from './ui/challenge-modal'
import { FlexMicroform } from './ui/flex-microform'
import { decodeCaptureContext, sleep, Logger } from './utils'
import type {
  DeviceDataOptions,
  ChallengeModalOptions,
  AuthenticationResult,
  ModalStyles,
  FlexMicroformOptions,
  FlexMicroformInstance,
  DeviceInformation
} from './types'

/**
 * Module-scope singleton state for Flex SDK loading
 */
let flexLoadPromise: Promise<void> | null = null
let loadedFlexScriptUrl: string | null = null

export class WebClient {
  private deviceDataCollector: DeviceDataCollector
  private challengeModal: ChallengeModal
  private flexMicroform: FlexMicroform | null = null

  constructor() {
    this.deviceDataCollector = new DeviceDataCollector()
    this.challengeModal = new ChallengeModal()
  }

  /**
   * Load and wait for the CyberSource Flex Microform SDK
   */
  private async waitForLibrary(
    clientLibrary: string,
    clientLibraryIntegrity?: string
  ): Promise<void> {
    // Already loaded with same URL
    if (
      typeof (window as any).Flex === 'function' &&
      loadedFlexScriptUrl === clientLibrary
    ) {
      Logger.debug('[WebClient] Flex SDK already loaded')
      return
    }

    // Different URL requested - reset state
    if (loadedFlexScriptUrl && loadedFlexScriptUrl !== clientLibrary) {
      Logger.info('[WebClient] Different Flex SDK URL requested, reloading...')
      this.removeFlexScript()
      flexLoadPromise = null
      loadedFlexScriptUrl = null
    }

    if (!flexLoadPromise) {
      flexLoadPromise = this.loadFlexScript(clientLibrary, clientLibraryIntegrity)
    }

    await flexLoadPromise
  }

  /**
   * Load the Flex SDK script
   */
  private loadFlexScript(
    clientLibrary: string,
    clientLibraryIntegrity?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check for existing script
      const existingScript = document.querySelector(
        `script[src="${clientLibrary}"]`
      ) as HTMLScriptElement | null

      const waitForFlexConstructor = async () => {
        const maxAttempts = 30
        const intervalMs = 100

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (typeof (window as any).Flex === 'function') {
            Logger.debug(`[WebClient] ✅ Flex constructor available after ${attempt * intervalMs}ms`)
            loadedFlexScriptUrl = clientLibrary
            resolve()
            return
          }
          await sleep(intervalMs)
        }

        reject(new Error(
          'Flex SDK script loaded but Flex constructor not available. ' +
          'This may indicate a network issue or script error.'
        ))
      }

      if (existingScript) {
        Logger.debug('[WebClient] Found existing Flex script tag')

        // Check if script is already loaded
        if (typeof (window as any).Flex === 'function') {
          loadedFlexScriptUrl = clientLibrary
          resolve()
          return
        }

        // Wait for existing script to load
        existingScript.addEventListener('load', () => waitForFlexConstructor(), { once: true })
        existingScript.addEventListener('error', () => {
          reject(new Error('Failed to load existing Flex SDK script'))
        }, { once: true })
        return
      }

      // Create new script element
      Logger.info('[WebClient] Loading Flex SDK from:', clientLibrary)

      const script = document.createElement('script')
      script.src = clientLibrary
      script.async = true
      script.setAttribute('data-flex-sdk', 'true')

      if (clientLibraryIntegrity) {
        script.integrity = clientLibraryIntegrity
        script.crossOrigin = 'anonymous'
      }

      script.onload = () => {
        Logger.debug('[WebClient] Flex SDK script onload fired')
        waitForFlexConstructor()
      }

      script.onerror = (event) => {
        Logger.error('[WebClient] Failed to load Flex SDK:', event)
        flexLoadPromise = null
        reject(new Error(
          'Failed to load Flex SDK. Check network connection and script URL.'
        ))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * Remove the Flex SDK script from DOM
   */
  private removeFlexScript(): void {
    const scripts = document.querySelectorAll('script[data-flex-sdk="true"]')
    scripts.forEach(script => script.parentNode?.removeChild(script))

    // Also try to remove by URL if data attribute wasn't set
    if (loadedFlexScriptUrl) {
      const scriptByUrl = document.querySelector(`script[src="${loadedFlexScriptUrl}"]`)
      scriptByUrl?.parentNode?.removeChild(scriptByUrl)
    }

    // Clean up global
    delete (window as any).Flex
  }

  /**
   * Initialize Flex Microform for secure card collection
   */
  async setupFlexMicroform(
    containerId: string,
    captureContext: string,
    options?: FlexMicroformOptions
  ): Promise<FlexMicroformInstance> {
    // Decode capture context to get SDK URL
    const { clientLibrary, clientLibraryIntegrity } = decodeCaptureContext(captureContext)

    Logger.info('[WebClient] Setting up Flex Microform')
    Logger.debug('[WebClient] Client library:', clientLibrary)

    // Load the SDK
    await this.waitForLibrary(clientLibrary, clientLibraryIntegrity)

    // Verify Flex is available
    const FlexConstructor = (window as any).Flex
    if (typeof FlexConstructor !== 'function') {
      throw new Error(
        'Flex SDK not available after loading. Please try refreshing the page.'
      )
    }

    // Clean up existing microform if any
    if (this.flexMicroform) {
      this.flexMicroform.destroy()
      this.flexMicroform = null
    }

    // Create and initialize new microform
    this.flexMicroform = new FlexMicroform(containerId, captureContext, options)

    return this.flexMicroform.initialize()
  }

  /**
   * Collect device fingerprint data using hidden iframe
   */
  async collectDeviceData(
    deviceDataCollectionUrl: string,
    accessToken: string,
    options?: DeviceDataOptions
  ): Promise<{ success: boolean; timeout?: boolean }> {
    return this.deviceDataCollector.collect(
      deviceDataCollectionUrl,
      accessToken,
      options
    )
  }

  /**
   * Collect browser information for device fingerprinting
   */
  async collectBrowserInfo(ipAddress: string | null = null): Promise<DeviceInformation> {
    return collectBrowserInfo(ipAddress)
  }

  /**
   * Show challenge modal for 3DS authentication
   */
  async showChallengeModal(
    stepUpUrl: string,
    accessToken: string,
    options?: ChallengeModalOptions
  ): Promise<any> {
    return this.challengeModal.show(stepUpUrl, accessToken, options)
  }

  /**
   * Close challenge modal
   */
  closeChallengeModal(): void {
    this.challengeModal.close()
  }

  /**
   * Set custom styles for challenge modal
   */
  setModalStyles(styles: Partial<ModalStyles>): void {
    this.challengeModal.setStyles(styles)
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    Logger.info('[WebClient] Destroying...')

    this.deviceDataCollector.destroy()
    this.challengeModal.destroy()

    if (this.flexMicroform) {
      this.flexMicroform.destroy()
      this.flexMicroform = null
    }

    // Note: We don't remove the Flex script on destroy
    // to allow reuse. Call resetFlexSDK() if needed.

    Logger.info('[WebClient] Destroyed')
  }

  /**
   * Completely reset the Flex SDK state
   * Call this if you need to load a different SDK version
   */
  resetFlexSDK(): void {
    this.removeFlexScript()
    flexLoadPromise = null
    loadedFlexScriptUrl = null
    Logger.info('[WebClient] Flex SDK reset')
  }
}