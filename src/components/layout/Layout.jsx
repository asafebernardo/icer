import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background min-w-0 overflow-x-hidden">
      <Navbar />
      <main className="flex-1 min-w-0 pt-[4.5rem] relative w-full">
        {/* Fundo institucional sutil (não altera conteúdo) */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,hsl(var(--primary)/0.06),transparent_55%),radial-gradient(ellipse_90%_50%_at_100%_50%,hsl(var(--accent)/0.04),transparent_50%)]"
          aria-hidden
        />
        <div className="relative z-0 min-w-0 w-full bg-gradient-to-b from-muted/25 via-background to-muted/15">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
