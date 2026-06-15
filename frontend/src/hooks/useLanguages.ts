import { useQuery } from '@tanstack/react-query'
import { getLanguages } from '#/services/api/languageApi'
import type { LanguageResponse } from '#/services/api/languageApi'

const languageKeys = {
  all: ['languages'] as const,
  list: () => [...languageKeys.all, 'list'] as const,
}

export function useLanguageList() {
  return useQuery<LanguageResponse[]>({
    queryKey: languageKeys.list(),
    queryFn: () => getLanguages(),
  })
}
