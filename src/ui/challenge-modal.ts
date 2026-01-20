import type { ChallengeModalOptions, ModalStyles } from '../types'
import { getDefaultStyles, applyStyles } from './modal-styles'
import { Logger } from '../utils'

export class ChallengeModal {
  private overlay: HTMLDivElement | null = null
  private modal: HTMLDivElement | null = null
  private iframe: HTMLIFrameElement | null = null
  private form: HTMLFormElement | null = null
  private messageListener: ((event: MessageEvent) => void) | null = null
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private customStyles: Partial<ModalStyles> = {}
  private isResolved: boolean = false
  // rejectPromise is used to cancel the promise if the modal is closed manually
  private rejectPromise: ((reason?: any) => void) | null = null

  /**
   * Show challenge modal and wait for completion
   * Returns a promise that resolves when 3DS challenge completes
   */
  async show(
    stepUpUrl: string,
    accessToken: string,
    options?: ChallengeModalOptions
  ): Promise<any> {
    // Reset state
    this.isResolved = false

    return new Promise((resolve, reject) => {
      this.rejectPromise = reject

      Logger.info('🔐 Showing challenge modal...')

      const timeout = options?.timeout || 10 * 60 * 1000 // 10 minutes
      const styles = { ...getDefaultStyles(), ...this.customStyles }
      const expectedMessageType = options?.completionMessageType || '3DS_COMPLETE'
      const expectedTransactionId = options?.transactionId

      // Helper to safely resolve only once
      const safeResolve = (result: any) => {
        if (this.isResolved) return
        this.isResolved = true
        this.cleanup()
        resolve(result)
      }

      // Helper to safely reject only once
      const safeReject = (error: Error) => {
        if (this.isResolved) return
        this.isResolved = true
        this.cleanup()
        reject(error)
      }

      try {
        // Create overlay
        this.overlay = document.createElement('div')
        this.overlay.id = 'threeds-modal-overlay'
        applyStyles(this.overlay, styles.overlay)
        document.body.appendChild(this.overlay)

        // Create modal container
        this.modal = document.createElement('div')
        this.modal.id = 'threeds-modal'
        applyStyles(this.modal, styles.modal)

        // Create header
        const header = document.createElement('div')
        applyStyles(header, styles.header)
        header.innerHTML = `
          <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🔒 Card Authentication</h2>
          <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Please complete verification with your bank</p>
        `

        // Create iframe container
        const iframeContainer = document.createElement('div')
        applyStyles(iframeContainer, styles.iframeContainer)

        // Create iframe
        this.iframe = document.createElement('iframe')
        this.iframe.id = 'step_up_iframe'
        this.iframe.name = 'stepUpIframe'
        applyStyles(this.iframe, styles.iframe)

        iframeContainer.appendChild(this.iframe)

        // Create footer
        const footer = document.createElement('div')
        applyStyles(footer, styles.footer)
        footer.innerHTML = '<p style="margin: 0;">Secured by 3D Secure 2.0</p>'

        // Assemble modal
        this.modal.appendChild(header)
        this.modal.appendChild(iframeContainer)
        this.modal.appendChild(footer)
        this.overlay.appendChild(this.modal)

        // Create form for step-up
        this.form = document.createElement('form')
        this.form.id = 'step_up_form'
        this.form.method = 'POST'
        this.form.action = stepUpUrl
        this.form.target = 'stepUpIframe'
        this.form.style.display = 'none'

        const jwtInput = document.createElement('input')
        jwtInput.type = 'hidden'
        jwtInput.name = 'JWT'
        jwtInput.value = accessToken

        this.form.appendChild(jwtInput)
        document.body.appendChild(this.form)

        // Set up message listener
        this.messageListener = (event: MessageEvent) => {
          // Skip if already resolved
          if (this.isResolved) return

          const data = event.data

          // Validate message structure
          if (!data || typeof data !== 'object') return

          // Check message type
          const isValidType = data.type === expectedMessageType || data.type === '3DS_CHALLENGE_COMPLETE'
          if (!isValidType) return

          Logger.debug('📩 Received 3DS message:', data)

          // Validate transaction ID if provided
          if (expectedTransactionId && data.transactionId && data.transactionId !== expectedTransactionId) {
            Logger.debug(`[ChallengeModal] Ignoring message for different transaction: ${data.transactionId}`)
            return
          }

          Logger.info('✅ 3DS Challenge complete')

          // Resolve with the result - passing raw data to follow "no pre-typed structure" request
          safeResolve(data)
        }

        window.addEventListener('message', this.messageListener)

        // Set up timeout
        this.timeoutId = setTimeout(() => {
          Logger.error('❌ Challenge timeout')
          safeReject(new Error('Challenge timed out. Please try again.'))
        }, timeout)

        // Submit form to initiate challenge
        Logger.debug('📤 Submitting challenge form to:', stepUpUrl)
        this.form.submit()

      } catch (err: any) {
        safeReject(err)
      }
    })
  }

  /**
   * Close the modal manually
   */
  close(): void {
    Logger.debug('🔒 Closing challenge modal')

    if (!this.isResolved) {
      // If manually closing and promise exists, reject it to prevent hanging
      if (this.rejectPromise) {
        this.rejectPromise(new Error('Challenge closed manually'))
      }
      this.isResolved = true
    }

    this.cleanup()
  }

  /**
   * Set custom styles for the modal
   */
  setStyles(styles: Partial<ModalStyles>): void {
    this.customStyles = styles
  }

  /**
   * Clean up all modal elements and listeners
   */
  private cleanup(): void {
    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    // Remove message listener
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener)
      this.messageListener = null
    }

    // Remove overlay (contains modal)
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.overlay = null
    this.modal = null
    this.iframe = null

    // Remove form
    if (this.form?.parentNode) {
      this.form.parentNode.removeChild(this.form)
    }
    this.form = null


    this.rejectPromise = null
  }

  /**
   * Destroy the modal instance completely
   */
  destroy(): void {
    if (!this.isResolved && this.rejectPromise) {
      this.rejectPromise(new Error('ChallengeModal destroyed'))
    }
    this.isResolved = true
    this.cleanup()
  }
}
