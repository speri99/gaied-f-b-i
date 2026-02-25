"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Get page title based on the current path
  const getPageTitle = () => {
    const path = pathname.split("/").pop();
    if (!path) return "Dashboard";
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header pageTitle={getPageTitle()} />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 ml-2 transition-all duration-300 ease-in-out">
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
