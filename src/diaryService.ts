import * as vscode from 'vscode';
import axios from 'axios';
import { Buffer } from 'buffer';

// Interface for role configuration
interface Role {
    name: string;
    prompt: string;
}

export class DiaryService {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private currentDiaryEntry: string | undefined;
    private currentResponse: string | undefined;
    private statusBarItem: vscode.StatusBarItem;
    private roles: Role[] = [];
    private selectedRole: Role | undefined;
    private debugMode: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('VS Code Diary');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'vsce-diary.insertResponse';
        this.statusBarItem.text = '$(comment-discussion) Insert AI Response';
        this.statusBarItem.tooltip = 'Insert the AI response into your diary';
        
        // Load the roles and debug settings from configuration
        this.loadSettings();
        
        this.log('VS Code Diary: Service initialized');
        
        // Listen for configuration changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('vsceDiary')) {
                    this.log('VS Code Diary: Configuration changed, reloading settings');
                    this.loadSettings();
                }
            })
        );
    }

    private loadSettings() {
        const config = vscode.workspace.getConfiguration('vsceDiary');
        this.roles = config.get<Role[]>('roles') || [];
        this.debugMode = config.get<boolean>('debugMode') || false;
        
        this.log(`VS Code Diary: Loaded ${this.roles.length} roles from settings`);
        this.log(`VS Code Diary: Debug mode is ${this.debugMode ? 'enabled' : 'disabled'}`);
        
        if (this.debugMode) {
            this.roles.forEach(role => {
                this.log(`VS Code Diary: Role loaded - ${role.name}`);
            });
        }
    }
    
    /**
     * Log a message only if debug mode is enabled
     */
    private log(message: string): void {
        if (this.debugMode) {
            console.log(message);
        }
    }

    public async enableDiaryMode() {
        // Reset any previous diary entry
        this.currentDiaryEntry = undefined;
        this.currentResponse = undefined;
        
        // Select a role first
        if (this.roles.length === 0) {
            vscode.window.showErrorMessage('No roles configured. Please configure roles in settings.');
            return;
        }
        
        const roleItems = this.roles.map(role => ({ label: role.name, description: '' }));
        const selectedRoleItem = await vscode.window.showQuickPick(roleItems, { 
            placeHolder: 'Select a role for diary feedback' 
        });
        
        if (!selectedRoleItem) {
            return; // User cancelled
        }
        
        this.selectedRole = this.roles.find(r => r.name === selectedRoleItem.label);
        
        // Now get diary content
        const document = await this.createDiaryDocument();
        if (document) {
            // Set up event listener for text changes
            const disposable = vscode.workspace.onDidChangeTextDocument(event => {
                if (event.document === document) {
                    this.handleTextChange(event);
                }
            });
            
            // Clean up the disposable when the document is closed
            const closeDisposable = vscode.workspace.onDidCloseTextDocument(doc => {
                if (doc === document) {
                    disposable.dispose();
                    closeDisposable.dispose();
                }
            });
        }
    }
    
    private async createDiaryDocument(): Promise<vscode.TextDocument | undefined> {
        const document = await vscode.workspace.openTextDocument({ 
            content: '', 
            language: 'markdown' 
        });
        
        await vscode.window.showTextDocument(document);
        
        return document;
    }
    
    private handleTextChange(event: vscode.TextDocumentChangeEvent) {
        const text = event.document.getText();
        this.currentDiaryEntry = text;
        
        // Check if the last change was pressing Enter at the end of the document
        const changes = event.contentChanges;
        if (changes.length > 0 && changes[0].text.includes('\n')) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document === event.document) {
                const lastPosition = activeEditor.document.positionAt(activeEditor.document.getText().length);
                const lastLine = activeEditor.document.lineAt(lastPosition.line);
                
                // If the line is empty (just typed Enter at end), trigger AI response
                if (lastLine.text.trim() === '' && text.trim().length > 0) {
                    // Extract the last paragraph
                    const lastParagraph = this.extractLastParagraph(text);
                    this.generateResponse(lastParagraph);
                }
            }
        }
    }
    
    private extractLastParagraph(text: string): string {
        // Trim trailing whitespace
        let endIdx = text.length - 1;
        while (endIdx >= 0 && (text[endIdx] === ' ' || text[endIdx] === '\n' || text[endIdx] === '\r' || text[endIdx] === '\t')) {
            endIdx--;
        }
        
        if (endIdx < 0) {
            return ""; // Empty text
        }
        
        // Find the start of the last paragraph (look for single newline)
        let startIdx = endIdx;
        
        while (startIdx > 0) {
            // Look for a newline character
            if (text[startIdx] === '\n') {
                // Found the separator for the last paragraph
                startIdx++; // Move past the newline
                break;
            }
            startIdx--;
        }
        
        // Extract only the last paragraph
        return text.substring(startIdx, endIdx + 1).trim();
    }

    private async generateResponse(text: string) {
        if (!this.selectedRole) {
            vscode.window.showErrorMessage('No role selected for diary feedback.');
            return;
        }
        
        // Show a loading indicator
        this.outputChannel.show(true);
        this.outputChannel.clear();
        this.outputChannel.appendLine('Generating response...');
        
        try {
            // Get config settings
            const config = vscode.workspace.getConfiguration('vsceDiary');
            const apiKey = config.get<string>('openAIApiKey');
            const apiUrl = config.get<string>('openAIApiUrl');
            const model = config.get<string>('openAIModel');
            const temperature = config.get<number>('openAITemperature');
            const useStream = true; // Always use streaming mode
            
            if (!apiKey) {
                throw new Error('OpenAI API key not configured. Please set it in extension settings.');
            }
            
            // Log API request details
            this.log('OpenAI API Request:');
            this.log(`URL: ${apiUrl || 'https://api.openai.com/v1/chat/completions'}`);
            this.log(`Model: ${model || 'gpt-3.5-turbo'}`);
            this.log(`Temperature: ${temperature || 0.7}`);
            this.log(`System prompt: ${this.selectedRole.prompt}`);
            this.log(`User input: ${text}`);
            this.log(`Using streaming API: ${useStream}`);
            
            const requestPayload = {
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: this.selectedRole.prompt },
                    { role: 'user', content: text }
                ],
                temperature: temperature || 0.7,
                stream: true // Always stream
            };
            
            this.log(`Full request payload: ${JSON.stringify(requestPayload, null, 2)}`);
            
            const startTime = Date.now();
            
            // Streaming mode implementation
            let fullResponse = '';
            let reasoningContent = '';
            let isAnswering = false;
            
            // Clear and prepare the output channel
            this.outputChannel.clear();
            this.outputChannel.appendLine(`AI Response (as ${this.selectedRole.name}):\n`);
            
            // Make API request to OpenAI with streaming
            const response = await axios.post(
                apiUrl || 'https://api.openai.com/v1/chat/completions',
                requestPayload,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'stream'
                }
            );
            
            // Process the stream
            response.data.on('data', (chunk: Buffer) => {
                try {
                    const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.substring(6);
                            
                            // Check for the end of the stream
                            if (data === '[DONE]') {
                                const endTime = Date.now();
                                this.log(`Response time: ${endTime - startTime}ms`);
                                return;
                            }
                            
                            try {
                                const parsed = JSON.parse(data);
                                
                                // Check for usage stats at the end
                                if (parsed.usage) {
                                    this.log(`Completion tokens: ${parsed.usage.completion_tokens || 'unknown'}`);
                                    this.log(`Prompt tokens: ${parsed.usage.prompt_tokens || 'unknown'}`);
                                    this.log(`Total tokens: ${parsed.usage.total_tokens || 'unknown'}`);
                                    return;
                                }
                                
                                // Get the content delta
                                const delta = parsed.choices[0]?.delta;
                                
                                if (delta) {
                                    // Handle reasoning content if available (for models like QwQ)
                                    if (delta.reasoning_content) {
                                        if (!isAnswering && reasoningContent.length === 0) {
                                            this.outputChannel.appendLine('Thinking...\n');
                                        }
                                        reasoningContent += delta.reasoning_content;
                                        this.outputChannel.append(delta.reasoning_content);
                                    }
                                    // Handle regular content
                                    else if (delta.content) {
                                        if (reasoningContent.length > 0 && !isAnswering) {
                                            this.outputChannel.appendLine('\n\nAnswer:\n');
                                            isAnswering = true;
                                        }
                                        fullResponse += delta.content;
                                        this.outputChannel.append(delta.content);
                                    }
                                }
                            } catch (e) {
                                this.log(`Error parsing JSON: ${e}`);
                            }
                        }
                    }
                } catch (e) {
                    this.log(`Error processing stream chunk: ${e}`);
                }
            });

            response.data.on('end', () => {
                // Save response for later insertion
                this.currentResponse = fullResponse;
                
                // Add reasoning content to the response if available
                if (reasoningContent && this.debugMode) {
                    this.currentResponse = `**Reasoning:**\n\n${reasoningContent}\n\n**Answer:**\n\n${fullResponse}`;
                }
                
                // Show status bar item for inserting the response
                this.statusBarItem.show();
                
                const endTime = Date.now();
                this.log(`Stream completed. Total response time: ${endTime - startTime}ms`);
            });
            
            response.data.on('error', (err: Error) => {
                this.outputChannel.appendLine(`\nError in stream: ${err.message}`);
                this.log(`Stream error: ${err.message}`);
            });
        } catch (error) {
            let errorMessage = 'Failed to generate response';
            
            if (axios.isAxiosError(error)) {
                // Log detailed API error information
                this.log(`API Error: ${error.message}`);
                this.log(`Status: ${error.response?.status}`);
                this.log(`Status text: ${error.response?.statusText}`);
                this.log(`Response data: ${JSON.stringify(error.response?.data, null, 2)}`);
                this.log(`Request config: ${JSON.stringify(error.config, null, 2)}`);
                
                errorMessage += `: ${error.message}`;
                if (error.response?.data?.error?.message) {
                    errorMessage += ` - ${error.response.data.error.message}`;
                }
            } else if (error instanceof Error) {
                this.log(`Error: ${error.message}`);
                this.log(`Stack trace: ${error.stack}`);
                errorMessage += `: ${error.message}`;
            } else {
                this.log(`Unknown error: ${error}`);
            }
            
            this.outputChannel.appendLine(`Error: ${errorMessage}`);
            vscode.window.showErrorMessage(errorMessage);
        }
    }
    
    public async insertResponse() {
        if (!this.currentResponse) {
            vscode.window.showInformationMessage('No AI response available to insert.');
            return;
        }
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        
        // Insert the response at the end of the document
        const position = new vscode.Position(editor.document.lineCount, 0);
        await editor.edit((editBuilder) => {
            editBuilder.insert(
                position, 
                `\n\n## Feedback from ${this.selectedRole?.name}\n\n${this.currentResponse}\n`
            );
        });
        
        // Hide the status bar item after insert
        this.statusBarItem.hide();
    }
}