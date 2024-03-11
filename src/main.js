const vscode = require('vscode')

/**
 * @param {vscode.ExtensionContext} context 
 */
function activate(context) {
  const outputChannel = vscode.window.createOutputChannel("Repo to Prompt");
  context.subscriptions.push(outputChannel);
  const oldLog = console.log;
  Object.defineProperty(console, 'log', {
    get() {
        return function(...args) {
            oldLog.apply(console, args);
            const message = args.map(arg => `${arg}`).join(' ')
            outputChannel.appendLine(message)
        };
    }
  });
  context.subscriptions.push(vscode.commands.registerCommand('extension.runCodemod', async () => {
    try {
      const codemods = await listCodemods()
      if (codemods.size === 0) {
          vscode.window.showInformationMessage(`Please create .codemods folder under workspace, and name the scripts like *.codemod.js`);
          return;
      }
      const items = Array.from(codemods.keys());
      const selection = await vscode.window.showQuickPick(items, {
          placeHolder: 'Choose codemod to run'
      });
      if (selection) {
          await runCodemod(codemods.get(selection))
      }
    } catch(e) {
      console.log('failed to handle runCodemod', e);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand('extension.repoToPrompt', async (selectedFile, selectedFiles) => {
    try {
      let codemods = await listCodemods()
      if (!codemods.get('repo-to-prompt.codemod.js')) {
        console.log('create dummy repo-to-prompt.codemod.js')
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.codemods'))
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.codemods', 'repo-to-prompt.codemod.js'), Buffer.from(`
/**
 * @param {vscode} vscode the entry to vscode plugin api
 * @param {vscode.Uri} selectedFile currently selected file in vscode explorer
 * @param {vscode.Uri[]} selectedFiles currently multi-selected files in vscode explorer
 */
async function run(vscode, selectedFile, selectedFiles) {
    console.log('you can debug the script with console.log')
}
await run(vscode, selectedFile, selectedFiles);`, 'utf8'))
        codemods = await listCodemods()
      }
      if (!codemods.get('repo-to-prompt.codemod.js')) {
        console.log('can not find repo-to-prompt.codemod.js')
        return;
      }
      await runCodemod(codemods.get('repo-to-prompt.codemod.js'), selectedFile, selectedFiles)
    } catch(e) {
      console.log('failed to handle repoToPrompt', e)
    }
  }));
}

function deactivate() {}

module.exports = { activate, deactivate }

async function listCodemods() {
  const codemods = new Map();
  if (!vscode.workspace.workspaceFolders) {
      return codemods;
  }
  for (const folder of vscode.workspace.workspaceFolders) {
      const codemodsFolderUri = vscode.Uri.joinPath(folder.uri, '.codemods');
      try {
          const stat = await vscode.workspace.fs.stat(codemodsFolderUri);
          if (stat.type === vscode.FileType.Directory) {
              const entries = await vscode.workspace.fs.readDirectory(codemodsFolderUri);
              for (const [entryName, entryType] of entries) {
                  if (entryType === vscode.FileType.File && entryName.endsWith('.codemod.js')) {
                      codemods.set(entryName, vscode.Uri.joinPath(codemodsFolderUri, entryName))
                  }
              }
          }
      } catch(e) {
          // ignore folder not found
      }
  }
  return codemods
}

/**
* @param {vscode.Uri} codemodUri 
* @param {vscode.Uri | undefined} selectedFile 
* @param {vscode.Uri[] | undefined} selectedFiles 
*/
async function runCodemod(codemodUri, selectedFile, selectedFiles) {
  const codemod = await loadCodemod(codemodUri)
  try {
      console.log('[codemod] execute ' + codemodUri.fsPath)
      const returnValue = await codemod(vscode, selectedFile, selectedFiles);
      if (returnValue !== undefined) {
        console.log('[codemod] return value ' + JSON.stringify(returnValue))
      }
  } catch(e) {
      console.log(`[codemod] failed to execute ${codemodUri.fsPath} ${e.stack}`)
  }
}

/**
* @param {vscode.Uri} codemodUri 
* @returns 
*/
async function loadCodemod(codemodUri) {
  const file = await vscode.workspace.fs.readFile(codemodUri);
  return new Function('vscode', 'selectedFile', 'selectedFiles', 'return (async () => { ' + file.toString() + ' })()');
}