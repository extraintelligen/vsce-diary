import { Role } from './types';

export class PromptService {
    /**
     * Builds a system prompt based on the selected role and additional settings
     * @param selectedRole The selected AI role
     * @param conversationalStyle Whether to use conversational style
     * @param inputTextLength Length of the user's input text to guide response length
     * @param additionalInstructions Optional custom instructions
     * @returns The formatted system prompt
     */
    buildSystemPrompt(
        selectedRole: Role, 
        conversationalStyle: boolean = false,
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
        
        // Add conversational style if enabled
        if (conversationalStyle) {
            systemPrompt += " Please respond in a conversational, person-speaking style.";
        }
        
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
        // Simple algorithm to determine appropriate response length
        // For very short inputs, response can be slightly longer
        // For longer inputs, response should be proportionally shorter
        if (inputLength < 50) {
            return Math.max(50, inputLength * 2); // Min 50 chars for very short inputs
        } else if (inputLength < 200) {
            return inputLength * 1.5;
        } else if (inputLength < 500) {
            return inputLength;
        } else {
            return Math.min(1000, inputLength * 0.8); // Cap at 1000 chars for very long inputs
        }
    }
}
