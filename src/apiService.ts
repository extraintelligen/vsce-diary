import axios from 'axios';
import * as vscode from 'vscode';
import { Buffer } from 'buffer';
import { Role, OpenAIRequestPayload } from './types';
import { Logger } from './logger';
import { PromptService } from './promptService';

export class ApiService {
    private logger: Logger;
    private outputChannel: vscode.OutputChannel;
    private promptService: PromptService;

    constructor(logger: Logger, outputChannel: vscode.OutputChannel) {
        this.logger = logger;
        this.outputChannel = outputChannel;
        this.promptService = new PromptService(logger);
    }

    async generateResponse(
        text: string, 
        selectedRole: Role, 
        apiKey: string, 
        apiUrl: string | undefined, 
        model: string | undefined, 
        temperature: number | undefined,
        debugMode: boolean
    ): Promise<{ response: string, reasoningContent: string, isMeaningfulText: boolean } | null> {
        // Show a loading indicator
        this.outputChannel.show(true);
        this.outputChannel.clear();
        this.outputChannel.appendLine('Generating response...');
        
        try {
            if (!apiKey) {
                throw new Error('OpenAI API key not configured. Please set it in extension settings.');
            }
            
            // Log API request details
            this.logger.log('OpenAI API Request:');
            this.logger.log(`URL: ${apiUrl || 'https://api.openai.com/v1/chat/completions'}`);
            this.logger.log(`Model: ${model || 'gpt-3.5-turbo'}`);
            this.logger.log(`Temperature: ${temperature || 0.7}`);
            this.logger.log(`System prompt: ${selectedRole.prompt}`);
            this.logger.log(`User input: ${text}`);
            this.logger.log(`Using streaming API: true`);
            
            // Get the system prompt using the PromptService
            const systemPrompt = this.promptService.buildSystemPrompt(selectedRole) + 
                "\n\nFirst, evaluate if the user's input is meaningful for a diary entry or just trivial information like a name, date, or random characters. " + 
                "If the input is NOT meaningful (just a name, date, greeting, or trivial text), start your response with exactly: " +
                "\"[NOT_MEANINGFUL_INPUT]\" and then provide a brief explanation. If the input IS meaningful, respond normally without this marker.";
            
            const requestPayload: OpenAIRequestPayload = {
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: temperature || 0.7,
                stream: true
            };
            
            if (debugMode) {
                this.logger.log(`Full request payload: ${JSON.stringify(requestPayload, null, 2)}`);
            }
            
            const startTime = Date.now();
            
            return new Promise((resolve, reject) => {
                // Streaming mode implementation
                let fullResponse = '';
                let reasoningContent = '';
                let isAnswering = false;
                let isMeaningfulText = true; // Default to true
                
                // Clear and prepare the output channel
                this.outputChannel.clear();
                this.outputChannel.appendLine(`AI Response (as ${selectedRole.name}):\n`);
                
                // Make API request to OpenAI with streaming
                axios.post(
                    apiUrl || 'https://api.openai.com/v1/chat/completions',
                    requestPayload,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        responseType: 'stream'
                    }
                ).then(response => {
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
                                        this.logger.log(`Response time: ${endTime - startTime}ms`);
                                        return;
                                    }
                                    
                                    try {
                                        const parsed = JSON.parse(data);
                                        
                                        // Check for usage stats at the end
                                        if (parsed.usage) {
                                            this.logger.log(`Completion tokens: ${parsed.usage.completion_tokens || 'unknown'}`);
                                            this.logger.log(`Prompt tokens: ${parsed.usage.prompt_tokens || 'unknown'}`);
                                            this.logger.log(`Total tokens: ${parsed.usage.total_tokens || 'unknown'}`);
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
                                                
                                                // Check if this chunk contains the NOT_MEANINGFUL_INPUT marker
                                                // Only look at start of response to avoid false positives in the middle of text
                                                if (fullResponse.length < 50 && fullResponse.includes('[NOT_MEANINGFUL_INPUT]')) {
                                                    isMeaningfulText = false;
                                                    this.logger.log('Input detected as not meaningful for a diary entry.');
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        this.logger.log(`Error parsing JSON: ${e}`);
                                    }
                                }
                            }
                        } catch (e) {
                            this.logger.log(`Error processing stream chunk: ${e}`);
                        }
                    });

                    response.data.on('end', () => {
                        const endTime = Date.now();
                        this.logger.log(`Stream completed. Total response time: ${endTime - startTime}ms`);
                        
                        // If the text wasn't meaningful, we might want to remove the marker from the response
                        if (!isMeaningfulText && fullResponse.includes('[NOT_MEANINGFUL_INPUT]')) {
                            fullResponse = fullResponse.replace('[NOT_MEANINGFUL_INPUT]', '').trim();
                        }
                        
                        resolve({ 
                            response: fullResponse, 
                            reasoningContent, 
                            isMeaningfulText 
                        });
                    });
                    
                    response.data.on('error', (err: Error) => {
                        this.outputChannel.appendLine(`\nError in stream: ${err.message}`);
                        this.logger.log(`Stream error: ${err.message}`);
                        reject(err);
                    });
                }).catch(error => {
                    reject(error);
                });
            });
        } catch (error) {
            this.handleError(error);
            return null;
        }
    }
    
    private handleError(error: unknown): void {
        let errorMessage = 'Failed to generate response';
        
        if (axios.isAxiosError(error)) {
            // Log detailed API error information
            this.logger.log(`API Error: ${error.message}`);
            this.logger.log(`Status: ${error.response?.status}`);
            this.logger.log(`Status text: ${error.response?.statusText}`);
            this.logger.log(`Response data: ${JSON.stringify(error.response?.data, null, 2)}`);
            this.logger.log(`Request config: ${JSON.stringify(error.config, null, 2)}`);
            
            errorMessage += `: ${error.message}`;
            if (error.response?.data?.error?.message) {
                errorMessage += ` - ${error.response.data.error.message}`;
            }
        } else if (error instanceof Error) {
            this.logger.log(`Error: ${error.message}`);
            this.logger.log(`Stack trace: ${error.stack}`);
            errorMessage += `: ${error.message}`;
        } else {
            this.logger.log(`Unknown error: ${error}`);
        }
        
        this.outputChannel.appendLine(`Error: ${errorMessage}`);
        vscode.window.showErrorMessage(errorMessage);
    }
}
