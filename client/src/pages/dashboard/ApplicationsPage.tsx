import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchBranches } from '@/services/api/branches'
import {
  createPosting,
  deleteApplication,
  deletePosting,
  fetchApplications,
  fetchManageablePostings,
  setApplicationStatus,
  updatePosting,
} from '@/services/api/careers'
import type {
  ApplicationStatus,
  Branch,
  JobApplication,
  ManageableCareerPosting,
} from '@/types'
import { departmentLabel, formatDateTime, friendlyError, postingLabel } from '@/utils/format'
import { Button } from '@/components/common/FormControls'
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { ConfirmDialog } from '@/components/common/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { ApplicationCard } from '@/features/careers/components/ApplicationCard'
import { BranchSelect } from '@/components/common/BranchSelect'
import { PostingFormModal } from '@/features/careers/components/PostingFormModal'

export function ManageApplicationsPage() {
  const { user, can } = useAuth()
  // Deleting postings/applications is its own permission (default: admin + HR),
  // so a manager can run the pipeline without being able to erase records.
  const canDelete = can('careers.delete')
  const isBranchScoped = user?.role === 'manager'

  const [postings, setPostings] = useState<ManageableCareerPosting[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ManageableCareerPosting | null>(null)
  const [confirmDeletePosting, setConfirmDeletePosting] = useState<ManageableCareerPosting | null>(null)
  const [confirmDeleteApplication, setConfirmDeleteApplication] = useState<JobApplication | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const branchFilter = searchParams.get('branch') ?? ''

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

  // Managers only ever see their own branch; administrators and HR pick any.
  const allowedBranches = isBranchScoped
    ? user?.assignedBranch
      ? [{ _id: user.assignedBranch.id, name: user.assignedBranch.name }]
      : []
    : branches

  const handleSavePosting = (payload: Record<string, unknown>) => {
    const request = editing ? updatePosting(editing._id, payload) : createPosting(payload)
    void request
      .then(() => {
        setCreating(false)
        setEditing(null)
        load()
      })
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  const changeStatus = (application: JobApplication, status: ApplicationStatus) => {
    if (status === application.status) {
      return
    }
    void setApplicationStatus(application._id, status)
      .then(load)
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  if (loading) {
    return <Spinner label="Loading applications…" />
  }

  const openCount = postings.filter((posting) => posting.status === 'open').length
  const newCount = applications.filter((application) => application.status === 'new').length

  const visiblePostings = branchFilter && branchFilter !== 'all'
    ? postings.filter((posting) => posting.branch?._id === branchFilter)
    : postings
  const visibleApplications = branchFilter && branchFilter !== 'all'
    ? applications.filter((application) => application.branch?._id === branchFilter)
    : applications

  return (
    <div>
      <PageHeader
        title="Careers & job applications"
        subtitle={user?.role === 'manager'
          ? `Open positions for ${user.assignedBranch?.name ?? 'your branch'}.`
          : 'Job postings and applications across all branches.'}
        action={<Button onClick={() => { setEditing(null); setCreating(true) }}>+ Add position</Button>}
      />

      {user?.role !== 'manager' ? (
        <div className="mt-4">
          <BranchSelect
            value={branchFilter === 'all' ? '' : branchFilter}
            onChange={(branchId) => {
              const next = new URLSearchParams(searchParams)
              if (branchId) {
                next.set('branch', branchId)
              } else {
                next.delete('branch')
              }
              setSearchParams(next)
            }}
          />
        </div>
      ) : null}

      {error ? (
        <div className="mt-6">
          <ErrorState message="Unable to load careers data right now." onRetry={load} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Open positions" value={openCount} accent="text-wyndell-green-dark" />
            <StatCard label="Total applications" value={visibleApplications.length} />
            <StatCard label="New applications" value={newCount} accent="text-wyndell-orange-dark" />
          </div>

          <section className="mt-8">
            <h2 className="text-base font-semibold text-wyndell-forest">Positions</h2>
            {visiblePostings.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No positions yet" message="Add a job posting to start receiving applications." />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {visiblePostings.map((posting) => (
                  <article key={posting._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-wyndell-ink">{posting.title}</p>
                        <p className="text-xs text-neutral-500">
                          {posting.branch.name} · {departmentLabel(posting.department)} · {posting.employmentType} · {formatDateTime(posting.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={posting.status === 'open' ? 'bg-wyndell-green/15 text-wyndell-green-dark' : 'bg-wyndell-taupe/25 text-wyndell-ink'}>
                          {postingLabel(posting.status)}
                        </Badge>
                        <button type="button" onClick={() => setEditing(posting)} className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                          Edit
                        </button>
                        {canDelete ? (
                          <button type="button" onClick={() => setConfirmDeletePosting(posting)} className="text-xs font-medium text-destructive hover:underline">
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
              applications={visibleApplications}
              canDelete={canDelete}
              onStatusChange={changeStatus}
              onDelete={(application) => setConfirmDeleteApplication(application)}
            />
          </div>
        </>
      )}

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
            void deletePosting(confirmDeletePosting._id)
              .then(load)
              .catch((reason: unknown) => toast.error(friendlyError(reason)))
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
            void deleteApplication(confirmDeleteApplication._id)
              .then(load)
              .catch((reason: unknown) => toast.error(friendlyError(reason)))
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
  canDelete,
  onStatusChange,
  onDelete,
}: {
  applications: JobApplication[]
  canDelete: boolean
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
              onDelete={canDelete ? () => onDelete(application) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}
