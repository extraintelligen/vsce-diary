import * as vscode from 'vscode';
import { Role } from './types';
import { Logger } from './logger';
import { ApiService } from './apiService';
import { DocumentHandler } from './documentHandler';
import { ConfigService } from './configService';
import { ResponseViewService } from './responseViewService';
import { AIResponseService } from './aiResponseService';

export class DiaryService {
    private currentDiaryEntry: string | undefined;
    private currentResponse: string | undefined;
    private selectedRole: Role | undefined;
    private logger: Logger;
    private configService: ConfigService;
    private aiResponseService: AIResponseService;
    private responseViewService: ResponseViewService;
    private isInsertingResponse: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        // Initialize services
        this.logger = new Logger();
        this.configService = new ConfigService(this.logger);
        const outputChannel = vscode.window.createOutputChannel('VS Code Diary');
        const apiService = new ApiService(this.logger, outputChannel);
        this.aiResponseService = new AIResponseService(apiService, this.configService, this.logger);
        this.responseViewService = new ResponseViewService(context, this.insertResponse.bind(this));
        
        // Load initial settings
        this.configService.loadSettings();
        
        this.logger.log('VS Code Diary: Service initialized');
        
        // Listen for configuration changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('vsceDiary')) {
                    this.logger.log('VS Code Diary: Configuration changed, reloading settings');
                    this.configService.loadSettings();
                }
            })
        );
    }

    public async enableDiaryMode() {
        // Reset any previous diary entry
        this.currentDiaryEntry = undefined;
        this.currentResponse = undefined;
        
        // Select a role first
        const roles = this.configService.getRoles();
        if (roles.length === 0) {
            vscode.window.showErrorMessage('No roles configured. Please configure roles in settings.');
            return;
        }
        
        const roleItems = roles.map(role => ({ label: role.name, description: '' }));
        const selectedRoleItem = await vscode.window.showQuickPick(roleItems, { 
            placeHolder: 'Select a role for diary feedback' 
        });
        
        if (!selectedRoleItem) {
            return; // User cancelled
        }
        
        this.selectedRole = roles.find(r => r.name === selectedRoleItem.label);
        
        // Set up document listeners
        this.setupDocumentListeners();
    }
    
    private setupDocumentListeners() {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const document = activeEditor.document;
            
            // Set up event listener for text changes
            const disposable = vscode.workspace.onDidChangeTextDocument(event => {
                if (event.document === document) {
                    this.handleTextChange(event);
                }
            });
            
            // Clean up the disposable when the document is closed
            const closeDisposable = vscode.workspace.onDidCloseTextDocument(doc => {
                if (doc === document) {
                    disposable.dispose();
                    closeDisposable.dispose();
                }
            });
        }
    }
    
    private handleTextChange(event: vscode.TextDocumentChangeEvent) {
        const text = event.document.getText();
        this.currentDiaryEntry = text;
        
        // Skip processing if we're currently inserting a response
        if (this.isInsertingResponse) {
            return;
        }
        
        // Check if the last change was pressing Enter at the end of the document
        const changes = event.contentChanges;
        if (changes.length > 0 && changes[0].text.includes('\n')) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document === event.document) {
                const lastPosition = activeEditor.document.positionAt(activeEditor.document.getText().length);
                const lastLine = activeEditor.document.lineAt(lastPosition.line);
                
                // If the line is empty (just typed Enter at end), trigger AI response
                if (lastLine.text.trim() === '' && text.trim().length > 0) {
                    // Extract the last paragraph
                    const lastParagraph = DocumentHandler.extractLastParagraph(text);
                    this.generateResponse(lastParagraph);
                }
            }
        }
    }
    
    private async generateResponse(text: string) {
        if (!this.selectedRole) {
            vscode.window.showErrorMessage('No role selected for diary feedback.');
            return;
        }
        
        try {
            this.currentResponse = await this.aiResponseService.generateResponse(
                text,
                this.selectedRole
            );
            
            if (this.currentResponse) {
                // Show response in panel
                this.showResponsePanel();
            }
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error generating response: ${error.message}`);
                this.logger.log(`Error: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred');
                this.logger.log(`Unknown error: ${error}`);
            }
        }
    }
    
    public showResponsePanel() {
        if (!this.currentResponse) {
            vscode.window.showInformationMessage('No AI response available to show.');
            return;
        }
        
        this.responseViewService.showResponse(this.currentResponse, this.selectedRole?.name);
    }
    
    public async insertResponse() {
        if (!this.currentResponse) {
            vscode.window.showInformationMessage('No AI response available to insert.');
            return;
        }
        
        try {
            this.isInsertingResponse = true; // Set flag before insertion
            await DocumentHandler.insertResponse(this.currentResponse, this.selectedRole?.name);
        } finally {
            // Make sure to reset the flag even if an error occurs
            setTimeout(() => {
                this.isInsertingResponse = false;
            }, 100); // Short delay to ensure any triggered events are processed first
        }
    }
}