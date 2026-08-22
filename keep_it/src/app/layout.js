import "./globals.css";
import Navigation from "../components/Navigation";
import Header from "../components/Header";
import { TaskProvider } from "../context/TaskContext";
import { NoteProvider } from "../context/NoteContext";
import { WalletProvider } from "../context/WalletContext";
import { VaultProvider } from "../context/VaultContext";
import { WorkspaceProvider } from "../context/WorkspaceContext";

export const metadata = {
  title: "Keep_it! — Personal workspace",
  description: "Your calm, organized personal workspace.",
};

const RootLayout = ({ children }) => {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head><script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('keepit-theme')||'system';const d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch{}` }} /></head>
      <body className="min-h-full text-slate-950">
        <WorkspaceProvider>
        <TaskProvider>
        <NoteProvider>
        <WalletProvider>
        <VaultProvider>
          <div className="flex min-h-screen">
            <Navigation />
            <div className="min-w-0 flex-1">
              <Header />
              {children}
            </div>
          </div>
        </VaultProvider>
        </WalletProvider>
        </NoteProvider>
        </TaskProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
};

export default RootLayout;
