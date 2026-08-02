import { useEffect, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import type {
  TrackingConfigResponse,
  TrackingFrequency,
  UpdateTrackingConfigPayload,
} from '#/services/api/trackingApi'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { Field, FieldContent, FieldLabel } from '#/components/ui/field'

const FREQUENCY_OPTIONS: Array<{ value: TrackingFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

interface TrackingConfigPanelProps {
  config?: TrackingConfigResponse
  isLoading: boolean
  isSaving: boolean
  onSave: (payload: UpdateTrackingConfigPayload) => void
}

export function TrackingConfigPanel({
  config,
  isLoading,
  isSaving,
  onSave,
}: TrackingConfigPanelProps) {
  const [frequency, setFrequency] = useState<TrackingFrequency>('daily')
  const [interval, setInterval] = useState('1')
  const [runAt, setRunAt] = useState('00:00')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (config && !initialized) {
      setFrequency(config.frequency)
      setInterval(String(config.interval))
      setRunAt(config.runAt)
      setInitialized(true)
    }
  }, [config, initialized])

  const handleSave = () => {
    const intervalValue = Number(interval)
    if (!Number.isInteger(intervalValue) || intervalValue < 1) return
    onSave({ frequency, interval: intervalValue, runAt })
  }

  return (
    <Collapsible defaultOpen className="mt-6 overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold">Tracking Config</h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Toggle tracking config">
            <ChevronDown className="size-4" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="flex flex-wrap items-end gap-6 border-t p-4">
          <Field className="w-40">
            <FieldLabel>Frequency</FieldLabel>
            <FieldContent>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={frequency}
                  onValueChange={(value: string) =>
                    setFrequency(value as TrackingFrequency)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldContent>
          </Field>

          <Field className="w-28">
            <FieldLabel>Interval</FieldLabel>
            <FieldContent>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(event) => setInterval(event.target.value)}
                />
              )}
            </FieldContent>
          </Field>

          <Field className="w-36">
            <FieldLabel>Run At</FieldLabel>
            <FieldContent>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input
                  type="time"
                  value={runAt}
                  onChange={(event) => setRunAt(event.target.value)}
                />
              )}
            </FieldContent>
          </Field>

          <Button
            onClick={handleSave}
            disabled={isLoading || isSaving || !config}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
