import type { FlexMicroformOptions, FlexMicroformInstance, FlexTokenizeResult, FlexFieldStyles } from '../types'

export class FlexMicroform {
  private microform: any = null
  private fields: Map<string, any> = new Map()
  private containerId: string
  private captureContext: string
  private options: FlexMicroformOptions

  constructor(
    containerId: string,
    captureContext: string,
    options?: FlexMicroformOptions
  ) {
    this.containerId = containerId
    this.captureContext = captureContext
    this.options = options || {}
  }

  /**
   * Initialize Flex Microform
   */
  async initialize(): Promise<FlexMicroformInstance> {
    return new Promise((resolve, reject) => {
      const FLEX_SDK = (window as any).FLEX || (window as any).Flex

      if (!FLEX_SDK) {
        const error = new Error(
          'Flex SDK not loaded. Ensure you have included the Cybersource Flex Microform script tag in your HTML.'
        )
        reject(error)
        return
      }

      const container = document.getElementById(this.containerId)
      if (!container) {
        reject(new Error(`Container #${this.containerId} not found`))
        return
      }

      // Create field containers
      this.createFieldContainers(container)

      const setupFields = (instance: any) => {
        this.microform = instance

        // Only create card number and CVV fields (Flex v2 'card' microform limitation)
        this.createField('cardNumber', 'number', 'flex-card-number')
        this.createField('securityCode', 'securityCode', 'flex-security-code')

        console.log('✅ Flex Microform initialized')

        resolve({
          tokenize: (expiryMonth: string, expiryYear: string) =>
            this.tokenize(expiryMonth, expiryYear),
          on: (event: string, callback: Function) => this.on(event, callback),
          destroy: () => this.destroy()
        })
      }

      try {
        if (typeof FLEX_SDK === 'function') {
          console.log('Detected Flex v2 (Constructor style)')
          const flexInstance = new FLEX_SDK(this.captureContext)

          if (typeof flexInstance.microform === 'function') {
            const microformInstance = flexInstance.microform('card')
            setupFields(microformInstance)
          } else {
            reject(new Error('Flex v2 instance missing microform() method'))
          }
        } else if (typeof FLEX_SDK.microform === 'function') {
          console.log('Detected Flex v1 (Method style)')
          const setupOptions = {
            keyId: this.captureContext,
            encryptionType: 'RsaOaep256',
            targetOrigin: window.location.origin,
            ...this.options.flexOptions
          }
          FLEX_SDK.microform(setupOptions, (setupError: any, setupInstance: any) => {
            if (setupError) {
              reject(new Error(`Flex setup failed: ${setupError.message}`))
              return
            }
            setupFields(setupInstance)
          })
        } else {
          reject(new Error('Flex SDK loaded but unrecognized API version'))
        }
      } catch (err: any) {
        reject(new Error(`Flex initialization failed: ${err.message}`))
      }
    })
  }

  /**
   * Create field containers with layout
   */
  private createFieldContainers(container: HTMLElement): void {
    const layout = this.options.layout || 'stacked'
    const customStyles = this.options.customStyles || {}

    // Default styles
    const defaultStyles = {
      labelFontSize: '14px',
      labelFontWeight: '500',
      labelColor: '#374151',
      labelMarginBottom: '6px',
      borderColor: '#d1d5db',
      borderRadius: '6px',
      inputPadding: '11px 12px',
      backgroundColor: '#ffffff',
      inputHeight: '42px',
      fontSize: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      textColor: '#1a1a1a',
      focusColor: '#1a1a1a',
      focusBorderColor: '#4f46e5',
      focusShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)',
      errorColor: '#dc2626',
      errorFontSize: '12px',
      errorMarginTop: '4px'
    }

    // Merge with custom styles
    const styles = { ...defaultStyles, ...customStyles }

    const labelStyles = `
      display: block;
      margin-bottom: ${styles.labelMarginBottom};
      font-size: ${styles.labelFontSize};
      font-weight: ${styles.labelFontWeight};
      color: ${styles.labelColor};
    `.trim()

