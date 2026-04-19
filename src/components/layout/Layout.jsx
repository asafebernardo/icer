import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-[4.5rem] bg-gradient-to-b from-muted/25 via-background to-background">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
