import { useEffect, useState } from 'react'
import { fetchBranches } from '../../api/branches'
import {
  createPosting,
  deleteApplication,
  deletePosting,
  fetchApplications,
  fetchManageablePostings,
  setApplicationStatus,
  updatePosting,
} from '../../api/careers'
import type {
  ApplicationStatus,
  Branch,
  JobApplication,
  ManageableCareerPosting,
} from '../../lib/types'
import { departmentLabel, formatDateTime, postingLabel } from '../../lib/format'
import { Button } from '../../components/ui/controls'
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/display'
import { StatCard } from '../../components/dashboard/widgets'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useAuth } from '../../lib/auth'
import { ApplicationCard } from './ApplicationCard'
import { PostingFormModal } from './PostingFormModal'

export function ManageApplicationsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [postings, setPostings] = useState<ManageableCareerPosting[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ManageableCareerPosting | null>(null)
  const [confirmDeletePosting, setConfirmDeletePosting] = useState<ManageableCareerPosting | null>(null)
  const [confirmDeleteApplication, setConfirmDeleteApplication] = useState<JobApplication | null>(null)

  const load = () => {
    setLoading(true)
    setError(false)
    void Promise.all([
      fetchManageablePostings(),
      fetchApplications(),
      fetchBranches(true).then(setBranches).catch(() => undefined),
    ])
      .then(([postingRows, applicationRows]) => {
        setPostings(postingRows)
        setApplications(applicationRows)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const allowedBranches = isAdmin
    ? branches
    : user?.assignedBranch ? [{ _id: user.assignedBranch.id, name: user.assignedBranch.name }] : []

  const handleSavePosting = (payload: Record<string, unknown>) => {
    const request = editing ? updatePosting(editing._id, payload) : createPosting(payload)
    void request
      .then(() => {
        setCreating(false)
        setEditing(null)
        load()
      })
      .catch(() => setError(true))
  }

  const changeStatus = (application: JobApplication, status: ApplicationStatus) => {
    if (status === application.status) {
      return
    }
    void setApplicationStatus(application._id, status).then(load).catch(() => setError(true))
  }

  if (loading) {
    return <Spinner label="Loading applications…" />
  }
  if (error) {
    return <ErrorState message="Unable to load careers data right now." onRetry={load} />
  }

  const openCount = postings.filter((posting) => posting.status === 'open').length
  const newCount = applications.filter((application) => application.status === 'new').length

  return (
    <div>
      <PageHeader
        title="Careers & job applications"
        subtitle={user?.role === 'manager'
          ? `Open positions for ${user.assignedBranch?.name ?? 'your branch'}.`
          : 'Job postings and applications across all branches.'}
        action={<Button onClick={() => { setEditing(null); setCreating(true) }}>+ Add position</Button>}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open positions" value={openCount} accent="text-wyndell-green-dark" />
        <StatCard label="Total applications" value={applications.length} />
        <StatCard label="New applications" value={newCount} accent="text-wyndell-orange-dark" />
      </div>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-wyndell-forest">Positions</h2>
        {postings.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No positions yet" message="Add a job posting to start receiving applications." />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {postings.map((posting) => (
              <article key={posting._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-wyndell-ink">{posting.title}</p>
                    <p className="text-xs text-neutral-500">
                      {posting.branch.name} · {departmentLabel(posting.department)} · {posting.employmentType} · {formatDateTime(posting.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={posting.status === 'open' ? 'bg-wyndell-green/15 text-wyndell-green-dark' : 'bg-neutral-200 text-neutral-600'}>
                      {postingLabel(posting.status)}
                    </Badge>
                    <button type="button" onClick={() => setEditing(posting)} className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                      Edit
                    </button>
                    {isAdmin ? (
                      <button type="button" onClick={() => setConfirmDeletePosting(posting)} className="text-xs font-medium text-red-600 hover:underline">
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
                {posting.summary ? <p className="mt-2 text-sm leading-relaxed text-wyndell-ink">{posting.summary}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-12">
        <ApplicationsSection
          applications={applications}
          onStatusChange={changeStatus}
          onDelete={(application) => setConfirmDeleteApplication(application)}
        />
      </div>

      {creating || editing ? (
        <PostingFormModal
          posting={editing}
          branches={allowedBranches}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={handleSavePosting}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDeletePosting !== null}
        title={confirmDeletePosting ? `Delete “${confirmDeletePosting.title}”?` : ''}
        message="This permanently removes the position and all of its applications."
        confirmLabel="Delete position"
        onConfirm={() => {
          if (confirmDeletePosting) {
            void deletePosting(confirmDeletePosting._id).then(load)
          }
          setConfirmDeletePosting(null)
        }}
        onCancel={() => setConfirmDeletePosting(null)}
      />

      <ConfirmDialog
        open={confirmDeleteApplication !== null}
        title={confirmDeleteApplication ? `Remove ${confirmDeleteApplication.fullName}'s application?` : ''}
        message="This permanently removes the application record."
        confirmLabel="Delete application"
        onConfirm={() => {
          if (confirmDeleteApplication) {
            void deleteApplication(confirmDeleteApplication._id).then(load)
          }
          setConfirmDeleteApplication(null)
        }}
        onCancel={() => setConfirmDeleteApplication(null)}
      />
    </div>
  )
}

function ApplicationsSection({
  applications,
  onStatusChange,
  onDelete,
}: {
  applications: JobApplication[]
  onStatusChange: (application: JobApplication, status: ApplicationStatus) => void
  onDelete: (application: JobApplication) => void
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-wyndell-forest">Applications</h2>
      {applications.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No applications yet" message="Applications from the public careers page will appear here." />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application._id}
              application={application}
              onStatusChange={(status) => onStatusChange(application, status)}
              onDelete={() => onDelete(application)}
            />
          ))}
        </div>
      )}
    </section>
  )
}