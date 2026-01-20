import type { DeviceDataOptions } from '../types'
import { Logger } from '../utils'

export class DeviceDataCollector {
  private iframe: HTMLIFrameElement | null = null
  private form: HTMLFormElement | null = null
  private messageListener: ((event: MessageEvent) => void) | null = null

  /**
   * Collect device data using Cardinal Commerce iframe
   */
  async collect(
    deviceDataCollectionUrl: string,
    accessToken: string,
    options?: DeviceDataOptions
  ): Promise<{ success: boolean; timeout?: boolean }> {
    return new Promise((resolve) => {
      Logger.info('📱 Starting device data collection...')

      const timeout = options?.timeout || 10000

      // Create hidden iframe
      this.iframe = document.createElement('iframe')
      this.iframe.id = 'cardinal_collection_iframe'
      this.iframe.name = 'collectionIframe'
      this.iframe.width = '10'
      this.iframe.height = '10'
      this.iframe.style.display = 'none'
      document.body.appendChild(this.iframe)

      // Create form
      this.form = document.createElement('form')
      this.form.id = 'cardinal_collection_form'
      this.form.method = 'POST'
      this.form.action = deviceDataCollectionUrl
      this.form.target = 'collectionIframe'

      const jwtInput = document.createElement('input')
      jwtInput.type = 'hidden'
      jwtInput.name = 'JWT'
      jwtInput.value = accessToken

      this.form.appendChild(jwtInput)
      document.body.appendChild(this.form)

      // Listen for postMessage from Cardinal
      this.messageListener = (event: MessageEvent) => {
        if (
          event.origin.includes('cardinalcommerce.com') ||
          event.origin.includes('centinelapi')
        ) {
          Logger.debug('✅ Device data collection complete:', event.data)
          this.cleanup()
          resolve({ success: true })
        }
      }
      window.addEventListener('message', this.messageListener)

      // Timeout
      const timeoutId = setTimeout(() => {
        Logger.warn('⏱️ Device data collection timeout - proceeding')
        this.cleanup()
        resolve({ success: true, timeout: true })
      }, timeout)

      // Submit form
      this.form.submit()
    })
  }

  /**
   * Clean up DOM elements and listeners
   */
  cleanup(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener)
      this.messageListener = null
    }

    if (this.form?.parentNode) {
      this.form.parentNode.removeChild(this.form)
    }
    this.form = null

    if (this.iframe?.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }
    this.iframe = null
  }

  /**
   * Destroy collector
   */
  destroy(): void {
    this.cleanup()
  }
}
