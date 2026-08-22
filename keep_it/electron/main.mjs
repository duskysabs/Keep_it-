import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app, BrowserWindow, ipcMain, net, protocol, shell } from "electron";
import { createNoteRepository } from "../src/data/notes/noteRepository.js";
import { createTaskRepository } from "../src/data/tasks/taskRepository.js";
import { createWalletRepository } from "../src/data/wallets/walletRepository.js";
import { createSqliteAdapter } from "./database.mjs";
import { resolveStaticFile } from "./staticFiles.mjs";
import { createVaultRepository } from "./vaultRepository.mjs";

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));
const projectDirectory = join(currentDirectory, "..");
const developmentUrl = process.env.KEEP_IT_DEV_URL || "";
const localAppUrl = "keep-it://app/";
const allowedDevelopmentOrigin = developmentUrl ? new URL(developmentUrl).origin : "";
const smokeTest = process.env.KEEP_IT_SMOKE_TEST === "1";

protocol.registerSchemesAsPrivileged([{
  scheme: "keep-it",
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
  },
}]);

if (process.env.KEEP_IT_USER_DATA) app.setPath("userData", process.env.KEEP_IT_USER_DATA);

let database;
let vaultRepository;

const isAllowedNavigation = (targetUrl) => {
  try {
    const parsedUrl = new URL(targetUrl);
    if (developmentUrl) return parsedUrl.origin === allowedDevelopmentOrigin;
    return parsedUrl.protocol === "keep-it:" && parsedUrl.host === "app";
  } catch {
    return false;
  }
};

const registerStaticFileHandler = () => {
  const staticDirectory = join(app.isPackaged ? app.getAppPath() : projectDirectory, "out");
  const indexPath = join(staticDirectory, "index.html");

  if (!existsSync(indexPath)) {
    throw new Error(`The desktop interface was not found at ${indexPath}. Run npm run build first.`);
  }

  protocol.handle("keep-it", (request) => {
    const requestUrl = new URL(request.url);
    if (requestUrl.host !== "app") return new Response("Not found", { status: 404 });
    const filePath = resolveStaticFile({ requestUrl: request.url, staticDirectory });
    if (!filePath) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(filePath).toString());
  });
};

const registerTaskHandlers = (repository) => {
  const handlers = {
    "tasks:list": (_event, options) => repository.listTasks(options),
    "tasks:get": (_event, id) => repository.getTask(id),
    "tasks:create": (_event, task) => repository.createTask(task),
    "tasks:update": (_event, id, changes) => repository.updateTask(id, changes),
    "tasks:toggle": (_event, id) => repository.toggleTask(id),
    "tasks:delete": (_event, id) => repository.deleteTask(id),
    "tasks:list-for-date": (_event, date) => repository.listTasksForDate(date),
    "tasks:list-attention": (_event, limit) => repository.listAttentionTasks(limit),
    "tasks:list-upcoming": (_event, options) => repository.listUpcomingTasks(options),
  };

  for (const [channel, handler] of Object.entries(handlers)) ipcMain.handle(channel, handler);
};

const registerNoteHandlers = (repository) => {
  const handlers = {
    "notes:list": (_event, options) => repository.listNotes(options),
    "notes:get": (_event, id) => repository.getNote(id),
    "notes:create": (_event, note) => repository.createNote(note),
    "notes:update": (_event, id, changes) => repository.updateNote(id, changes),
    "notes:delete": (_event, id) => repository.deleteNote(id),
  };

  for (const [channel, handler] of Object.entries(handlers)) ipcMain.handle(channel, handler);
};

const registerWalletHandlers = (repository) => {
  const handlers = {
    "wallets:list": () => repository.listWallets(),
    "wallets:get": (_event, id) => repository.getWallet(id),
    "wallets:create": (_event, wallet) => repository.createWallet(wallet),
    "wallets:update": (_event, id, changes) => repository.updateWallet(id, changes),
    "wallets:delete": (_event, id) => repository.deleteWallet(id),
    "transactions:list": () => repository.listTransactions(),
    "transactions:get": (_event, id) => repository.getTransaction(id),
    "transactions:create": (_event, transaction) => repository.createTransaction(transaction),
    "transactions:update": (_event, id, changes) => repository.updateTransaction(id, changes),
    "transactions:delete": (_event, id) => repository.deleteTransaction(id),
  };

  for (const [channel, handler] of Object.entries(handlers)) ipcMain.handle(channel, handler);
};

