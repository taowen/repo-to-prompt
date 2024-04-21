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

## filter relevant files using claude 3 haiku

```js
let USER_QUESTIONS = `
代码中的静止检测算法分为几种？每一种静止检测算法完整的上下游数据流是怎样的？
`
const { CLAUDE_API_URL, CLAUDE_API_KEY } = vscode.workspace.getConfiguration('taowen.repo-to-prompt')
if (!CLAUDE_API_KEY) {
    vscode.window.showInformationMessage('please set taowen.repo-to-prompt.CLAUDE_API_KEY in your settings.json')
    return;
}
const utf8decoder = new TextDecoder()
const utf8encoder = new TextEncoder()
const rootDir = vscode.workspace.workspaceFolders[0].uri
const files = []
let chunkLines = ''
let chunkFiles = []
let counter = 0
async function walkDirectory(uri) {
    const children = await vscode.workspace.fs.readDirectory(uri);
    for (const [name, type] of children) {
        if (name.startsWith('.') || name === 'node_modules' || name === 'pnpm-lock.yaml') {
            continue;
        }
        const childUri = vscode.Uri.joinPath(uri, name);
        if (type === vscode.FileType.Directory) {
            await walkDirectory(childUri);
        } else if (type === vscode.FileType.File && (name.endsWith('.c') || name.endsWith('.cpp'))) {
            const relPath = vscode.workspace.asRelativePath(childUri)
            if (relPath.includes('test')) {
                continue
            }
            const content = await readFile(childUri)
            if (!content.trim()) {
                continue
            }
            files.push(childUri)
        }
    }
}
async function readPreviousAnswer(answerFile) {
    try {
        return JSON.parse(utf8decoder.decode(await vscode.workspace.fs.readFile(answerFile))).content[0].text
    } catch(e) {
        // ignore
        return undefined
    }
}
async function askClaude(answerFile, question) {
    let answer = await readPreviousAnswer(answerFile)
    if (answer) {
        return answer;
    }
    console.log('asking question', answerFile.path)
    const resp = await fetch(CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: {
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": '2023-06-01',
            "content-type": "application/json",
        }, body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 4000,
            temperature: 0,
            messages: [{ role: "user", content: question }] })
    });
    const respJson = await resp.json()
    await vscode.workspace.fs.writeFile(answerFile, utf8encoder.encode(JSON.stringify(respJson, undefined, '  ')))
    return respJson.content[0].text
}
function extractScores(answer) {
    answer = answer.substring(answer.indexOf('<relevance-score>'))
    answer = answer.substring('<relevance-score>'.length)
    answer = answer.substring(0, answer.indexOf('</relevance-score>'))
    const scores = {}
    for (let line of answer.split('\n')) {
        line = line.trim()
        if (line.length === 0) {
            continue
        }
        const [relPath, score] = line.split(':', 2)
        scores[relPath.trim()] = Number.parseInt(score.trim())
    }
    return scores
}
async function writeScoreQuestion(questionFile, chunkLines, chunkFiles) {
    chunkLines += `
<user-questions>
${USER_QUESTIONS}
</user-questions>
based on relevance to user questions give following files a score in range 1 to 10.
output in this format
<relevance-score>
`
    for (const relPath of chunkFiles) {
        chunkLines += `${relPath}: n\n`
    }
    chunkLines += '</relevance-score>'
    await vscode.workspace.fs.writeFile(questionFile, utf8encoder.encode(chunkLines))
    return chunkLines
}
async function filterChunk(relevantFiles) {
    counter += 1
    const questionFile = vscode.Uri.joinPath(rootDir, `question-${counter}.txt`)
    const question = await writeScoreQuestion(questionFile, chunkLines, chunkFiles)
    const answerFile = vscode.Uri.joinPath(rootDir, `question-${counter}-answer.txt`)
    const answer = await askClaude(answerFile, question)
    for (const [relPath, score] of Object.entries(extractScores(answer))) {
        if (score >= 7) {
            relevantFiles.add(relPath)
        }
    }
    chunkLines = ''
    chunkFiles = []
    return relevantFiles
}

await walkDirectory(vscode.Uri.joinPath(rootDir, 'src/modules/ekf2'))
await walkDirectory(vscode.Uri.joinPath(rootDir, 'src/modules/land_detector'))

var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function readFile(file) {
    return utf8decoder.decode(await vscode.workspace.fs.readFile(file)).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
}

async function filterAll(relevantFiles) {
    shuffle(files)
    for (const file of files) {
        const relPath = vscode.workspace.asRelativePath(file)
        if (relevantFiles.has(relPath)) {
            continue
        }
        const content = await readFile(file)
        chunkLines += '\n<file path="' + relPath + '">\n'
        chunkLines += content
        chunkLines += '\n</file>\n'
        chunkFiles.push(relPath)
        if (chunkLines.length > 200 * 1000 || chunkFiles.length > 15) {
            await filterChunk(relevantFiles)
        }
    }
    await filterChunk(relevantFiles)
    console.log('relevant files', JSON.stringify(Array.from(relevantFiles), undefined, '  '))
}

const relevantFiles = new Set()
await filterAll(relevantFiles)
// USER_QUESTIONS += '\nBesides these files\n'
// for (const relPath of relevantFiles) {
//     USER_QUESTIONS += relPath
//     USER_QUESTIONS += '\n'
// }
// USER_QUESTIONS += 'What extra files need to be included to answer the questions?'
// await filterAll(relevantFiles)
let concatedRelevantFiles = ''
for (const relPath of relevantFiles) {
    const relevantFile = vscode.Uri.joinPath(rootDir, relPath)
    concatedRelevantFiles += '\n<' + relPath + '>\n'
    concatedRelevantFiles += await readFile(relevantFile)
    concatedRelevantFiles += '\n</' + relPath + '>\n'
}
await vscode.env.clipboard.writeText(concatedRelevantFiles)
vscode.window.showInformationMessage('copied to clipboard')
```

You need to manually update USER_QUESTIONS and walkDirectory(xxx) first. Then run repo-to-prompt to call claude api to filter each file based on the question.

# links to similar tools

* html to prompt: https://gist.github.com/taowen/95ae056924f33bafa809cb4147e52566
* arxiv to prompt: https://gist.github.com/taowen/3a0ee294ae60fd7e8f14f4af81edf38e
* youtube to prompt: https://gist.github.com/taowen/2a49387d5abc195ba57acbb94f4dd28f
* pdf to prompt: https://gist.github.com/taowen/4ce9de62255ded695db106ded4aa18c1
* audio to prompt: https://huggingface.co/spaces/Xenova/whisper-web
* token counter: https://huggingface.co/spaces/Xenova/the-tokenizer-playground
