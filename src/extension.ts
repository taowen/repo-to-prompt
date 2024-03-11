import * as vscode from 'vscode';
import { listCodemods, runCodemod } from './codemod';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("repo-to-prompt");
  context.subscriptions.push(outputChannel);
  const oldLog = console.log;
  Object.defineProperty(console, 'log', {
    get() {
        return function(...args: any[]) {
            oldLog.apply(console, args);
            const message = args.map(arg => `${arg}`).join(' ')
            outputChannel.appendLine(message)
        };
    }
  });
  let disposable = vscode.commands.registerCommand('extension.runCodemod', async () => {
    const codemods = await listCodemods()
    if (codemods.size === 0) {
        vscode.window.showInformationMessage(`Please create .codemods folder under workspace, and name the scripts like *.codemod.ts`);
        return;
    }
    const items = Array.from(codemods.keys());
    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Choose codemod to run'
    });
    if (selection) {
        runCodemod(codemods.get(selection)!)
    }
  });
  context.subscriptions.push(disposable);
}

export function deactivate() {}