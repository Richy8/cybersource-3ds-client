declare const process: any;
export class Logger {
    private static isDev(): boolean {
        try {
            // Check if process is defined (Node.js or bundled environment)
            if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
                return process.env.NODE_ENV !== 'production';
            }
            // Default to false (production) if we can't determine
            return false;
        } catch (e) {
            return false;
        }
    }

    static log(message: string, ...args: any[]): void {
        if (Logger.isDev()) {
            console.log(message, ...args);
        }
    }

    static info(message: string, ...args: any[]): void {
        if (Logger.isDev()) {
            console.info(message, ...args);
        }
    }

    static warn(message: string, ...args: any[]): void {
        if (Logger.isDev()) {
            console.warn(message, ...args);
        }
    }

    static error(message: string, ...args: any[]): void {
        // Errors might be important even in prod, but per requirement "no log items... to the user console"
        // typically errors are exception. But user said "no logger items".
        // Stick to the rule: "It should no longer log any of the logs to the user console."
        if (Logger.isDev()) {
            console.error(message, ...args);
        }
    }

    static debug(message: string, ...args: any[]): void {
        if (Logger.isDev()) {
            console.debug(message, ...args);
        }
    }
}
