import * as vscode from 'vscode';
import { DiaryService } from './diaryService';

export function activate(context: vscode.ExtensionContext) {
    console.log('VS Code Diary extension is now active!');
    
    // Initialize the diary service
    const diaryService = new DiaryService(context);
    
    // Register the enable diary mode command
    const enableDiaryModeDisposable = vscode.commands.registerCommand('vsce-diary.enableDiaryMode', () => {
        diaryService.enableDiaryMode();
    });
    
    // Register the insert response command
    const insertResponseDisposable = vscode.commands.registerCommand('vsce-diary.insertResponse', () => {
        diaryService.insertResponse();
    });
    
    context.subscriptions.push(enableDiaryModeDisposable);
    context.subscriptions.push(insertResponseDisposable);
}

export function deactivate() {
    // Clean up resources when extension is deactivated
}