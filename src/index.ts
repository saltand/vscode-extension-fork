import type { ExtensionContext, Uri, WorkspaceFolder } from 'vscode'
import { exec, execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process, { env as nodeEnv } from 'node:process'
import { promisify } from 'node:util'
import { commands, StatusBarAlignment, env as vscodeEnv, window, workspace } from 'vscode'

const execFileAsync = promisify(execFile)

async function toWindowsPath(wslPath: string): Promise<string> {
  const { stdout } = await execFileAsync('wslpath', ['-w', wslPath])
  return stdout.trim()
}

async function toWslPath(winPath: string): Promise<string> {
  const { stdout } = await execFileAsync('wslpath', ['-a', winPath])
  return stdout.trim()
}

async function openWSL(rootPath: string) {
  try {
    const winRepo = await toWindowsPath(rootPath)

    const configured = workspace.getConfiguration('fork').get<string>('executablePath') || ''
    const exeWslCandidates: string[] = []

    if (configured) {
      if (/^[a-z]:\\|^\\\\\\\\/i.test(configured) || configured.includes('\\')) {
        try {
          const p = await toWslPath(configured)
          exeWslCandidates.push(p)
        }
        catch {}
      }
      else {
        exeWslCandidates.push(configured)
      }
    }

    exeWslCandidates.push(
      '/mnt/c/Program Files/Fork/Fork.exe',
      '/mnt/c/Program Files (x86)/Fork/Fork.exe',
    )

    const exeWsl = exeWslCandidates.find(p => !!p && existsSync(p))
    if (!exeWsl) {
      window.showErrorMessage('Fork error (WSL): Could not find Fork.exe. Please set "fork.executablePath" (Windows path).')
      return
    }

    execFile(exeWsl, [winRepo], (err: any) => {
      if (err)
        window.showErrorMessage(`Fork error (WSL): ${err.message || err}`)
    })
  }
  catch (e: any) {
    window.showErrorMessage(`Fork error (WSL): ${e?.message || e}`)
  }
}

async function openWithFork(rootPath: string) {
  if (vscodeEnv.remoteName === 'wsl') {
    await openWSL(rootPath)
    return
  }
  const platform = process.platform
  if (platform === 'darwin') {
    const quoted = rootPath.replace(/"/g, '\\"')
    exec(`open -a "Fork" "${quoted}"`, (err: any) => {
      if (err) {
        window.showErrorMessage(`Fork error: ${err}`)
      }
    })
    return
  }

  if (platform === 'win32') {
    const configured = workspace.getConfiguration('fork').get<string>('executablePath') || ''
    const candidates: string[] = []
    if (configured)
      candidates.push(configured)
    if (nodeEnv.LOCALAPPDATA)
      candidates.push(join(nodeEnv.LOCALAPPDATA, 'Fork', 'Fork.exe'))
    if (nodeEnv.ProgramFiles)
      candidates.push(join(nodeEnv.ProgramFiles, 'Fork', 'Fork.exe'))
    if (nodeEnv['ProgramFiles(x86)'] as string | undefined)
      candidates.push(join(nodeEnv['ProgramFiles(x86)'] as string, 'Fork', 'Fork.exe'))

    const exe = candidates.find(p => !!p && existsSync(p))
    if (!exe) {
      window.showErrorMessage('Fork error: Could not find Fork.exe. Please set "fork.executablePath" in settings.')
      return
    }

    execFile(exe, [rootPath], (err: any) => {
      if (err)
        window.showErrorMessage(`Fork error: ${err.message || err}`)
    })
    return
  }

  window.showErrorMessage('Fork error: Unsupported platform. Only macOS and Windows are supported currently.')
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

  // Status bar button on the right bottom corner
  const sb = window.createStatusBarItem(StatusBarAlignment.Right, 0)
  sb.name = 'Fork'
  sb.text = '$(git-merge)'
  sb.tooltip = 'Fork: open current git repository at fork app'
  sb.command = 'fork.open'
  sb.show()

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

  context.subscriptions.push(openCmd, openHereCmd, sb)
}

// this method is called when your extension is deactivated
export async function deactivate() {}
