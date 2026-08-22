# Keep_it!

Keep_it! is a private, offline-first Windows desktop workspace for notes, tasks, schedules, credentials, and personal finances. It combines a Next.js interface with Electron and a local SQLite database, so the installed application works without a web server or cloud account.

## Features

- Dashboard summaries for tasks, notes, vault entries, and wallet activity
- Notes with TipTap rich-text editing, pinning, folders, and archiving
- Tasks with due dates, filtering, editing, completion, and deletion
- Calendar views synchronized with dated tasks
- Multiple wallets and income, expense, and transfer transactions
- Password vault with password generation, automatic locking, and encrypted credentials
- Light, dark, and system appearance modes
- Responsive desktop layout for wide and narrow application windows
- Local SQLite persistence with no production sample data

## Install the Windows application

The generated installer is located at:

```text
release/Keep_it-Setup-0.1.0.exe
```

1. Close any development version of Keep_it! that is currently running.
2. Open `Keep_it-Setup-0.1.0.exe`.
3. Choose the installation directory when prompted.
4. Choose whether to create a desktop shortcut.
5. Complete the installation and launch Keep_it! from the shortcut or Start Menu.

The current installer is not signed with a trusted commercial certificate. Windows SmartScreen may therefore display a warning. If this is a build you generated yourself, select **More info**, verify the application name, and select **Run anyway**.

## First-time use

1. Open Keep_it! to enter the Dashboard.
2. Add tasks, notes, wallets, and transactions from their corresponding modules.
3. Open Vault to create a master password, or select **Skip for now**.
4. If vault setup was skipped, Keep_it! will request a master password when the first credential is added.

The master password cannot be recovered if it is forgotten. Store it somewhere safe.

## Local data and privacy

Keep_it! stores application data locally in a SQLite file named `keep-it.sqlite`. On Windows, the installed application normally stores this under its Electron user-data folder inside `%APPDATA%`.

- Tasks, notes, wallets, transactions, and settings are stored locally.
- Vault credential payloads are encrypted using AES-256-GCM.
- The vault key is protected using a key derived from the master password with `scrypt`.
- Other workspace data is not encrypted by the vault master password.
- No cloud synchronization, remote account, telemetry service, or online backup is currently included.

To make a manual backup, completely close Keep_it! before copying `keep-it.sqlite`. Closing the application first ensures all SQLite write-ahead-log changes have been saved consistently.

## Development requirements

- Windows 10 or Windows 11
- Node.js 22 or newer
- npm
- Git, if cloning the repository

Install project dependencies from the project directory:

```bash
npm install
```

## Run the desktop application during development

Start Next.js and Electron together with live interface updates:

```bash
npm run desktop:dev
```

This is the recommended command when developing desktop features. Electron owns the SQLite connection and securely exposes only the application operations required by the interface.

## Run only the browser interface

For interface work that does not require persistent desktop data:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

A regular browser uses temporary in-memory repositories. It does not use the installed desktop application's SQLite database.

## Test the local production application

Create the static Next.js export and run it directly in Electron:

```bash
npm run build
npm start
```

The production desktop application loads from the generated `out` directory through the local `keep-it://` protocol. It does not require `localhost` or an active internet connection.

## Build the Windows installer

Generate the static interface and the x64 NSIS installer:

```bash
npm run desktop:pack
```

Build artifacts are written to `release/`:

```text
release/
├── Keep_it-Setup-0.1.0.exe
├── Keep_it-Setup-0.1.0.exe.blockmap
└── win-unpacked/
```

To create only the unpacked Windows application without an installer:

```bash
npm run desktop:dir
```

## Quality checks

Run ESLint across the project:

```bash
npm run lint
```

Run the static-route resolver test:

```bash
node --test electron/staticFiles.test.mjs
```

Before distributing a build, run both checks, create a production installer, and manually verify tasks, notes, calendar, wallet transactions, vault setup, application restart, and data persistence.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the interface in a browser |
| `npm run desktop:dev` | Run Next.js and Electron together for development |
| `npm run build` | Create the static production interface |
| `npm start` | Run the built interface in Electron |
| `npm run desktop:dir` | Create an unpacked Windows application |
| `npm run desktop:pack` | Create the Windows installer |
| `npm run lint` | Check the project with ESLint |

## Project structure

```text
keep_it/
├── database/          SQLite migrations
├── docs/database/     Database design notes
├── electron/          Electron main process, preload bridge, and repositories
├── public/            Static public assets
├── scripts/           Desktop development helpers
├── src/app/           Next.js pages and global styles
├── src/components/    Shared interface components
├── src/context/       Shared application state
├── src/data/          Browser and Electron data clients
└── release/           Generated Windows release files
```

## Troubleshooting

### Tailwind native binding is missing

If npm reports that `@tailwindcss/oxide-win32-x64-msvc` is missing, stop the development server, remove `node_modules` and `package-lock.json`, and run:

```bash
npm install
```

### Port 3000 is already being used

Close the existing Next.js development server before starting `npm run desktop:dev`, or set a different port:

```powershell
$env:KEEP_IT_PORT = "3001"
npm run desktop:dev
```

### Production app says the interface was not found

Generate the static files before running Electron:

```bash
npm run build
npm start
```

### Windows warns about an unknown publisher

The current personal build does not have a trusted code-signing certificate. A certificate should be added before distributing Keep_it! publicly.

## Current release limitations

- Windows x64 is the only packaged target.
- There is no cloud synchronization or multi-device account.
- Automatic backups and application updates are not yet distributed.
- The installer currently uses Electron's default application icon.
- The installer is not signed with a trusted publisher certificate.

## Technology

- Next.js 16 and React 19
- Electron 43
- SQLite through Node's built-in `node:sqlite`
- Tailwind CSS 4
- TipTap
- Radix UI
- Lucide icons
- Electron Builder and NSIS
