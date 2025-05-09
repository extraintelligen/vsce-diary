import * as vscode from 'vscode';

export class DocumentHandler {
    /**
     * Creates a new diary document
     */
    static async createDiaryDocument(): Promise<vscode.TextDocument | undefined> {
        const document = await vscode.workspace.openTextDocument({ 
            content: '', 
            language: 'markdown' 
        });
        
        await vscode.window.showTextDocument(document);
        
        return document;
    }
    
    /**
     * Extract the last paragraph from text 
     */
    static extractLastParagraph(text: string): string {
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
    
    /**
     * Insert AI response into the current document
     * @param response The AI response text to insert
     * @param roleName Optional role name to include in the header
     */
    public static async insertResponse(response: string, roleName?: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        // Create delimiter line with equal signs
        const delimiter = "=".repeat(50);
        
        // Format the response with delimiters and optional role attribution
        const formattedResponse = `\n\n${delimiter}\n${roleName ? `Response from ${roleName}:\n\n` : ''}${response}\n${delimiter}\n\n`;
        
        // Get position at the end of the document
        const position = new vscode.Position(editor.document.lineCount, 0);
        
        // Insert the formatted response
        await editor.edit(editBuilder => {
            editBuilder.insert(position, formattedResponse);
        });
        
        // Move cursor to the end
        const newPosition = new vscode.Position(editor.document.lineCount, 0);
        editor.selection = new vscode.Selection(newPosition, newPosition);
    }
}
