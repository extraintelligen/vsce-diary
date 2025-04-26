import { Role } from './types';
import { ApiService } from './apiService';
import { ConfigService } from './configService';
import { Logger } from './logger';

export class AIResponseService {
    private apiService: ApiService;
    private configService: ConfigService;
    private logger: Logger;

    constructor(apiService: ApiService, configService: ConfigService, logger: Logger) {
        this.apiService = apiService;
        this.configService = configService;
        this.logger = logger;
    }

    public async generateResponse(text: string, role: Role): Promise<string | undefined> {
        const config = this.configService.getConfig();
        if (!config.apiKey) {
            throw new Error('OpenAI API key not configured. Please set it in extension settings.');
        }
        
        // We need conversational style instead of input length to match the API signature
        const conversationalStyle = false; // Default value or get from config if available
        
        const result = await this.apiService.generateResponse(
            text,
            role,
            config.apiKey,
            config.apiUrl,
            config.model,
            config.temperature,
            conversationalStyle,
            config.debugMode
        );
        
        if (result) {
            return result.response;
        }
        
        return undefined;
    }
}
