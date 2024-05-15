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

## code repo QA by gemini-1.5-flash-latest

```js
const { GEMINI_API_URL, GEMINI_API_KEY } = vscode.workspace.getConfiguration('taowen.repo-to-prompt')
if (!GEMINI_API_KEY) {
    // 查看 -> 命令面板 -> 首选项：打开用户设置（JSON）
    vscode.window.showInformationMessage('please set taowen.repo-to-prompt.GEMINI_API_KEY in your settings.json')
    return;
}
const SEARCH_IN_DIRS = ['src/modules/navigator','src/modules/ekf2']
const USER_QUESTION = 'navigator 和 ekf2 模块之间是通过什么通信的？'
const MODEL = 'gemini-1.5-flash-latest'
/*
执行结果如下：
请求大小：779174
navigator 和 ekf2 模块之间是通过 **uORB** 通信的。

**uORB** 是 PX4 中的一种基于发布/订阅的进程间通信机制，它允许不同模块之间交换数据。

**navigator 模块** 订阅 ekf2 发布的以下 uORB 主题：

* **vehicle_local_position**: 包含本地位置信息，例如 x, y, z 坐标、速度、加速度和航向。
* **vehicle_attitude**: 包含姿态信息，例如四元数和欧拉角。
* **vehicle_global_position**: 包含全局位置信息，例如经度、纬度和海拔高度。
* **vehicle_odometry**: 包含里程计信息，例如位姿、速度和角速度。
* **vehicle_status**: 包含飞行器状态信息，例如起飞状态、着陆状态和飞行模式。
* **vehicle_land_detected**: 包含着陆检测信息。
* **wind**: 包含风速信息 (仅当 ekf2 配置为估计风速时)。
* **sensor_combined**: 包含 IMU 数据 (仅当 ekf2 使用 sensor_combined 主题时)。

**ekf2 模块** 订阅 navigator 发布的以下 uORB 主题：

* **vehicle_command**: 包含导航器发出的命令，例如重新定位、切换模式和执行任务。

**工作流程：**

1. ekf2 估计姿态、位置、速度和风速等信息，并通过相应的 uORB 主题发布。
2. navigator 订阅这些主题，并使用这些信息来执行导航任务，例如遵循航点、返回起点或着陆。
3. navigator 使用 vehicle_command 主题向 ekf2 发送命令，例如重新定位到特定位置或切换到特定的飞行模式。

因此，navigator 和 ekf2 通过 uORB 主题交换数据和命令，以协调飞行器自主飞行。
*/
// === implementation ===
const utf8decoder = new TextDecoder()
const utf8encoder = new TextEncoder()
const rootDir = vscode.workspace.workspaceFolders[0].uri
async function readFile(file) {
    return utf8decoder.decode(await vscode.workspace.fs.readFile(file)).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
}
const lines = []
async function walkDirectory(uri) {
    const children = await vscode.workspace.fs.readDirectory(uri);
    for (const [name, type] of children) {
        if (name.startsWith('.') || name === 'node_modules' || name === 'pnpm-lock.yaml') {
            continue;
        }
        const childUri = vscode.Uri.joinPath(uri, name);
        if (type === vscode.FileType.Directory) {
            if (name.includes('test')) {
                continue
            }
            await walkDirectory(childUri);
        } else if (type === vscode.FileType.File && (name.endsWith('.c') || name.endsWith('.cpp') || name.endsWith('.py') || name.endsWith('.js') || name.endsWith('.ts'))) {
            const relPath = vscode.workspace.asRelativePath(childUri)
            lines.push(`<file path="${relPath}">`)
            lines.push(await readFile(childUri))
            lines.push('</file>')
        }
    }
}
async function main() {
    for (const searchInDir of SEARCH_IN_DIRS) {
        await walkDirectory(vscode.Uri.joinPath(rootDir, searchInDir))
    }
    lines.push(USER_QUESTION)
    const url = GEMINI_API_URL || 'https://generativelanguage.googleapis.com'
    const body = JSON.stringify({
        "contents": [{
          "parts":[{
            "text": lines.join('\n')}]}]})
    console.log(`请求大小：${body.length}`)
    const resp = await fetch(`${url}/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body
    })
    const respJson = await resp.json()
    try {
        console.log(respJson.candidates[0].content.parts[0].text)
    } catch {
        console.log(JSON.stringify(respJson, undefined, '  '))
    }
}
try {
    await main()
} catch(e) {
    console.log('failed', e)
}
```

# links to similar tools

* html to prompt: https://gist.github.com/taowen/95ae056924f33bafa809cb4147e52566
* arxiv to prompt: https://gist.github.com/taowen/3a0ee294ae60fd7e8f14f4af81edf38e
* youtube to prompt: https://gist.github.com/taowen/2a49387d5abc195ba57acbb94f4dd28f
* pdf to prompt: https://gist.github.com/taowen/4ce9de62255ded695db106ded4aa18c1
* audio to prompt: https://huggingface.co/spaces/Xenova/whisper-web
* token counter: https://huggingface.co/spaces/Xenova/the-tokenizer-playground
