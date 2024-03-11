# repo-to-prompt

In vscode or https://github.dev/, combine source code files into single prompt to chat with your repository. Right click inside the vscode explorer to access 'Repo to Prompt' command. You need to customize `repo-to-prompt.codemod.js` to your desired output format, below are some examples. If there is no `repo-to-prompt.codemod.js` under the root folder, a empty one will be created for you.

## copy selected files to clipboard
```js
const lines = [];
for (const file of selectedFiles) {
    lines.push('<file path="' + file.path + '">')
    lines.push(new TextDecoder().decode(await vscode.workspace.fs.readFile(file)))
    lines.push('</file>')
}
await vscode.env.clipboard.writeText(lines.join('\n'))
vscode.window.showInformationMessage('copied to clipboard')
```

## copy all *.py files to clipboard
```js
const lines = [];
async function walkDirectory(uri) {
    const children = await vscode.workspace.fs.readDirectory(uri);
    for (const [name, type] of children) {
        if (name.startsWith('.') || name === 'node_modules') {
            continue;
        }
        console.log('search inside', name)
        const childUri = vscode.Uri.joinPath(uri, name);
        if (type === vscode.FileType.Directory) {
            await walkDirectory(childUri);
        } else if (type === vscode.FileType.File && name.endsWith('.py')) {
            lines.push('<file path="' + childUri.path + '">')
            lines.push(new TextDecoder().decode(await vscode.workspace.fs.readFile(childUri)))
            lines.push('</file>')
        }
    }
}
for (const folder of vscode.workspace.workspaceFolders) {
    await walkDirectory(folder.uri);
}
await vscode.env.clipboard.writeText(lines.join('\n'))
vscode.window.showInformationMessage('copied to clipboard')
```

# links to similar tools

* arxiv to prompt: https://gist.github.com/taowen/3a0ee294ae60fd7e8f14f4af81edf38e
* youtube to prompt: https://gist.github.com/taowen/2a49387d5abc195ba57acbb94f4dd28f