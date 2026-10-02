import type {  ApplicationStatus, JobApplication  } from '@/types'
import { Mail, Phone } from 'lucide-react'
import { applicationBadgeClass, applicationLabel, applicationNextStatuses, departmentLabel, formatDateTime } from '@/utils/format'
import { Badge } from '@/components/common/PageHeader'
import { SelectInput } from '@/components/common/FormControls'

export function ApplicationCard({
  application,
  onStatusChange,
  onDelete,
}: {
  application: JobApplication
  onStatusChange: (status: ApplicationStatus) => void
  /** Omitted when the signed-in role lacks `careers.delete`. */
  onDelete?: () => void
}) {
  const nextStatuses = applicationNextStatuses(application.status)

  return (
    <article className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-wyndell-ink">{application.fullName}</p>
          <p className="text-xs text-neutral-500">
            {application.posting.title} · {application.branch.name} · {departmentLabel(application.posting.department)} · {formatDateTime(application.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={applicationBadgeClass(application.status)}>{applicationLabel(application.status)}</Badge>
          {nextStatuses.length > 0 ? (
            <SelectInput
              aria-label="Update application status"
              value={application.status}
              onChange={(event) => onStatusChange(event.target.value as ApplicationStatus)}
              className="w-36 shrink-0"
            >
              <option value={application.status} disabled>{applicationLabel(application.status)}</option>
              {nextStatuses.map((status) => (
                <option key={status} value={status}>Move to {applicationLabel(status)}</option>
              ))}
            </SelectInput>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs font-medium text-destructive hover:underline"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
        {application.email ? (
          <span className="inline-flex items-center gap-1"><Mail className="size-3" aria-hidden />{application.email}</span>
        ) : null}
        {application.contactNumber ? (
          <span className="inline-flex items-center gap-1"><Phone className="size-3" aria-hidden />{application.contactNumber}</span>
        ) : null}
        {application.resumeUrl ? (
          <a href={application.resumeUrl} target="_blank" rel="noreferrer" className="font-medium text-wyndell-orange-dark underline">Resume ↗</a>
        ) : null}
      </div>
      {application.coverLetter ? (
        <p className="mt-2 text-sm leading-relaxed text-wyndell-ink">{application.coverLetter}</p>
      ) : null}
    </article>
  )
}
