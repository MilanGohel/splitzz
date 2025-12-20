"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <div className="flex items-center gap-2 p-4">
            <SidebarTrigger />
            <h1 className="text-xl font-bold text-brand">Splitzz</h1>
        </div>
        <div className="p-4 pt-0">
         {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
