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
     * Insert response into current document
     */
    static async insertResponse(response: string, roleName: string | undefined): Promise<boolean> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return false;
        }
        
        // Insert the response at the end of the document
        const position = new vscode.Position(editor.document.lineCount, 0);
        await editor.edit((editBuilder) => {
            editBuilder.insert(
                position, 
                `\n\n## Feedback from ${roleName}\n\n${response}\n`
            );
        });
        
        return true;
    }
}
