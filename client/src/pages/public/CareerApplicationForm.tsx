import { useState } from 'react'
import { submitApplication } from '../../api/careers'
import type {  CareerPosting  } from '../../lib/types'
import { departmentLabel, friendlyError } from '../../lib/format'
import { Button, Field, TextArea, TextInput } from '../../components/ui/controls'
import { Card } from '../../components/ui/display'

export function CareerApplicationForm({
  posting,
  onApplied,
}: {
  posting: CareerPosting | null
  onApplied: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [resume, setResume] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const validateResumeFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'doc', 'docx'].includes(extension)) {
      return 'Please attach your resume as a PDF, DOC, or DOCX file.'
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'The resume file is too large. Please upload a PDF, DOC, or DOCX up to 5 MB.'
    }
    return null
  }

  const submit = async () => {
    if (!posting) {
      setError('Please choose a position first.')
      return
    }
    if (!fullName.trim()) {
      setError('Please add your full name.')
      return
    }
    if (!email.trim()) {
      setError('Please add a valid email address.')
      return
    }
    if (!contactNumber.trim()) {
      setError('Please add your mobile number.')
      return
    }
    if (!resume) {
      setError('Please attach your resume as a PDF, DOC, or DOCX file.')
      return
    }
    const resumeError = validateResumeFile(resume)
    if (resumeError) {
      setError(resumeError)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('postingId', posting._id)
      form.append('fullName', fullName)
      form.append('email', email)
      form.append('contactNumber', contactNumber)
      if (coverLetter.trim()) {
        form.append('coverLetter', coverLetter)
      }
      form.append('resume', resume)
      await submitApplication(form)
      setSubmitted(true)
      setFullName('')
      setEmail('')
      setContactNumber('')
      setCoverLetter('')
      setResume(null)
      setFileKey((key) => key + 1)
      onApplied()
    } catch (reason: unknown) {
      setError(friendlyError(reason))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-6">
      <div id="apply-form" tabIndex={-1} className="outline-none">
        <h2 className="text-lg font-semibold text-wyndell-forest">
          {posting ? `Apply for ${posting.title}` : 'Send us your application'}
        </h2>
        <p className="mt-1 text-sm text-wyndell-ink">
          {posting
            ? `Application for ${posting.branch.name} — ${departmentLabel(posting.department)}.`
            : 'Choose an open position above and the form will be pre-filled for it.'}
        </p>
      </div>
      {submitted ? (
        <p className="mt-4 rounded-lg bg-wyndell-green/15 px-4 py-3 text-sm font-medium text-wyndell-green-dark">
          Your application was received! Our team will review it and reach out if there is a good fit. 🌿
        </p>
      ) : null}
      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      <div className="mt-4 grid gap-4">
        <Field label="Full name *">
          <TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Maria Santos" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email *">
            <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          </Field>
          <Field label="Mobile number *">
            <TextInput value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="09XX XXX XXXX" required />
          </Field>
        </div>
        <Field label="Tell us about yourself" hint="Briefly share your experience and why you'd like to join (optional).">
          <TextArea
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
            rows={5}
            maxLength={3000}
            placeholder="A short introduction goes a long way…"
          />
        </Field>
        <Field label="Resume * (PDF, DOC, or DOCX, up to 5 MB)">
          <TextInput
            key={fileKey}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              if (!file) {
                setResume(null)
                return
              }
              const fileError = validateResumeFile(file)
              if (fileError) {
                setError(fileError)
                setResume(null)
                setFileKey((key) => key + 1)
                return
              }
              setError('')
              setResume(file)
            }}
          />
          {resume ? <span className="text-xs text-muted-foreground">Selected: {resume.name}</span> : null}
        </Field>
        <Button onClick={() => void submit()} disabled={submitting || !posting}>
          {posting ? (submitting ? 'Submitting…' : 'Submit application') : 'Select a position above'}
        </Button>
      </div>
    </Card>
  )
}