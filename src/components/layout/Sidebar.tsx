"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { navigation } from "@/components/navigation/Navigation";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (href: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  // Force a re-render when pathname changes to ensure consistent width
  useEffect(() => {
    // This empty effect ensures the component re-renders when pathname changes
  }, [pathname]);

  return (
    <div
      className={cn(
        "flex flex-col border-r bg-background/50 backdrop-blur-sm transition-all duration-300 h-[calc(100vh-4rem)]",
        collapsed ? "w-16" : "w-56"
      )}
      style={{ minWidth: collapsed ? "4rem" : "14rem" }}
    >
      <div className="flex h-12 items-center justify-end px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const hasChildren = item.children?.length > 0;
          const isOpen = openSections[item.href];

          return (
            <div key={item.href}>
              {hasChildren ? (
                // 👉 Parent with children: toggle submenu
                <button
                  onClick={() => toggleSection(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    isActive ? "bg-accent" : "hover:bg-accent",
                    collapsed && "justify-center"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </button>
              ) : (
                // 👉 No children: navigate with Link
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                    isActive ? "bg-accent" : "transparent",
                    collapsed && "justify-center"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )}

              {!collapsed && hasChildren && isOpen && (
                <div className="pl-8 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block text-sm rounded-md px-2 py-1 transition hover:bg-accent",
                          isChildActive ? "bg-accent" : ""
                        )}
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
