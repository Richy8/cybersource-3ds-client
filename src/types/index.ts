export interface DeviceDataOptions {
  timeout?: number
}

export interface ChallengeModalOptions {
  timeout?: number
  customStyles?: Partial<ModalStyles>
  transactionId?: string
  completionMessageType?: string
}

export interface AuthenticationResult {
  success: boolean
  result?: any
  authTransactionId?: string
}

export interface ModalStyles {
  overlay: Record<string, string>
  modal: Record<string, string>
  header: Record<string, string>
  iframeContainer: Record<string, string>
  iframe: Record<string, string>
  footer: Record<string, string>
}

// Flex Microform Types
export interface FlexMicroformOptions {
  layout?: 'default' | 'inline'
  labels?: {
    cardNumber?: string
    securityCode?: string
  }
  placeholders?: {
    cardNumber?: string
    expiryDate?: string
    expiryMonth?: string
    expiryYear?: string
    securityCode?: string
  }
  customStyles?: {
    fontSize?: string
    fontFamily?: string
    textColor?: string
    labelColor?: string
    labelFontSize?: string
    labelFontWeight?: string
    labelMarginBottom?: string
    borderColor?: string
    borderRadius?: string
    inputPadding?: string
    inputHeight?: string
    backgroundColor?: string
    focusColor?: string
    focusBorderColor?: string
    focusShadow?: string
    validColor?: string
    invalidColor?: string
    errorColor?: string
    errorFontSize?: string
    errorMarginTop?: string
  }
  fieldStyles?: FlexFieldStyles
  flexOptions?: any
  onFieldChange?: (fieldType: string, data: any) => void
}

export interface FlexFieldStyles {
  placeholder?: string
  maxLength?: number
}

export interface FlexMicroformInstance {
  tokenize: (expiryMonth: string, expiryYear: string) => Promise<FlexTokenizeResult>
  on: (event: string, callback: Function) => void
  destroy: () => void
}

export interface FlexTokenizeResult {
  token: string
  maskedPan: string
  cardType: string
  expiryMonth: string
  expiryYear: string
}

export interface DeviceInformation {
  ipAddress: string | null
  httpAcceptContent: string
  httpBrowserLanguage: string
  httpBrowserJavaEnabled: string
  httpBrowserJavaScriptEnabled: string
  httpBrowserColorDepth: string
  httpBrowserScreenHeight: string
  httpBrowserScreenWidth: string
  httpBrowserTimeDifference: string
  userAgentBrowserValue: string
}
