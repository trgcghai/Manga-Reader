'use client'

import * as React from 'react'
import { Activity, BookOpen, BookUser, Languages } from 'lucide-react'

import { NavMain } from '#/components/nav-main.tsx'
import { NavSub } from '#/components/nav-sub'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '#/components/ui/sidebar.tsx'
import { Link } from '@tanstack/react-router'

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
    {
      title: 'Translator',
      url: '#',
      icon: BookUser,
      items: [
        {
          title: 'Translator List',
          url: '/admin/translators',
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
    {
      name: 'Tracking',
      url: '/admin/tracking',
      icon: Activity,
    },
  ],
}

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
            <BookOpen className="size-5" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight">
            Manga Reader
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSub items={data.navSub} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
