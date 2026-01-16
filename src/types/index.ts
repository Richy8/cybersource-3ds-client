export interface FlexMicroformOptions {
  /** Layout: 'stacked' (default) or 'inline' */
  layout?: 'stacked' | 'inline'

  /** Custom labels for fields */
  labels?: {
    cardNumber?: string
    securityCode?: string
  }

  /** Placeholder text for fields */
  placeholders?: {
    cardNumber?: string
    securityCode?: string
  }

  /** Custom styles */
  customStyles?: FlexFieldStyles

  /** Timeout for operations in ms (default: 15000) */
  timeoutMs?: number

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal

  /** Callback when field values change */
  onFieldChange?: (fieldType: string, data: FlexFieldChangeData) => void
}

export interface FlexFieldStyles {
  fontSize?: string
  fontFamily?: string
  textColor?: string
  focusColor?: string
  validColor?: string
  invalidColor?: string
  labelFontSize?: string
  labelFontWeight?: string
  labelColor?: string
  labelMarginBottom?: string
  borderColor?: string
  borderRadius?: string
  inputPadding?: string
  backgroundColor?: string
  inputHeight?: string
  focusBorderColor?: string
  focusShadow?: string
  errorColor?: string
  errorFontSize?: string
  errorMarginTop?: string
}

export interface FlexFieldChangeData {
  valid: boolean
  touched: boolean
  empty: boolean
  couldBeValid?: boolean
  card?: Array<{ name: string; brandedName: string }>
  error?: { message: string }
}

export interface FlexMicroformInstance {
  /** Tokenize card data */
  tokenize: (expiryMonth: string, expiryYear: string) => Promise<FlexTokenizeResult>

  /** Add event listener to all fields */
  on: (event: string, callback: Function) => void

  /** Destroy and clean up */
  destroy: () => void

  /** Check if all fields are valid */
  isValid: () => boolean
}

export interface FlexTokenizeResult {
  /** The transient token JWT */
  token: string

  /** Masked PAN (e.g., "411111••••••1111") */
  maskedPan: string

  /** Card type (e.g., "visa", "mastercard") */
  cardType: string

  /** Normalized expiry month (2 digits) */
  expiryMonth: string

  /** Normalized expiry year (4 digits) */
  expiryYear: string
}

export interface DeviceDataOptions {
  timeoutMs?: number
  timeout?: number
}

export interface DeviceInformation {
  httpBrowserColorDepth: string
  httpBrowserJavaEnabled: boolean | string
  httpBrowserJavaScriptEnabled: boolean | string
  httpBrowserLanguage: string
  httpBrowserScreenHeight: string
  httpBrowserScreenWidth: string
  httpBrowserTimeDifference: string
  userAgentBrowserValue: string
  ipAddress?: string | null
  httpAcceptContent?: string
}

export interface ChallengeModalOptions {
  transactionId?: string
  timeoutMs?: number
  timeout?: number
  completionMessageType?: string
  width?: string
  height?: string
}

export interface AuthenticationResult {
  success: boolean
  transactionId?: string
  authenticationResult?: string
  result?: string
  authTransactionId?: string
  error?: string
}

export interface ModalStyles {
  overlay?: Partial<CSSStyleDeclaration> | Record<string, string>
  modal?: Partial<CSSStyleDeclaration> | Record<string, string>
  header?: Partial<CSSStyleDeclaration> | Record<string, string>
  iframeContainer?: Partial<CSSStyleDeclaration> | Record<string, string>
  iframe?: Partial<CSSStyleDeclaration> | Record<string, string>
  footer?: Partial<CSSStyleDeclaration> | Record<string, string>
}