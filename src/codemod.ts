import * as vscode from 'vscode';

export async function listCodemods() {
    const codemods = new Map<string, vscode.Uri>();
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

export async function runCodemod(codemodUri: vscode.Uri) {
    const codemod = loadCodemod(codemodUri)
    try {
        await codemod.run();
        console.log('[codemod] exedcuted ' + codemodUri.fsPath)
    } catch(e: any) {
        console.log(`[codemod] failed to execute ${codemodUri.fsPath} ${e.stack}`)
    }
}

function loadCodemod(codemodUri: vscode.Uri) {
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
    } catch(e: any) {
        console.log(`[codemod] failed to load ${resolvedPath} ${e.stack}`)
        throw e;
    }
}