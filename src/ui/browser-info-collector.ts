import type { DeviceInformation } from '../types'

/**
 * Collect device information directly from the browser
 * This mimics the structure required by Cybersource / Cardinal Commerce
 * but runs asynchronously in the client context without an iframe.
 * 
 * @param ipAddress - Optional IP address if already known
 */
export const collectBrowserInfo = async (ipAddress: string | null = null): Promise<DeviceInformation> => {
    let activeIp = ipAddress

    // Fetch public IP if not provided
    if (!activeIp) {
        try {
            const response = await fetch('https://api.ipify.org?format=json')
            const data = await response.json()
            activeIp = data.ip
        } catch (err) {
            console.warn('Could not fetch public IP, proceeding without it:', err)
        }
    }

    const nav = window.navigator
    const screen = window.screen
    const date = new Date()

    return {
        ipAddress: activeIp,
        httpAcceptContent: '*/*', // Default to accepting all content
        httpBrowserLanguage: nav.language || 'en-US',
        httpBrowserJavaEnabled: nav.javaEnabled() ? 'Y' : 'N',
        httpBrowserJavaScriptEnabled: 'Y', // We are running in JS, so yes
        httpBrowserColorDepth: screen.colorDepth.toString(),
        httpBrowserScreenHeight: screen.height.toString(),
        httpBrowserScreenWidth: screen.width.toString(),
        httpBrowserTimeDifference: date.getTimezoneOffset().toString(), // Offset in minutes
        userAgentBrowserValue: nav.userAgent
    }
}
