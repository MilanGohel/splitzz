"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SplitzzLogo } from "@/components/brand/logo"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full min-w-0 flex-1 overflow-x-hidden">
        <div className="flex items-center gap-3 p-4">
          <SidebarTrigger />
          <SplitzzLogo size="sm" showWordmark />
        </div>
        <div className="p-4 pt-0">
         {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
