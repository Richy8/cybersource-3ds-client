import { DeviceDataCollector } from './ui/device-data-collector'
import { collectBrowserInfo } from './ui/browser-info-collector'
import { ChallengeModal } from './ui/challenge-modal'
import { FlexMicroform } from './ui/flex-microform'
import type {
  DeviceDataOptions,
  ChallengeModalOptions,
  AuthenticationResult,
  ModalStyles,
  FlexMicroformOptions,
  FlexMicroformInstance,
  DeviceInformation
} from './types'

export class WebClient {
  private deviceDataCollector: DeviceDataCollector
  private challengeModal: ChallengeModal
  private flexMicroform: FlexMicroform | null = null

  constructor() {
    this.deviceDataCollector = new DeviceDataCollector()
    this.challengeModal = new ChallengeModal()
  }

  /**
   * Helper to wait for the Flex Microform library to load
   */
  async waitForLibrary(maxRetries: number = 50, interval: number = 100): Promise<void> {
    let retries = 0
    while (!((window as any).FLEX || (window as any).Flex) && retries < maxRetries) {
      await new Promise(r => setTimeout(r, interval))
      retries++
    }

    if (!((window as any).FLEX || (window as any).Flex)) {
      throw new Error('Flex SDK failed to load. Please check your browser console for network errors.')
    }
  }

  /**
   * Initialize Flex Microform for secure card collection
   * 
   * @example
   * const flex = await client.setupFlexMicroform(
   *   'card-container',
   *   captureContext,
   *   {
   *     layout: 'inline',
   *     customStyles: {
   *       borderRadius: '8px',
   *       borderColor: '#e5e7eb'
   *     }
   *   }
   * )
   * 
   * // Later tokenize
   * const { token } = await flex.tokenize()
   */
  async setupFlexMicroform(
    containerId: string,
    captureContext: string,
    options?: FlexMicroformOptions
  ): Promise<FlexMicroformInstance> {
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
   * Show challenge modal for OTP authentication
   */
  async showChallengeModal(
    stepUpUrl: string,
    accessToken: string,
    options?: ChallengeModalOptions
  ): Promise<AuthenticationResult> {
    return this.challengeModal.show(stepUpUrl, accessToken, options)
  }

  /**
   * Close challenge modal manually
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
   * Clean up resources
   */
  destroy(): void {
    this.deviceDataCollector.destroy()
    this.challengeModal.destroy()
    if (this.flexMicroform) {
      this.flexMicroform.destroy()
    }
  }
}
