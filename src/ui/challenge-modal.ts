import type { ChallengeModalOptions, AuthenticationResult, ModalStyles } from '../types'
import { getDefaultStyles, applyStyles } from './modal-styles'

export class ChallengeModal {
  private overlay: HTMLDivElement | null = null
  private modal: HTMLDivElement | null = null
  private iframe: HTMLIFrameElement | null = null
  private form: HTMLFormElement | null = null
  private messageListener: ((event: MessageEvent) => void) | null = null
  private customStyles: Partial<ModalStyles> = {}
  private currentReject: ((reason?: any) => void) | null = null

  /**
   * Show challenge modal
   */
  async show(
    stepUpUrl: string,
    accessToken: string,
    options?: ChallengeModalOptions
  ): Promise<AuthenticationResult> {
    return new Promise((resolve, reject) => {
      this.currentReject = reject
      console.log('🔐 Showing challenge modal...')

      const timeout = options?.timeout || 10 * 60 * 1000 // 10 minutes
      const styles = { ...getDefaultStyles(), ...this.customStyles }

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

      // Create form
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

      // Listen for postMessage
      this.messageListener = (event: MessageEvent) => {
        console.log('📩 Received postMessage:', event.data)

        const msgType = options?.completionMessageType || '3DS_COMPLETE'
        const txnId = options?.transactionId

        if (event.data && (event.data.type === msgType || event.data.type === '3DS_CHALLENGE_COMPLETE')) {
          // If transactionId is provided, ensure it matches
          if (txnId && event.data.transactionId && event.data.transactionId !== txnId) {
            console.log(`[ChallengeModal] Ignoring message for different transaction: ${event.data.transactionId}`)
            return
          }

          console.log('✅ 3DS Challenge complete')

          window.removeEventListener('message', this.messageListener!)
          this.currentReject = null
          this.cleanup()
          resolve({
            success: event.data.success !== false,
            result: event.data.result,
            authTransactionId: event.data.authTransactionId || event.data.transactionId
          })
        }
      }

      window.addEventListener('message', this.messageListener)

      // Submit form
      console.log('📤 Submitting challenge form')
      this.form.submit()

      // Timeout
      const timeoutId = setTimeout(() => {
        console.error('❌ Challenge timeout')
        window.removeEventListener('message', this.messageListener!)
        this.currentReject = null
        this.cleanup()
        reject(new Error('Challenge timeout'))
      }, timeout)
    })
  }

  /**
   * Close challenge modal manually
   */
  close(): void {
    if (this.currentReject) {
      this.currentReject(new Error('Challenge modal closed manually'))
      this.currentReject = null
    }
    this.cleanup()
  }

  /**
   * Set custom styles
   */
  setStyles(styles: Partial<ModalStyles>): void {
    this.customStyles = styles
  }

  /**
   * Clean up modal
   */
  cleanup(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener)
      this.messageListener = null
    }

    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.overlay = null
    this.modal = null
    this.iframe = null

    if (this.form?.parentNode) {
      this.form.parentNode.removeChild(this.form)
    }
    this.form = null
  }

  /**
   * Destroy modal
   */
  destroy(): void {
    this.cleanup()
  }
}
