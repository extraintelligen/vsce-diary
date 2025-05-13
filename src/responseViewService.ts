import * as vscode from 'vscode';

export class ResponseViewService {
    private responsePanel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private insertCallback: (content: string) => void;
    private currentResponse: string = '';

    constructor(context: vscode.ExtensionContext, insertCallback: (content: string) => void) {
        this.context = context;
        this.insertCallback = insertCallback;
    }

    public showResponse(response: string, roleName?: string) {
        // Store the current response
        this.currentResponse = response;
        
        // Check if panel exists and is not disposed
        if (!this.responsePanel) {
            // Create new panel
            this.createResponsePanel();
        } else {
            // Panel exists, check if it's still valid by revealing it
            try {
                this.responsePanel.reveal(vscode.ViewColumn.Beside, true);
            } catch (e) {
                // If revealing fails, panel was likely disposed, so create a new one
                this.responsePanel = undefined;
                this.createResponsePanel();
            }
        }

        // Update panel content
        if (this.responsePanel) {
            this.responsePanel.webview.html = this.getWebviewContent(response, roleName);
        }
    }

    // Helper method to create the response panel
    private createResponsePanel() {
        this.responsePanel = vscode.window.createWebviewPanel(
            'diaryResponse',
            'AI Diary Response',
            { 
                viewColumn: vscode.ViewColumn.Beside, 
                preserveFocus: true 
            },
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Handle messages from the webview
        this.responsePanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'insertResponse':
                        await this.insertCallback(this.currentResponse);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Clean up resources when panel is closed
        this.responsePanel.onDidDispose(() => {
            this.responsePanel = undefined;
        });
    }

    private getWebviewContent(markdownContent: string, roleName?: string) {
        const displayName = roleName || 'AI';

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Diary Response</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 15px;
                    line-height: 1.5;
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .header {
                    margin-bottom: 15px;
                }
                .response-content {
                    flex-grow: 1;
                    overflow-y: auto;
                    margin-bottom: 15px;
                    white-space: pre-wrap;
                }
                .button-container {
                    text-align: right;
                }
                button {
                    padding: 8px 16px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                    border-radius: 2px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground
                }
                .header {
                    margin-bottom: 15px;
                }
                .response-content {
                    flex-grow: 1;
                    overflow-y: auto;
                    margin-bottom: 15px;
                    white-space: pre-wrap;
                }
                .button-container {
                    text-align: right;
                }
                button {
                    padding: 8px 16px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                    border-radius: 2px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                h3 {
                    margin-top: 0;
                }
                pre {
                    white-space: pre-wrap;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h3>Response from ${displayName}</h3>
                </div>
                <div class="response-content">
                    <pre>${markdownContent}</pre>
                </div>
                <div class="button-container">
                    <button id="insertBtn">Insert in Editor</button>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('insertBtn').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'insertResponse'
                    });
                });
            </script>
        </body>
        </html>`;
    }
}
