import type {
  FlexMicroformOptions,
  FlexMicroformInstance,
  FlexTokenizeResult
} from '../types'

export class FlexMicroform {
  private microform: any = null
  private flex: any = null
  private fields: Map<string, any> = new Map()
  private styleElement: HTMLStyleElement | null = null
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
   * Initialize Flex Microform (Flex v2)
   */
  async initialize(): Promise<FlexMicroformInstance> {
    const timeoutMs = this.options.timeoutMs ?? 15000
    const abortSignal = this.options.abortSignal

    return this.withTimeout(
      this.doInitialize(),
      timeoutMs,
      abortSignal
    )
  }

  /**
   * Actual initialization logic (separated for cleaner async handling)
   */
  private async doInitialize(): Promise<FlexMicroformInstance> {
    if (this.options.abortSignal?.aborted) {
      throw this.createAbortError()
    }

    const FlexConstructor = (window as any).Flex

    if (typeof FlexConstructor !== 'function') {
      throw new Error(
        'Flex SDK not available. Ensure the Flex script is loaded before initialization.'
      )
    }

    const container = document.getElementById(this.containerId)
    if (!container) {
      throw new Error(`Container #${this.containerId} not found in DOM`)
    }

    // Create DOM containers for fields
    this.createFieldContainers(container)

    // Wait for DOM to update
    await this.waitForDom()

    // Verify containers were created
    const cardContainer = document.getElementById('flex-card-number')
    const cvvContainer = document.getElementById('flex-security-code')

    if (!cardContainer || !cvvContainer) {
      throw new Error('Failed to create field containers')
    }

    console.log('[FlexMicroform] Initializing Flex v2...')

    try {
      // Instantiate Flex with capture context (JWT)
      this.flex = new FlexConstructor(this.captureContext)
    } catch (err: any) {
      throw new Error(`Failed to create Flex instance: ${err.message}. Check if capture context is valid and not expired.`)
    }

    if (typeof this.flex.microform !== 'function') {
      throw new Error(
        'Flex instance missing microform() method. This may indicate an incompatible SDK version.'
      )
    }

    // Create Microform instance - NO ARGUMENTS for v2
    try {
      this.microform = this.flex.microform()
    } catch (err: any) {
      throw new Error(`Failed to create microform: ${err.message}`)
    }

    // Create and load fields
    await this.createFields()

    console.log('[FlexMicroform] ✅ Initialization complete')

    return {
      tokenize: (expiryMonth: string, expiryYear: string) =>
        this.tokenize(expiryMonth, expiryYear),
      on: (event: string, callback: Function) => this.on(event, callback),
      destroy: () => this.destroy(),
      isValid: () => this.isValid()
    }
  }

