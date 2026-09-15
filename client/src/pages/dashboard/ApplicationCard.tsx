import type {  ApplicationStatus, JobApplication  } from '../../lib/types'
import { applicationBadgeClass, applicationLabel, applicationNextStatuses, departmentLabel, formatDateTime } from '../../lib/format'
import { Badge } from '../../components/ui/display'
import { SelectInput } from '../../components/ui/controls'

export function ApplicationCard({
  application,
  onStatusChange,
  onDelete,
}: {
  application: JobApplication
  onStatusChange: (status: ApplicationStatus) => void
  onDelete: () => void
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
          <button
            type="button"
            onClick={onDelete}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-neutral-500">
        {application.email
          ? <span>✉️ {application.email}</span>
          : null}
        {application.contactNumber ? <span>{(application.email ? ' · ' : '')}📞 {application.contactNumber}</span> : null}
        {application.resumeUrl ? (
          <span> · <a href={application.resumeUrl} target="_blank" rel="noreferrer" className="font-medium text-wyndell-orange-dark underline">Resume ↗</a></span>
        ) : null}
      </div>
      {application.coverLetter ? (
        <p className="mt-2 text-sm leading-relaxed text-wyndell-ink">{application.coverLetter}</p>
      ) : null}
    </article>
  )
}