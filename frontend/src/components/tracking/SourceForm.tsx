import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldContent, FieldLabel } from '#/components/ui/field'

export interface SourceFormValues {
  name: string
  url: string
}

interface SourceFormProps {
  initialValues: SourceFormValues
  submitLabel: string
  isPending: boolean
  onSubmit: (values: SourceFormValues) => void
  onCancel: () => void
  canSubmit?: boolean
}

export function SourceForm({
  initialValues,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
  canSubmit = true,
}: SourceFormProps) {
  const [name, setName] = useState(initialValues.name)
  const [url, setUrl] = useState(initialValues.url)

  const effectiveCanSubmit =
    canSubmit && name.trim() !== '' && url.trim() !== '' && !isPending

  const handleSubmit = () => {
    if (!effectiveCanSubmit) return
    onSubmit({ name, url })
  }

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-4 rounded-md border p-4">
      <Field>
        <FieldLabel htmlFor="source-name">Name</FieldLabel>
        <FieldContent>
          <Input
            id="source-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSubmit()
            }}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="source-url">URL</FieldLabel>
        <FieldContent>
          <Input
            id="source-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSubmit()
            }}
          />
        </FieldContent>
      </Field>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!effectiveCanSubmit}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  )
}
