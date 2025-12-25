"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  Settings2,
  LayoutDashboard,
  Settings,
  Award,
  FileText,
  Sparkles,
  Activity,
  ClipboardList,
} from "lucide-react"

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

export function AppSidebar({ ...props }) {
  const pathname = usePathname()

  // Determine which section should be active based on current path
  const getActiveSection = () => {
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/overview')) return 'dashboard'
    if (pathname.startsWith('/attendance')) return 'attendance'
    if (pathname.startsWith('/subjects')) return 'subjects'
    if (pathname.startsWith('/marksheet')) return 'marksheet'
    if (pathname.startsWith('/marks')) return 'marks'
    if (pathname.startsWith('/tests')) return 'tests'
    if (pathname.startsWith('/students/notes')) return 'notes'
    if (pathname.startsWith('/students')) return 'students'
    if (pathname.startsWith('/classes')) return 'classes'
    if (pathname.startsWith('/coaches')) return 'coaches'
    if (pathname.startsWith('/tasks')) return 'tasks'
    if (pathname.startsWith('/activity')) return 'activity'
    if (pathname.startsWith('/memories')) return 'memories'
    if (pathname.startsWith('/copilot')) return 'copilot'
    if (pathname.startsWith('/assessments')) return 'assessments'
    if (pathname.startsWith('/settings')) return 'settings'
    return null
  }

  const activeSection = getActiveSection()

  const navMain = [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboard,
      isActive: activeSection === 'dashboard',
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
        },
        {
          title: "Overview",
          url: "/dashboard/overview",
        },
      ],
    },
    {
      title: "Students",
      url: "#",
      icon: Users,
      isActive: activeSection === 'students' || activeSection === 'assessments' || activeSection === 'tasks' || activeSection === 'notes',
      items: [
        {
          title: "Assessments",
          url: "/assessments",
          badge: "Coming Soon",
        },
        {
          title: "Task Management",
          url: "/tasks",
        },
        {
          title: "Notes",
          url: "/students/notes",
        },
      ],
    },
    {
      title: "Management",
      url: "#",
      icon: Settings2,
      isActive: activeSection === 'classes' || activeSection === 'coaches',
      items: [
        {
          title: "Classes",
          url: "/classes",
        },
        {
          title: "Coaches",
          url: "/coaches",
        },
      ],
    },
    {
      title: "Academic",
      url: "#",
      icon: BookOpen,
      isActive: activeSection === 'attendance' || activeSection === 'marks' || activeSection === 'marksheet' || activeSection === 'tests' || activeSection === 'subjects' || activeSection === 'students',
      items: [
        {
          title: "Attendance",
          url: "/attendance",
        },
        {
          title: "Students",
          url: "/students",
        },
        {
          title: "Subjects",
          url: "/subjects",
        },
        {
          title: "Marks",
          url: "/marks",
        },
        {
          title: "Marksheet",
          url: "/marksheet",
          badge: "Coming Soon",
        },
        {
          title: "Tests",
          url: "/tests",
        },
      ],
    },
    {
      title: "Records",
      url: "#",
      icon: FileText,
      isActive: activeSection === 'activity' || activeSection === 'memories',
      items: [
        {
          title: "Activity",
          url: "/activity",
        },
        {
          title: "Memories",
          url: "/memories",
        },
      ],
    },
    {
      title: "AI Copilot",
      url: "#",
      icon: Sparkles,
      isActive: activeSection === 'copilot',
      badge: "Coming Soon",
      items: [
        {
          title: "AI Copilot",
          url: "/copilot",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      isActive: activeSection === 'settings',
      items: [
        {
          title: "Settings",
          url: "/settings",
        },
        {
          title: "Team",
          url: "/settings/team",
        },
      ],
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}


