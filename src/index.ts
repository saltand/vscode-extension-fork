import type { ExtensionContext, Uri, WorkspaceFolder } from 'vscode'
import { exec } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { commands, StatusBarAlignment, window, workspace } from 'vscode'

function getDefaultWindowsForkPath(): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local')
  return path.join(localAppData, 'Fork', 'current', 'Fork.exe')
}

async function openWithFork(rootPath: string) {
  const platform = process.platform
  if (platform === 'darwin') {
    const quoted = rootPath.replace(/\"/g, '\\\"')
    exec(`open -a "Fork" "${quoted}"`, (err: any) => {
      if (err) {
        window.showErrorMessage(`Fork error: ${err}`)
      }
    })
    return
  }

  if (platform === 'win32') {
    const config = workspace.getConfiguration('fork')
    const forkPath = config.get<string>('windowsPath') || getDefaultWindowsForkPath()
    const quoted = rootPath.replace(/"/g, '\\"')
    exec(`"${forkPath}" "${quoted}"`, (err: any) => {
      if (err) {
        window.showErrorMessage(`Fork error: ${err}`)
      }
    })
    return
  }

  window.showErrorMessage('Fork error: Unsupported platform. Only macOS and Windows are supported.')
}

async function resolveRootPath(uri?: Uri): Promise<string | undefined> {
  if (uri) {
    const wf = workspace.getWorkspaceFolder(uri)
    if (wf)
      return wf.uri.fsPath
    return uri.fsPath
  }

  const activeEditor = window.activeTextEditor
  if (activeEditor) {
    const workspaceFolder = workspace.getWorkspaceFolder(activeEditor.document.uri)
    if (workspaceFolder)
      return workspaceFolder.uri.fsPath
  }

  const folders = workspace.workspaceFolders
  if (!folders || folders.length === 0)
    return undefined
  if (folders.length === 1)
    return folders[0].uri.fsPath

  const items = folders.map(f => ({
    label: f.name,
    description: f.uri.fsPath,
    folder: f,
  }))
  const pick = await window.showQuickPick(items, {
    placeHolder: 'Select a workspace folder to open in Fork',
    canPickMany: false,
  }) as (undefined | { folder: WorkspaceFolder })
  return pick?.folder?.uri.fsPath
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  // eslint-disable-next-line no-console
  console.log('Congratulations, your extension "fork" is now active!')

  const openCmd = commands.registerCommand('fork.open', async () => {
    const rootPath = await resolveRootPath()
    if (!rootPath) {
      window.showErrorMessage('Fork error: Working folder not found, open a folder and try again')
      return
    }
    await openWithFork(rootPath)
  })

  const openHereCmd = commands.registerCommand('fork.openHere', async (uri?: Uri) => {
    const rootPath = await resolveRootPath(uri)
    if (!rootPath) {
      window.showErrorMessage('Fork error: Working folder not found, open a folder and try again')
      return
    }
    await openWithFork(rootPath)
  })

  context.subscriptions.push(openCmd, openHereCmd)

  if (process.platform === 'darwin' || process.platform === 'win32') {
    // Status bar button on the right bottom corner (macOS and Windows)
    const sb = window.createStatusBarItem(StatusBarAlignment.Right, 0)
    sb.name = 'Fork'
    sb.text = '$(git-merge)'
    sb.tooltip = 'Fork: open current git repository at fork app'
    sb.command = 'fork.open'
    sb.show()
    context.subscriptions.push(sb)
  }
}

// this method is called when your extension is deactivated
export async function deactivate() {}
