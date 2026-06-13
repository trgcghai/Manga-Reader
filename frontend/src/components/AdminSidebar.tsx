'use client'

import * as React from 'react'
import { BookOpen, Languages } from 'lucide-react'

import { NavMain } from '#/components/nav-main.tsx'
import { NavSub } from '#/components/nav-sub'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '#/components/ui/sidebar.tsx'

const data = {
  navMain: [
    {
      title: 'Manga',
      url: '#',
      icon: BookOpen,
      isActive: true,
      items: [
        {
          title: 'Manga List',
          url: '/admin/mangas',
        },
        {
          title: 'Create New',
          url: '/admin/mangas/new',
        },
        {
          title: 'Authors',
          url: '/admin/authors',
        },
        {
          title: 'Genres',
          url: '/admin/genres',
        },
      ],
    },
  ],
  navSub: [
    {
      name: 'Language',
      url: '/admin/languages',
      icon: Languages,
    },
  ],
}

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <p className="text-2xl font-bold text-center">MangaReader</p>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSub items={data.navSub} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
