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

## arguments provided to repo-to-prompt.codemod.js

three arguments are provided to the script

```js
/**
 * @param {vscode} vscode the entry to vscode plugin api
 * @param {vscode.Uri} selectedFile currently selected file in vscode explorer
 * @param {vscode.Uri[]} selectedFiles currently multi-selected files in vscode explorer
 */
async function run(vscode, selectedFile, selectedFiles) {
    console.log('you can debug the script with console.log')
}
await run(vscode, selectedFile, selectedFiles);
```

* `vscode` document is here https://code.visualstudio.com/api/references/vscode-api
* `console.log` will output to 'Repo to Prompt' vscode log panel
* `fetch` is also available in vscode >= 18.x.
* in https://githbu.dev environment, `require` is not available
* `runCodemod` allow one codemod.js call another codemod.js

## multiple repo-to-prompt.codemod.js?

If you want to have multiple js files to export the repository in different format. 
You can define multiple `xxx.codemod.js` files. 
Use keyboard short `ctrl+'` to pick from all `*.codemod.js` files. 
However, script executed from shortcut does not have access to `selectedFile` or `selectedFiles`.

## repo-map.codemod.js

```js
const { CLAUDE_API_URL, CLAUDE_API_KEY } = vscode.workspace.getConfiguration('taowen.repo-to-prompt')
if (!CLAUDE_API_KEY) {
    vscode.window.showInformationMessage('please set taowen.repo-to-prompt.CLAUDE_API_KEY in your settings.json')
    return;
}
const repoMapUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'repo-map.json')
let repoMap = {}
try {
    repoMap = JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(repoMapUri)))
} catch(e) {
    // ignore
}
async function updateRepoMap(filePath, fileSummary) {
    repoMap[filePath] = fileSummary
    await vscode.workspace.fs.writeFile(repoMapUri, new TextEncoder().encode(JSON.stringify(repoMap, undefined, '  ')))
}
async function summarizeFile(filePath, fileContent) {
    for (let i = 0; i < 3; i++) {

        console.log('summarize', filePath)
        const resp = await fetch(CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                "x-api-key": CLAUDE_API_KEY,
                "anthropic-version": '2023-06-01',
                "content-type": "application/json",
            },
            body: JSON.stringify({
                "model": 'claude-3-haiku-20240307',
                "max_tokens": 4000,
                "messages": [{
                    role: "user", content: `
    ${fileContent}
    summarize the file ${filePath} into a sentence
                    `
                }, {
                    role: 'assistant', content: `The file '${filePath}' contains`
                }]
            })
        })
        const respJson = await resp.json()
        if (!respJson.content) {
            console.log('failed', JSON.stringify(respJson))
            await new Promise(resolve => setTimeout(resolve, 3000))
            continue
        }
        console.log(respJson.content[0].text)
        return respJson.content[0].text
    }
    throw new Error('failed to summarize')
}
async function walkDirectory(uri) {
    const children = await vscode.workspace.fs.readDirectory(uri);
    for (const [name, type] of children) {
        if (name.startsWith('.') || name === 'node_modules' || name === 'pnpm-lock.yaml') {
            continue;
        }
        const childUri = vscode.Uri.joinPath(uri, name);
        if (type === vscode.FileType.Directory) {
            await walkDirectory(childUri);
        } else if (type === vscode.FileType.File && (name.endsWith('.py') || name.endsWith('.yaml'))) {
            const relPath = vscode.workspace.asRelativePath(childUri)
            if (relPath in repoMap) {
                console.log('skip', relPath)
                continue
            }
            const fileLines = []
            fileLines.push('<file path="' + relPath + '">')
            fileLines.push(new TextDecoder().decode(await vscode.workspace.fs.readFile(childUri)))
            fileLines.push('</file>')
            const fileContent = fileLines.join('\n')
            const fileSummary = await summarizeFile(relPath, fileContent)
            await updateRepoMap(relPath, fileSummary.trim())
        }
    }
}
for (const folder of vscode.workspace.workspaceFolders) {
    await walkDirectory(folder.uri);
}
return repoMap
```

this is a reusable codemod to generate repoMap.json from code repository

## use repoMap.json to select files based on `<user-questions>`

```js
const { CLAUDE_API_URL, CLAUDE_API_KEY } = vscode.workspace.getConfiguration('taowen.repo-to-prompt')
if (!CLAUDE_API_KEY) {
    vscode.window.showInformationMessage('please set taowen.repo-to-prompt.CLAUDE_API_KEY in your settings.json')
    return;
}
/**
 * @returns {string}
 */
async function selectFiles() {
    const repoMap = await runCodemod('repo-map.codemod.js')
    const lines = []
    for (const [k, v] of Object.entries(repoMap)) {
        lines.push(`<${k}>`)
        lines.push(v.trim())
        lines.push(`</${k}>`)
    }
    const prompt = `
${lines.join('\n')}
===
<user-questions>
How sweepai refactor the code?
How to construct refactor prompt?
</user-questions>

We do NOT answer <user-questions>, but list the related files in JSON string array format. Do not comment.`
    const resp = await fetch(CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": '2023-06-01',
            "content-type": "application/json",
        },
        body: JSON.stringify({
            "model": 'claude-3-sonnet-20240229',
            "max_tokens": 4000,
            "messages": [{
                role: "user", content: prompt
            }]
        })
    })
    const respJson = await resp.json()
    console.log(respJson.content[0].text)
    return respJson.content[0].text
}
let resp = await selectFiles()
resp = resp.substring(resp.indexOf('[') + 1, resp.indexOf(']'))
resp = `[${resp}]`
const lines = []
for (let path of JSON.parse(resp)) {
    if (path[0] === '<') {
        path = path.substring(1)
    }
    if (path[path.length - 1] === '>') {
        path = path.substring(0, path.length - 1)
    }
    const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, path)
    try {
        await vscode.workspace.fs.stat(uri);
        lines.push(`<${path}>`)
        lines.push(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri)))
        lines.push(`</${path}>`)
        console.log('select file', path)
    } catch (e) {
        console.log('ignore file', path, e.stack)
    }
}
await vscode.env.clipboard.writeText(lines.join('\n'))
vscode.window.showInformationMessage('copied to clipboard')
```

When the code repository to too large to select manually, we can use sonnet LLM to select files using repoMap.json as information index.

# links to similar tools

* html to prompt: https://gist.github.com/taowen/95ae056924f33bafa809cb4147e52566
* arxiv to prompt: https://gist.github.com/taowen/3a0ee294ae60fd7e8f14f4af81edf38e
* youtube to prompt: https://gist.github.com/taowen/2a49387d5abc195ba57acbb94f4dd28f
