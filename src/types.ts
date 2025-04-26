import * as vscode from 'vscode';

// Interface for role configuration
export interface Role {
    name: string;
    prompt: string;
}

export interface OpenAIRequestPayload {
    model: string;
    messages: {role: string, content: string}[];
    temperature: number;
    stream: boolean;
}

export interface DiaryServiceConfig {
    apiKey: string | undefined;
    apiUrl: string | undefined;
    model: string | undefined;
    temperature: number | undefined;
    roles: Role[];
    debugMode: boolean;
}
