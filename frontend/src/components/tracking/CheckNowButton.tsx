import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { useCheckMangaSources } from '#/hooks/useTracking'
import type { CheckResult } from '#/services/api/trackingApi'

interface CheckNowButtonProps {
  mangaId: number
}

export function CheckNowButton({ mangaId }: CheckNowButtonProps) {
  const mutation = useCheckMangaSources()

  const handleClick = () => {
    mutation.mutate(mangaId, {
      onSuccess: (results: CheckResult[]) => {
        const updatedCount = results.filter((result) => result.updated).length
        toast.success(`${updatedCount} of ${results.length} sources updated`)
      },
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={mutation.isPending}
      onClick={handleClick}
    >
      {mutation.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Check now
    </Button>
  )
}
