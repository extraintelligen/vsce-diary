import * as vscode from 'vscode';

export class ResponseViewService {
    private responsePanel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private insertCallback: () => void;

    constructor(context: vscode.ExtensionContext, insertCallback: () => void) {
        this.context = context;
        this.insertCallback = insertCallback;
    }

    public showResponse(response: string, roleName?: string) {
        // Check if panel exists and is not disposed
        if (!this.responsePanel) {
            // Create new panel
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
                            await this.insertCallback();
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
        } else {
            try {
                // Try to access the panel to see if it's still valid
                // This property access will throw if the panel is disposed
                const isVisible = this.responsePanel.visible;
            } catch (e) {
                // Panel was disposed, need to create a new one
                this.responsePanel = undefined;
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
                                await this.insertCallback();
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
        }

        // Update panel content
        this.responsePanel.webview.html = this.getWebviewContent(response, roleName);
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
                    <button id="insertBtn">Insert at Cursor</button>
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
