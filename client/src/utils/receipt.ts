import type { Reservation } from '@/types'
import { formatDate, formatDateTime, formatTime12 } from '@/utils/format'
const PW = 595; const PH = 842; const MG = 56; const VX = 210; const BT = 80
const cl = (v: string): string => v.replaceAll(' ', ' ').replaceAll('‘', "'").replaceAll('’', "'").replaceAll('“', '"').replaceAll('”', '"').replaceAll('–', '-').replaceAll('—', '-').replaceAll('•', '-').replaceAll('…', '...').replaceAll('₱', 'PHP ').replaceAll(/[^\x20-\x7e\xa0-\xff]/g, '?')
const es = (v: string): string => cl(v).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
function wr(t: string, m: number): string[] {
  const ws = cl(t).split(/\s+/).filter(Boolean); const o: string[] = []; let l = ''
  for (const w of ws) {
    if (w.length > m) { if (l) { o.push(l); l = '' } for (let i = 0; i < w.length; i += m) o.push(w.slice(i, i + m)) }
    else if (!l) l = w; else if (l.length + 1 + w.length <= m) l += ` ${w}`; else { o.push(l); l = w }
  }
  if (l) o.push(l); return o.length ? o : ['-']
}
function pdf(title: string, pgs: string[][]): Uint8Array {
  const n = pgs.length; const b = new Map<number, string>(); const kids: number[] = []
  for (let i = 0; i < n; i++) kids.push(3 + 2 * i)
  const fr = 3 + 2 * n; const fb = 4 + 2 * n; const io = 5 + 2 * n
  b.set(1, '<< /Type /Catalog /Pages 2 0 R >>')
  b.set(2, `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${n} >>`)
  for (let i = 0; i < n; i++) {
    const j = pgs[i].join('\n')
    b.set(3 + 2 * i, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${fr} 0 R /F2 ${fb} 0 R >> >> /Contents ${4 + 2 * i} 0 R >>`)
    b.set(4 + 2 * i, `<< /Length ${j.length} >>\nstream\n${j}\nendstream`)
  }
  b.set(fr, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  b.set(fb, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  b.set(io, `<< /Title (${es(title)}) /Creator (Wyndells) >>`)
  let s = '%PDF-1.4\n'; const off: number[] = []
  for (let i = 1; i <= io; i++) { off.push(s.length); s += `${i} 0 obj\n${b.get(i)}\nendobj\n` }
  const xr = s.length
  s += `xref\n0 ${io + 1}\n0000000000 65535 f \n`
  for (const o of off) s += `${String(o).padStart(10, '0')} 00000 n \n`
  s += `trailer\n<< /Size ${io + 1} /Root 1 0 R /Info ${io} 0 R >>\nstartxref\n${xr}\n%%EOF`
  const u = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff
  return u
}
export function downloadReservationReceipt(r: Reservation): void {
  const pgs: string[][] = [[]]; let y = 656
  const put = (s: string): void => { pgs[pgs.length - 1].push(s) }
  const T = (f: string, z: number, x: number, yy: number, v: string, c: string): void => { put(`${c} rg BT /${f} ${z} Tf 1 0 0 1 ${x} ${yy} Tm (${es(v)}) Tj ET`) }
  const rule = (yy: number): void => { put(`0.93 0.88 0.77 RG 0.75 w ${MG} ${yy} m ${PW - MG} ${yy} l S`) }
  put(`0.07 0.29 0.17 rg 0 772 ${PW} 70 re f`)
  T('F2', 24, MG, 808, "Wyndell's", '1 1 1')
  T('F1', 12, MG, 789, 'Reservation receipt', '1 1 1')
  put(`0.94 0.51 0.05 RG 1.5 w [6 4] 0 d ${MG} 688 ${PW - MG * 2} 58 re S [] 0 d`)
  T('F1', 9, MG + 16, 722, 'RESERVATION REFERENCE', '0.44 0.42 0.36')
  T('F2', 22, MG + 16, 698, r.reference, '0.85 0.44 0.02')
  const row = (lb: string, vv: string): void => {
    const ls = wr(vv, 42)
    if (y - (ls.length - 1) * 15 - 14 < BT) { pgs.push([]); T('F1', 10, MG, 800, `Receipt ${r.reference} (cont.)`, '0.44 0.42 0.36'); rule(790); y = 766 }
    T('F1', 9, MG, y, lb.toUpperCase(), '0.44 0.42 0.36')
    ls.forEach((ln, i) => T('F2', 11, VX, y - i * 15, ln, '0.12 0.16 0.13'))
    y -= (ls.length - 1) * 15 + 24
  }
  row('Name', r.customerName); row('Branch', r.branch?.name ?? '-')
  row('Date', formatDate(r.date)); row('Time', formatTime12(r.time))
  row('Guests', String(r.guests)); row('Contact', r.contactNumber); row('Email', r.email)
  if (r.specialRequests) row('Requests', r.specialRequests)
  row('Status', 'Pending - awaiting confirmation'); row('Submitted', formatDateTime(r.createdAt))
  y -= 10; rule(y); y -= 20
  const ns = ['- Pending until confirmed by staff.', '- Check/cancel via Check reservation page.', '- Arrive 10 minutes before booked time.']
  ns.forEach((m, i) => T('F1', 9, MG, y - i * 13, m, '0.44 0.42 0.36'))
  y -= ns.length * 13 + 24
  T('F2', 11, MG, y, "Thank you for reserving with Wyndell's", '0.07 0.29 0.17')
  const bytes = pdf(`Receipt ${r.reference}`, pgs)
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `Wyndells-Reservation-${r.reference}.pdf`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
