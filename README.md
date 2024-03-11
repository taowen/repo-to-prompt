# repo-to-prompt

Combine source code files into single prompt to chat with your repository. You need to customize repo-to-prompt.codemod.js to your desired output format, below are some examples

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