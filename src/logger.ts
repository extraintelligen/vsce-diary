export class Logger {
    private debugMode: boolean;

    constructor(debugMode: boolean = false) {
        this.debugMode = debugMode;
    }

    setDebugMode(mode: boolean): void {
        this.debugMode = mode;
    }

    /**
     * Log a message only if debug mode is enabled
     */
    log(message: string): void {
        if (this.debugMode) {
            console.log(message);
        }
    }
}
