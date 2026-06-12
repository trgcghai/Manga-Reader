import { useEffect, useState, useMemo } from 'react'
import debounce from 'lodash/debounce'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  const debouncedSet = useMemo(
    () => debounce((v: T) => setDebouncedValue(v), delay),
    [delay],
  )

  useEffect(() => {
    debouncedSet(value)
    return debouncedSet.cancel
  }, [value, debouncedSet])

  return debouncedValue
}
