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
        const apiKey = this.configService.getApiKey();
        const apiUrl = this.configService.getApiUrl();
        const model = this.configService.getModel();
        const temperature = this.configService.getTemperature();
        const debugMode = this.configService.getDebugMode();

        if (!apiKey) {
            throw new Error('API key not configured');
        }

        const response = await this.apiService.generateResponse(
            text,
            role,
            apiKey,
            apiUrl,
            model,
            temperature,
            debugMode
        );

        if (response && !response.isMeaningfulText) {
            this.logger.log('Skipping response for non-meaningful input');
            return undefined;
        }

        return response?.response;
    }
}