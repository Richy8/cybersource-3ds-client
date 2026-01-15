import type { ModalStyles } from '../types'

export function getDefaultStyles(): ModalStyles {
  return {
    overlay: {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '450px',
      maxWidth: '90%',
      maxHeight: '90vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      background: '#4f46e5',
      color: 'white',
      padding: '20px',
      textAlign: 'center'
    },
    iframeContainer: {
      padding: '20px',
      flex: '1',
      overflow: 'auto'
    },
    iframe: {
      width: '100%',
      height: '500px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px'
    },
    footer: {
      padding: '16px 20px',
      textAlign: 'center',
      fontSize: '12px',
      color: '#6b7280',
      backgroundColor: '#f9fafb',
      borderTop: '1px solid #e5e7eb'
    }
  }
}

export function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
  Object.entries(styles).forEach(([key, value]) => {
    ;(element.style as any)[key] = value
  })
}
