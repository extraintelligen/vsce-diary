import { Role } from './types';
import { Logger } from './logger';

export class PromptService {
    private logger: Logger;
    
    constructor(logger: Logger) {
        this.logger = logger;
    }
    
    /**
     * Builds a system prompt based on the selected role and additional settings
     * @param selectedRole The selected AI role
     * @param inputTextLength Length of the user's input text to guide response length
     * @param additionalInstructions Optional custom instructions
     * @returns The formatted system prompt
     */
    buildSystemPrompt(
        selectedRole: Role,
        inputTextLength: number = 0,
        additionalInstructions: string[] = []
    ): string {
        // Start with the base role prompt
        let systemPrompt = selectedRole.prompt;
        
        // Add standard instructions with improved clarity about handling user input
        systemPrompt += " Keep your response concise, and adjust your response length to be proportional to the user's input length";
        
        // Add specific guidance on response length based on input length
        if (inputTextLength > 0) {
            const recommendedLength = this.calculateRecommendedLength(inputTextLength);
            systemPrompt += ` The user's input is ${inputTextLength} characters long. Please provide a response of approximately ${recommendedLength} characters.`;
        }
        
        systemPrompt += " Use the same language as the user's input text and use plain text without emoji or other marks.";
        systemPrompt += " Consider the user's input as their diary entry or personal reflection, and tailor your response accordingly.";
        
        // Add any additional custom instructions
        if (additionalInstructions.length > 0) {
            systemPrompt += " " + additionalInstructions.join(" ");
        }
        
        return systemPrompt;
    }
    
    /**
     * Calculates recommended response length based on input length
     * @param inputLength Length of the user input text
     * @returns Recommended response length
     */
    private calculateRecommendedLength(inputLength: number): number {
        let recommendedLength: number;
        
        if (inputLength < 200) {
            recommendedLength = inputLength;
        } else {
            recommendedLength = Math.min(200, inputLength * 0.8); 
        }
        
        this.logger.log(`Input length: ${inputLength}, Recommended length: ${recommendedLength}`);
        return recommendedLength;
    }
}
