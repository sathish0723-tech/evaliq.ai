"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { useApp } from '@/contexts/app-context'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

// Colorful FSSA logo SVG
function FSSALogo({ className = "size-4" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fssa-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="14%" stopColor="#4facfe" />
          <stop offset="28%" stopColor="#667eea" />
          <stop offset="42%" stopColor="#764ba2" />
          <stop offset="57%" stopColor="#f093fb" />
          <stop offset="71%" stopColor="#f5576c" />
          <stop offset="85%" stopColor="#fa709a" />
          <stop offset="100%" stopColor="#fee140" />
        </linearGradient>
      </defs>
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        fill="url(#fssa-gradient)"
      />
      <path
        d="M2 17L12 22L22 17L12 12L2 17Z"
        fill="url(#fssa-gradient)"
      />
      <path
        d="M2 12L12 17L22 12L12 7L2 12Z"
        fill="url(#fssa-gradient)"
        opacity="0.8"
      />
    </svg>
  )
}

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { management, loading } = useApp()

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading...</span>
              <span className="truncate text-xs">...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!management) {
    return null
  }

  // Default to FSSA if no name is set
  const managementName = management.name && management.name.trim() !== '' 
    ? management.name 
    : 'FSSA'
  
  // Determine management type based on setup
  const managementType = management.name && management.name.trim() !== ''
    ? (management.numCoaches > 0 || management.numStudents > 0 ? 'Enterprise' : 'Organization')
    : 'Student Management'

  // Check if logo is a URL (Cloudinary, base64, or any http/https URL)
  const hasLogo = management.logo && (
    management.logo.startsWith('http://') || 
    management.logo.startsWith('https://') || 
    management.logo.startsWith('data:image')
  )
  const logoUrl = hasLogo ? management.logo : null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={managementName}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden shrink-0 bg-transparent group-data-[collapsible=icon]:size-8">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={managementName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <FSSALogo className="size-6 group-data-[collapsible=icon]:size-5" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{managementName}</span>
                <span className="truncate text-xs">{managementType}</span>
              </div>
              <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Management
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border overflow-hidden">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={managementName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FSSALogo className="size-3.5 shrink-0" />
                )}
              </div>
              {managementName}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Settings</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