    const inputContainerStyles = `
      border: 1px solid ${styles.borderColor};
      border-radius: ${styles.borderRadius};
      padding: ${styles.inputPadding};
      background-color: ${styles.backgroundColor};
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
      height: ${styles.inputHeight};
      box-sizing: border-box;
      display: flex;
      align-items: center;
    `.trim()

    const errorStyles = `
      display: none;
      margin-top: ${styles.errorMarginTop};
      font-size: ${styles.errorFontSize};
      color: ${styles.errorColor};
    `.trim()

    if (layout === 'inline') {
      // Inline layout: Card number and CVV side by side
      container.innerHTML = `
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div style="flex: 3; min-width: 200px;">
            <label for="flex-card-number" style="${labelStyles}">${this.options.labels?.cardNumber || 'Card Number'}</label>
            <div id="flex-card-number" class="flex-field-container" style="${inputContainerStyles}"></div>
            <div id="error-card-number" style="${errorStyles}"></div>
          </div>
          <div style="flex: 1; min-width: 100px;">
            <label for="flex-security-code" style="${labelStyles}">${this.options.labels?.securityCode || 'CVV'}</label>
            <div id="flex-security-code" class="flex-field-container" style="${inputContainerStyles}"></div>
            <div id="error-security-code" style="${errorStyles}"></div>
          </div>
        </div>
      `
    } else {
      // Stacked layout: Card number on top, CVV below
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label for="flex-card-number" style="${labelStyles}">${this.options.labels?.cardNumber || 'Card Number'}</label>
            <div id="flex-card-number" class="flex-field-container" style="${inputContainerStyles}"></div>
            <div id="error-card-number" style="${errorStyles}"></div>
          </div>
          <div>
            <label for="flex-security-code" style="${labelStyles}">${this.options.labels?.securityCode || 'Security Code'}</label>
            <div id="flex-security-code" class="flex-field-container" style="${inputContainerStyles}"></div>
            <div id="error-security-code" style="${errorStyles}"></div>
          </div>
        </div>
      `
    }

    // Add focus styles dynamically
    const styleElement = document.createElement('style')
    styleElement.textContent = `
      .flex-field-container:focus-within {
        border-color: ${styles.focusBorderColor} !important;
        box-shadow: ${styles.focusShadow};
      }
    `
    document.head.appendChild(styleElement)
  }

  /**
   * Create individual field
   */
  private createField(fieldType: string, flexFieldType: string, containerId: string): void {
    try {
      const customStyles = this.options.customStyles || {}

      const field = this.microform.createField(flexFieldType, {
        placeholder: this.options.placeholders?.[fieldType as keyof NonNullable<FlexMicroformOptions['placeholders']>] || '',
        styles: {
          input: {
            'font-size': customStyles.fontSize || '16px',
            'font-family': customStyles.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            'color': customStyles.textColor || '#1a1a1a',
            'line-height': '1.5'
          },
          ':focus': {
            'color': customStyles.focusColor || '#1a1a1a'
          },
          ':disabled': {
            'cursor': 'not-allowed',
            'opacity': '0.6'
          },
          valid: {
            'color': customStyles.validColor || '#059669'
          },
          invalid: {
            'color': customStyles.invalidColor || '#dc2626'
          }
        }
      })

      field.load(`#${containerId}`)

      // Add event listeners
      field.on('change', (data: any) => {
        this.handleFieldChange(fieldType, data)
      })

      this.fields.set(fieldType, field)
    } catch (err: any) {
      console.error(`Could not create field "${fieldType}":`, err)
      throw err
    }
  }

  /**
   * Handle field changes
   */
  private handleFieldChange(fieldType: string, data: any): void {
    const errorContainer = document.getElementById(`error-${fieldType.replace(/([A-Z])/g, '-$1').toLowerCase()}`)

    if (!errorContainer) return

    if (data.valid) {
      errorContainer.textContent = ''
      errorContainer.style.display = 'none'
    } else if (data.error) {
      errorContainer.textContent = data.error.message || 'Invalid'
      errorContainer.style.display = 'block'
    }

    // Call custom onChange handler if provided
    if (this.options.onFieldChange) {
      this.options.onFieldChange(fieldType, data)
    }
  }

  /**
   * Tokenize card data
   * Requires expiry month and year as parameters
   */
  async tokenize(expiryMonth: string, expiryYear: string): Promise<FlexTokenizeResult> {
    return new Promise((resolve, reject) => {
      if (!this.microform) {
        reject(new Error('Microform not initialized'))
        return
      }

      // Validate expiry
      if (!expiryMonth || !expiryYear) {
        reject(new Error('Expiry month and year are required'))
        return
      }

      // Ensure 2-digit month
      const month = expiryMonth.padStart(2, '0')

      // Handle 2-digit or 4-digit year
      let year = expiryYear
      if (year.length === 2) {
        const currentYear = new Date().getFullYear()
        const currentCentury = Math.floor(currentYear / 100) * 100
        year = (currentCentury + parseInt(year)).toString()
      }

      const options = {
        expirationMonth: month,
        expirationYear: year
      }

      this.microform.createToken(options, (error: any, token: string) => {
        if (error) {
          console.error('Tokenization error:', error)
          reject(new Error(`Tokenization failed: ${error.message || JSON.stringify(error)}`))
          return
        }

        // Decode JWT to extract metadata
        const tokenData = this.decodeToken(token)

        resolve({
          token,
          maskedPan: tokenData.maskedPan,
          cardType: tokenData.cardType,
          expiryMonth: month,
          expiryYear: year
        })
      })
    })
  }

  /**
   * Decode JWT token to extract card metadata
   * 
   * JWT Structure:
   * - Header: { kid, alg }
   * - Payload: { 
   *     content: { 
   *       paymentInformation: { 
   *         card: { 
   *           number: { bin, suffix },
   *           type: { name }
   *         }
   *       }
   *     }
   *   }
   * - Signature
   */
  private decodeToken(token: string): { maskedPan: string; cardType: string } {
    try {
      // JWT structure: header.payload.signature
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.warn('Invalid JWT structure')
        return { maskedPan: '************', cardType: 'unknown' }
      }

      // Decode payload (base64url)
      const payload = parts[1]

      // Base64url to Base64: replace - with + and _ with /
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')

      // Add padding if needed
      const padded = base64 + '=='.substring(0, (4 - base64.length % 4) % 4)

      // Decode
      const decoded = JSON.parse(atob(padded))

      // Extract card data from Flex payload structure
      const content = decoded?.content
      const paymentInfo = content?.paymentInformation
      const card = paymentInfo?.card
      const cardNumber = card?.number
      const cardTypeInfo = card?.type

      // Build masked PAN
      let maskedPan = '************'
      if (cardNumber) {
        const bin = cardNumber.bin || ''
        const suffix = cardNumber.suffix || ''

        if (bin && suffix) {
          maskedPan = `${bin}******${suffix}`
        } else if (bin) {
          maskedPan = `${bin}**********`
        } else if (suffix) {
          maskedPan = `**********${suffix}`
        }
      }

      // Get card type
      let cardType = 'unknown'
      if (cardNumber?.detectedCardTypes && cardNumber.detectedCardTypes.length > 0) {
        cardType = cardNumber.detectedCardTypes[0].toLowerCase()
      } else if (cardTypeInfo?.name) {
        cardType = cardTypeInfo.name.toLowerCase()
      }

      return {
        maskedPan,
        cardType
      }
    } catch (err) {
      console.error('Could not decode token:', err)
      return { maskedPan: '************', cardType: 'unknown' }
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    this.fields.forEach((field) => {
      field.on(event, callback)
    })
  }

  /**
   * Destroy microform
   */
  destroy(): void {
    this.fields.forEach((field) => field.remove())
    this.fields.clear()
    this.microform = null
  }
}