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

export { addTag, getStatusVariant }