  /**
   * Wait for DOM to update after innerHTML manipulation
   */
  private waitForDom(): Promise<void> {
    return new Promise(resolve => {
      // Use requestAnimationFrame for more reliable DOM update detection
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve()
        })
      })
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
      inputPadding: '0 12px',
      backgroundColor: '#ffffff',
      inputHeight: '44px',
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

    // Important: The container needs specific styles for the iframe to render properly
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
      position: relative;
    `.trim()

    const errorStyles = `
      display: none;
      margin-top: ${styles.errorMarginTop};
      font-size: ${styles.errorFontSize};
      color: ${styles.errorColor};
    `.trim()

    const cardLabel = this.options.labels?.cardNumber || 'Card Number'
    const cvvLabel = this.options.labels?.securityCode || 'Security Code'

    if (layout === 'inline') {
      container.innerHTML = `
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div style="flex: 3; min-width: 200px;">
            <label for="flex-card-number" style="${labelStyles}">${cardLabel}</label>
            <div id="flex-card-number" class="flex-field-container" style="${inputContainerStyles}"></div>
            <div id="error-card-number" class="flex-error" style="${errorStyles}"></div>
          </div>
          <div style="flex: 1; min-width: 100px;">
            <label for="flex-security-code" style="${labelStyles}">${cvvLabel}</label>
            <div id="flex-security-code" class="flex-field-container" style="${inputContainerStyles}"></div>
            <div id="error-security-code" class="flex-error" style="${errorStyles}"></div>
          </div>
        </div>
      `
    } else {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label for="flex-card-number" style="${labelStyles}">${cardLabel}</label>
            <div id="flex-card-number" class="flex-field-container" style="${inputContainerStyles}"></div>
            <div id="error-card-number" class="flex-error" style="${errorStyles}"></div>
          </div>
          <div>
            <label for="flex-security-code" style="${labelStyles}">${cvvLabel}</label>
            <div id="flex-security-code" class="flex-field-container" style="${inputContainerStyles}"></div>
            <div id="error-security-code" class="flex-error" style="${errorStyles}"></div>
          </div>
        </div>
      `
    }

    // Add focus styles dynamically
    this.styleElement = document.createElement('style')
    this.styleElement.setAttribute('data-flex-microform', 'true')
    this.styleElement.textContent = `
      .flex-field-container {
        min-height: 44px;
      }
      .flex-field-container iframe {
        height: 100% !important;
      }
      .flex-field-container:focus-within {
        border-color: ${styles.focusBorderColor} !important;
        box-shadow: ${styles.focusShadow};
        outline: none;
      }
      .flex-field-container.flex-field-invalid {
        border-color: ${styles.errorColor} !important;
      }
    `
    document.head.appendChild(this.styleElement)
  }

  /**
   * Create and load all fields
   */
  private async createFields(): Promise<void> {
    const customStyles = this.options.customStyles || {}

    // Styles passed to Flex SDK (for iframe content)
    const fieldStyles = {
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
        'color': customStyles.validColor || customStyles.textColor || '#1a1a1a'
      },
      invalid: {
        'color': customStyles.invalidColor || '#dc2626'
      }
    }

    // Create card number field
    const cardNumberField = this.microform.createField('number', {
      placeholder: this.options.placeholders?.cardNumber || '',
      styles: fieldStyles
    })

    // Create security code field
    const securityCodeField = this.microform.createField('securityCode', {
      placeholder: this.options.placeholders?.securityCode || '',
      styles: fieldStyles
    })

    // Load fields into containers
    await Promise.all([
      this.loadField(cardNumberField, 'flex-card-number', 'cardNumber'),
      this.loadField(securityCodeField, 'flex-security-code', 'securityCode')
    ])
  }

  /**
   * Load a single field and set up event listeners
   */
  private loadField(
    field: any,
    containerId: string,
    fieldType: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const container = document.getElementById(containerId)

      if (!container) {
        reject(new Error(`Container #${containerId} not found`))
        return
      }

      // Set up event listeners before loading
      field.on('load', () => {
        console.log(`[FlexMicroform] Field "${fieldType}" loaded`)
        this.fields.set(fieldType, field)
        resolve()
      })

      field.on('error', (data: any) => {
        console.error(`[FlexMicroform] Field "${fieldType}" error:`, data)
        reject(new Error(`Failed to load field "${fieldType}": ${data?.message || 'Unknown error'}`))
      })

      field.on('change', (data: any) => {
        this.handleFieldChange(fieldType, containerId, data)
      })

      // Load the field
      try {
        field.load(`#${containerId}`)
      } catch (err: any) {
        reject(new Error(`Failed to load field "${fieldType}": ${err.message}`))
      }
    })
  }

  /**
   * Handle field change events
   */
  private handleFieldChange(
    fieldType: string,
    containerId: string,
    data: any
  ): void {
    const container = document.getElementById(containerId)
    const errorId = containerId.replace('flex-', 'error-')
    const errorContainer = document.getElementById(errorId)

    // Update container styling
    if (container) {
      if (data.valid) {
        container.classList.remove('flex-field-invalid')
      } else if (data.touched && !data.valid) {
        container.classList.add('flex-field-invalid')
      }
    }

    // Update error message
    if (errorContainer) {
      if (data.valid || !data.touched) {
        errorContainer.textContent = ''
        errorContainer.style.display = 'none'
      } else if (!data.valid && data.touched) {
        const errorMessage = this.getErrorMessage(fieldType, data)
        errorContainer.textContent = errorMessage
        errorContainer.style.display = 'block'
      }
    }

    // Call custom onChange handler if provided
    if (this.options.onFieldChange) {
      this.options.onFieldChange(fieldType, data)
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(fieldType: string, data: any): string {
    if (data.empty) {
      return fieldType === 'cardNumber'
        ? 'Card number is required'
        : 'Security code is required'
    }

    if (!data.valid) {
      return fieldType === 'cardNumber'
        ? 'Please enter a valid card number'
        : 'Please enter a valid security code'
    }

    return 'Invalid input'
  }

  /**
   * Check if all fields are valid
   */
  isValid(): boolean {
    let allValid = true
    this.fields.forEach((field) => {
      // Note: Flex SDK doesn't expose a direct isValid method
      // This is a best-effort check based on field state
      if (field.valid === false) {
        allValid = false
      }
    })
    return allValid
  }

  /**
   * Tokenize card data
   */
  async tokenize(
    expiryMonth: string,
    expiryYear: string
  ): Promise<FlexTokenizeResult> {
    const timeoutMs = this.options.timeoutMs ?? 15000
    const abortSignal = this.options.abortSignal

    return this.withTimeout(
      this.doTokenize(expiryMonth, expiryYear),
      timeoutMs,
      abortSignal
    )
  }

  /**
   * Actual tokenization logic
   */
  private doTokenize(
    expiryMonth: string,
    expiryYear: string
  ): Promise<FlexTokenizeResult> {
    return new Promise((resolve, reject) => {
      if (!this.microform) {
        reject(new Error('Microform not initialized. Call initialize() first.'))
        return
      }

      // Validate expiry inputs
      if (!expiryMonth || !expiryYear) {
        reject(new Error('Expiry month and year are required'))
        return
      }

      // Normalize month to 2 digits
      const month = expiryMonth.toString().padStart(2, '0')

      // Normalize year to 4 digits
      let year = expiryYear.toString()
      if (year.length === 2) {
        const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100
        year = (currentCentury + parseInt(year, 10)).toString()
      }

      // Validate month range
      const monthNum = parseInt(month, 10)
      if (monthNum < 1 || monthNum > 12) {
        reject(new Error('Invalid expiry month. Must be between 01 and 12.'))
        return
      }

      // Validate year is not in the past
      const currentYear = new Date().getFullYear()
      const yearNum = parseInt(year, 10)
      if (yearNum < currentYear) {
        reject(new Error('Card has expired. Please use a valid card.'))
        return
      }

      const options = {
        expirationMonth: month,
        expirationYear: year
      }

      console.log('[FlexMicroform] Tokenizing with options:', options)

      this.microform.createToken(options, (error: any, token: string) => {
        if (error) {
          console.error('[FlexMicroform] Tokenization error:', error)

          // Provide more helpful error messages
          let errorMessage = 'Tokenization failed'

          if (error.reason === 'CREATE_TOKEN_VALIDATION_FIELDS') {
            errorMessage = 'Please check your card details and try again'
          } else if (error.reason === 'CREATE_TOKEN_TIMEOUT') {
            errorMessage = 'Request timed out. Please try again.'
          } else if (error.message) {
            errorMessage = error.message
          } else if (typeof error === 'string') {
            errorMessage = error
          }

          reject(new Error(errorMessage))
          return
        }

        if (!token) {
          reject(new Error('No token received from CyberSource'))
          return
        }

        console.log('[FlexMicroform] ✅ Token created successfully')

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
   */
  private decodeToken(token: string): { maskedPan: string; cardType: string } {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.warn('[FlexMicroform] Invalid JWT structure')
        return { maskedPan: '••••••••••••', cardType: 'unknown' }
      }

      const payload = parts[1]
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64 + '=='.substring(0, (4 - base64.length % 4) % 4)
      const decoded = JSON.parse(atob(padded))

      const content = decoded?.content
      const paymentInfo = content?.paymentInformation
      const card = paymentInfo?.card
      const cardNumber = card?.number
      const cardTypeInfo = card?.type

      // Build masked PAN
      let maskedPan = '••••••••••••'
      if (cardNumber) {
        const bin = cardNumber.bin || ''
        const suffix = cardNumber.suffix || ''

        if (bin && suffix) {
          maskedPan = `${bin}••••••${suffix}`
        } else if (bin) {
          maskedPan = `${bin}••••••••`
        } else if (suffix) {
          maskedPan = `••••••••${suffix}`
        }
      }

      // Get card type
      let cardType = 'unknown'
      if (cardNumber?.detectedCardTypes?.length > 0) {
        cardType = cardNumber.detectedCardTypes[0].toLowerCase()
      } else if (cardTypeInfo?.name) {
        cardType = cardTypeInfo.name.toLowerCase()
      }

      return { maskedPan, cardType }
    } catch (err) {
      console.warn('[FlexMicroform] Could not decode token:', err)
      return { maskedPan: '••••••••••••', cardType: 'unknown' }
    }
  }

  /**
   * Add event listener to all fields
   */
  on(event: string, callback: Function): void {
    this.fields.forEach((field, fieldType) => {
      field.on(event, (data: any) => callback({ ...data, fieldType }))
    })
  }

  /**
   * Create an AbortError
   */
  private createAbortError(): Error {
    const error = new Error('Flex operation aborted')
    error.name = 'AbortError'
    return error
  }

  /**
   * Wrap promise with timeout and abort signal handling
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let settled = false

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        reject(new Error('Flex operation timed out'))
      }, timeoutMs)

      const onAbort = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(this.createAbortError())
      }

      const cleanup = () => {
        clearTimeout(timer)
        abortSignal?.removeEventListener('abort', onAbort)
      }

      if (abortSignal) {
        if (abortSignal.aborted) {
          cleanup()
          reject(this.createAbortError())
          return
        }
        abortSignal.addEventListener('abort', onAbort, { once: true })
      }

      promise
        .then((res) => {
          if (settled) return
          settled = true
          cleanup()
          resolve(res)
        })
        .catch((err) => {
          if (settled) return
          settled = true
          cleanup()
          reject(err)
        })
    })
  }

  /**
   * Destroy microform and clean up
   */
  destroy(): void {
    // Remove fields
    this.fields.forEach((field) => {
      try {
        field.remove?.()
      } catch (e) {
        // Ignore removal errors
      }
    })
    this.fields.clear()

    // Clean up style element
    if (this.styleElement?.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement)
    }
    this.styleElement = null

    // Clear container
    const container = document.getElementById(this.containerId)
    if (container) {
      container.innerHTML = ''
    }

    this.microform = null
    this.flex = null

    console.log('[FlexMicroform] Destroyed')
  }
}