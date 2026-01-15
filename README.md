# CyberSource 3DS Web SDK

A lightweight, framework-agnostic JavaScript SDK for handling CyberSource 3D Secure authentication and Flex Microform card collection in the browser.

## Features

- ✅ **Flex Microform** - PCI-compliant card collection (iFrame-based)
- ✅ **Device Data Collection** - Automated fingerprinting for 3DS 2.x
- ✅ **Challenge UI** - Pre-built modal for 3DS step-up authentication
- ✅ **Smart Loading** - Built-in polling for global Flex dependencies
- ✅ **TypeScript First** - Full type definitions for a better developer experience
- ✅ **Framework Agnostic** - Seamlessly integrates with React, Vue, Angular, or Vanilla JS
- ✅ **Lightweight** - Zero external dependencies (~8KB gzipped)

## Installation

```bash
npm install @your-org/cybersource-3ds-web
```

## Quick Start

### 1. Include Flex SDK
The Flex Microform script must be included on your page for card collection.

```html
<script src="https://flex.cybersource.com/cybersource/assets/microform/0.11/flex-microform.min.js"></script>
```

### 2. Initialize the Client

```javascript
import { WebClient } from '@your-org/cybersource-3ds-web'

const client = new WebClient()

// Wait for the global Flex script to be ready
await client.waitForLibrary()
```

### 3. Setup Secure Card Input

```javascript
const flex = await client.setupFlexMicroform('card-container-id', captureContext, {
  layout: 'inline',
  placeholders: {
    cardNumber: '0000 0000 0000 0000',
    securityCode: 'CVV'
  },
  customStyles: {
    // Label Styles
    labelColor: '#4b5563',
    labelFontSize: '14px',
    labelFontWeight: '600',
    labelMarginBottom: '8px',

    // Input Styles
    fontSize: '15px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textColor: '#1a1a1a',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: '10px',
    inputPadding: '12px',
    inputHeight: '45px',

    // State Styles
    focusColor: '#1a1a1a',
    focusBorderColor: '#1a1a1a',
    focusShadow: '0 0 0 2px rgba(26, 26, 26, 0.1)',
    validColor: '#10b981',
    invalidColor: '#ef4444'
  }
})

// Tokenize on form submission
const { token, cardType, maskedPan } = await flex.tokenize(expiryMonth, expiryYear)
```

### 4. Orchestrate 3DS Authentication

```javascript
// Step A: Collect device data (automatically handles iframe setup)
await client.collectDeviceData(deviceDataUrl, accessToken)

// OR
// Collect browser info (automatically, without iframe)
const deviceInformation = await client.collectBrowserInfo()

// Step B: Show challenge modal (if backend requires step-up)
// This listens for completion events automatically
const result = await client.showChallengeModal(stepUpUrl, accessToken, {
  transactionId: 'TXN_123'
})

if (result.success) {
  // Finalize payment with your backend
  await client.closeChallengeModal()
}
```

---

## Detailed API Reference

### `WebClient`

#### `waitForLibrary(maxRetries?: number, interval?: number)`
Encapsulates the polling logic to ensure `window.FLEX` is available before use.
- **maxRetries**: Number of retry attempts (default: 50)
- **interval**: Milliseconds between retries (default: 100ms)

#### `setupFlexMicroform(containerId, captureContext, options?)`
Mounts the secure card fields into your container.
- **containerId**: ID of the HTML element where the form should mount.
- **options**:
    - `layout`: `'default'` (stacked) or `'inline'`.
    - `customStyles`: Object containing colors, fonts, and border styles.

#### `showChallengeModal(stepUpUrl, accessToken, options?)`
Opens an iFrame modal to handle the 3D Secure challenge.
- **options**:
    - `transactionId`: Optional ID to match against completion messages.
    - `completionMessageType`: Custom string to listen for (default: `'3DS_COMPLETE'`).

---

## Example: Full Checkout Logic (React Example)

```javascript
const handleCheckout = async () => {
  const client = new WebClient()
  await client.waitForLibrary()

  // 1. Tokenize card
  const flex = await client.setupFlexMicroform('card-input', context)
  const { token } = await flex.tokenize()

  // 2. Start 3DS Enrollment
  const enrollment = await api.startPayment({ token })

  if (enrollment.challengeRequired) {
    // 3. Automated Challenge Handling
    await client.showChallengeModal(enrollment.url, enrollment.token)
  }

  // 4. Complete Payment
  await api.completePayment(enrollment.transactionId)
}
```

## Contributing
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
MIT License - see the [LICENSE](LICENSE) file for details.
