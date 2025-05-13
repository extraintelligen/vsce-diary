# VS Code Extension To Provide Comments On Diaries

A VS Code extension that provides comments to your diaries, in the way of people you admire.

Co-developed with GitHub Copilot.

## Features

- Write diary in vscode and get AI-powered feedback on your writings in real-time
- Choose from different roles (e.g., Friend, or some people you admired) for varied perspectives
- Insert AI responses directly into your diary entry
- Fully customizable prompts and roles

## How to Use

1. **Enable Diary Mode**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and run the command "Enable Diary Mode" to activate the diary mode
2. **Select a Role**: Choose from the available roles (Friend, Idol, All.)
3. **Write Your Diary**: Type your thoughts and reflections
4. **Get AI Feedback**: Press Enter at the end of your entry to trigger AI feedback
5. **Insert Response**: Click the "Insert AI Response" button in the status bar or run the "Insert AI Response" command to add the feedback to your document

## Configuration

You can configure the extension in VS Code settings:

1. Open VS Code settings (`Ctrl+,` or `Cmd+,` on macOS)
2. Search for "VS Code Diary"
3. Configure the following settings:

| Setting | Description |
|---------|-------------|
| `vsceDiary.openAIApiKey` | Your OpenAI API key (required) |
| `vsceDiary.openAIApiUrl` | OpenAI API URL (default: https://api.openai.com/v1/chat/completions) |
| `vsceDiary.openAIModel` | OpenAI model to use (default: gpt-3.5-turbo) |
| `vsceDiary.openAITemperature` | Temperature for OpenAI API (default: 0.7) |
| `vsceDiary.roles` | Array of roles and prompts for different perspectives |

### Example Roles Configuration

```json
"vsceDiary.roles": [
  {
    "name": "Friend",
    "prompt": "You are a supportive friend reading my diary entry. Offer kind and constructive feedback."
  },
  {
    "name": "Confucius",
    "prompt": "You are Confucius reading my diary entry. Provide philosophical insights and wisdom."
  },
  {
    "name": "Socrates",
    "prompt": "You are Socrates reading my diary entry. Ask probing questions to encourage deeper reflection."
  },
]
```

## Requirements

- VS Code version 1.80.0 or higher
- OpenAI API key

## Installation

1. Download the .vsix file from the releases page
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
4. Type "Install from VSIX" and select the command
5. Choose the downloaded .vsix file

## Building from Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile the TypeScript code
4. Run `npm run package` to create the .vsix file

## License

ISC License

## Techniques in Vibe Coding
some techniques are used in building this extension with Github Copilot
- Start from a *classic and simple codebase*, such as a simple hello world extension, or some demo project used to teach users in the official documentation.(which helps the author to understand the structure of the project and make sure what changes are being made by the Copilot) 
- *Write documenation before start* make further changes to the code, create a folder for the requirements and tasks, and split the tasks into smaller ones, and create a file for the TODO list.
- r*efer to the TODO list of very small tasks*, tell the Copilot to do one task at a time, and then commit every small change of the project once it is a newer and availble version.(which makes it easier to rollback to the previous version if something goes wrong after changes from Copilot)