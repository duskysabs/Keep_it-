import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "../components/Navigation";
import Header from "../components/Header";
import { TaskProvider } from "../context/TaskContext";
import { WorkspaceProvider } from "../context/WorkspaceContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Keep_it! — Personal workspace",
  description: "Your calm, organized personal workspace.",
};

const RootLayout = ({ children }) => {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('keepit-theme')||'system';const d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch{}` }} /></head>
      <body className="min-h-full bg-[#f5f7f8] text-slate-950">
        <WorkspaceProvider>
        <TaskProvider>
          <div className="min-h-screen lg:flex">
            <Navigation />
            <div className="min-w-0 flex-1">
              <Header />
              {children}
            </div>
          </div>
        </TaskProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
};

export default RootLayout;
