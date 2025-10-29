# Fork

This extension provide a simple way to use Fork app.

## Features

- Quick open current workspace in Fork app.
- Explorer context menu: Right-click any file/folder and choose "Fork: open selected workspace in fork app" to open the corresponding workspace root in Fork.
- Status bar button (bottom-right): Click the Fork icon to run the same command quickly。使用内置 codicon `git-merge` 作为图标。

## Platform support

- macOS: Works out of the box using `open -a "Fork"`.
- Windows (local): Supported via `Fork.exe`. If auto-detection fails, set `fork.executablePath` in settings to the absolute path of `Fork.exe` (e.g. `C:\\Users\\you\\AppData\\Local\\Fork\\Fork.exe`).
- WSL (Remote - WSL): Supported. The extension will:
  - Convert the repo path with `wslpath -w` to a Windows path.
  - Try common locations: `C:\\Program Files\\Fork\\Fork.exe`, `C:\\Program Files (x86)\\Fork\\Fork.exe`.
  - Or use your configured Windows path `fork.executablePath` and convert it to WSL path for execution.
  - Requires WSL interop (default on) and `wslpath`.

## Release Notes

Users appreciate release notes as you update your extension.

### For more information

* [Github](https://github.com/imyangyong/vscode-extension-fork/issues)

**Enjoy it!**