const registerVaultHandlers = (repository) => {
  const handlers = {
    "vault:status": () => repository.status(),
    "vault:setup": (_event, masterPassword) => repository.setup(masterPassword),
    "vault:unlock": (_event, masterPassword) => repository.unlock(masterPassword),
    "vault:lock": () => repository.lock(),
    "vault:change-master-password": (_event, passwords) => repository.changeMasterPassword(passwords),
    "vault:list": () => repository.listCredentials(),
    "vault:get": (_event, id) => repository.getCredential(id),
    "vault:create": (_event, credential) => repository.createCredential(credential),
    "vault:update": (_event, id, changes) => repository.updateCredential(id, changes),
    "vault:delete": (_event, id) => repository.deleteCredential(id),
    "vault:update-settings": (_event, changes) => repository.updateSettings(changes),
    "vault:activity": () => repository.activity(),
  };

  for (const [channel, handler] of Object.entries(handlers)) ipcMain.handle(channel, handler);
};

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 560,
    show: !smokeTest,
    backgroundColor: "#f8fafc",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(currentDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) event.preventDefault();
  });

  if (smokeTest) {
    const timeout = setTimeout(() => {
      console.error("Electron smoke test timed out.");
      app.exit(1);
    }, 15_000);

    window.webContents.once("did-fail-load", (_event, code, description) => {
      clearTimeout(timeout);
      console.error(`Electron smoke test failed to load: ${code} ${description}`);
      app.exit(1);
    });

    window.webContents.once("did-finish-load", async () => {
      try {
        const counts = await window.webContents.executeJavaScript("Promise.all([window.keepIt.tasks.list(), window.keepIt.notes.list(), window.keepIt.wallets.listWallets(), window.keepIt.wallets.listTransactions(), window.keepIt.vault.status()]).then(([tasks, notes, wallets, transactions, vault]) => ({ tasks: tasks.length, notes: notes.length, wallets: wallets.length, transactions: transactions.length, vaultConfigured: vault.configured }))");
        let localRouteCount = 0;
        if (!developmentUrl) {
          const routeResults = await window.webContents.executeJavaScript(`Promise.all(${JSON.stringify(["/", "/calendar/", "/notes/", "/settings/", "/tasks/", "/vault/", "/wallet/"])}.map(async (route) => { const response = await fetch(new URL(route, location.href)); return { route, ok: response.ok }; }))`);
          const failedRoute = routeResults.find((result) => !result.ok);
          if (failedRoute) throw new Error(`Local route failed to load: ${failedRoute.route}`);
          localRouteCount = routeResults.length;
        }
        clearTimeout(timeout);
        const routeSummary = localRouteCount ? `, ${localRouteCount} local routes` : "";
        console.log(`Electron data bridge is ready (${counts.tasks} tasks, ${counts.notes} notes, ${counts.wallets} wallets, ${counts.transactions} transactions, vault configured: ${counts.vaultConfigured}${routeSummary}).`);
        app.quit();
      } catch (error) {
        clearTimeout(timeout);
        console.error(error);
        app.exit(1);
      }
    });
  }

  await window.loadURL(developmentUrl || localAppUrl);
};

app.whenReady().then(async () => {
  if (!developmentUrl) registerStaticFileHandler();

  database = createSqliteAdapter({
    databasePath: join(app.getPath("userData"), "keep-it.sqlite"),
    appPath: app.isPackaged ? app.getAppPath() : projectDirectory,
  });

  registerTaskHandlers(createTaskRepository({ database }));
  registerNoteHandlers(createNoteRepository({ database }));
  registerWalletHandlers(createWalletRepository({ database }));
  vaultRepository = createVaultRepository({ database });
  registerVaultHandlers(vaultRepository);
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
}).catch((error) => {
  console.error(error);
  app.exit(1);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  vaultRepository?.destroy();
  database?.close();
});
