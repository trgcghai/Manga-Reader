const addTag = (
  field: {
    state: { value: string[] }
    handleChange: (v: string[]) => void
  },
  input: string,
  setInput: (v: string) => void,
) => {
  const trimmed = input.trim()
  if (trimmed && !field.state.value.includes(trimmed)) {
    field.handleChange([...field.state.value, trimmed])
  }
  setInput('')
}

const getStatusVariant = (status: string | undefined) => {
  switch (status) {
    case 'completed':
      return 'default'
    case 'ongoing':
      return 'secondary'
    case 'paused':
      return 'destructive'
    default:
      return 'outline'
  }
}

const getReadingFlagLabel = (flag: string): string =>
  flag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')

export { addTag, getStatusVariant, getReadingFlagLabel }
