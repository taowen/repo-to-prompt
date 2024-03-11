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
        runCodemod(codemods.get(selection))
    }
  });
  context.subscriptions.push(disposable);
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
                  if (entryType === vscode.FileType.File && entryName.endsWith('.codemod.ts')) {
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
*/
async function runCodemod(codemodUri) {
  const codemod = loadCodemod(codemodUri)
  try {
      await codemod.run();
      console.log('[codemod] exedcuted ' + codemodUri.fsPath)
  } catch(e) {
      console.log(`[codemod] failed to execute ${codemodUri.fsPath} ${e.stack}`)
  }
}

/**
* @param {vscode.Uri} codemodUri 
* @returns 
*/
function loadCodemod(codemodUri) {
  const resolvedPath = require.resolve(codemodUri.fsPath)
  const resolvedDir = require('path').dirname(resolvedPath)
  for (const cachedPath of Object.keys(require.cache)) {
      if (cachedPath.startsWith(resolvedDir)) {
          delete require.cache[cachedPath]
      }
  }
  try {
      const codemod = require(codemodUri.fsPath)
      return codemod
  } catch(e) {
      console.log(`[codemod] failed to load ${resolvedPath} ${e.stack}`)
      throw e;
  }
}