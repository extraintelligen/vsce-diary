import * as vscode from 'vscode';
import { Role, DiaryServiceConfig } from './types';
import { Logger } from './logger';

export class ConfigService {
    private logger: Logger;
    private roles: Role[] = [];
    private config: DiaryServiceConfig;

    constructor(logger: Logger) {
        this.logger = logger;
        this.config = {
            apiKey: undefined,
            apiUrl: undefined,
            model: undefined,
            temperature: undefined,
            roles: [],
            debugMode: false
        };
    }

    public loadSettings() {
        const config = vscode.workspace.getConfiguration('vsceDiary');
        this.roles = config.get<Role[]>('roles') || [];
        const debugMode = config.get<boolean>('debugMode') || false;
        
        // Update logger debug mode
        this.logger.setDebugMode(debugMode);
        
        // Update config
        this.config = {
            apiKey: config.get<string>('openAIApiKey'),
            apiUrl: config.get<string>('openAIApiUrl'),
            model: config.get<string>('openAIModel'),
            temperature: config.get<number>('openAITemperature'),
            roles: this.roles,
            debugMode: debugMode
        };
        
        this.logger.log(`VS Code Diary: Loaded ${this.roles.length} roles from settings`);
        this.logger.log(`VS Code Diary: Debug mode is ${debugMode ? 'enabled' : 'disabled'}`);
        
        if (debugMode) {
            this.roles.forEach(role => {
                this.logger.log(`VS Code Diary: Role loaded - ${role.name}`);
            });
        }
    }
    
    public getRoles(): Role[] {
        return this.roles;
    }
    
    public getConfig(): DiaryServiceConfig {
        return this.config;
    }
    
    public getApiKey(): string | undefined {
        return this.config.apiKey;
    }
    
    public getApiUrl(): string | undefined {
        return this.config.apiUrl;
    }
    
    public getModel(): string | undefined {
        return this.config.model;
    }
    
    public getTemperature(): number | undefined {
        return this.config.temperature;
    }
    
    public getDebugMode(): boolean {
        return this.config.debugMode;
    }
}
