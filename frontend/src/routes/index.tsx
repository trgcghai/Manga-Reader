import { createFileRoute } from '@tanstack/react-router'
import { LibraryPage } from '#/components/manga/LibraryPage'

export const Route = createFileRoute('/')({ component: LibraryPage })
