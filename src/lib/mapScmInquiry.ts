import { INQUIRY_TYPE_OPTIONS } from '@/lib/inquiryOptions'

/** GET /scm/inquiries 한 행 → UI (목록에 상세 필드 포함) */
export interface InquiryRow {
  inquiry_id: string
  title: string
  inquiry_type: string | null
  scm_status: string
  has_answer: boolean
  created_at: string
  answered_at: string | null
  content: string
  answer: string | null
}

export function mapScmInquiryItem(raw: Record<string, unknown>): InquiryRow {
  const scmStatus = String(raw.scm_status ?? '')
  const ans = raw.answer
  return {
    inquiry_id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    inquiry_type: raw.inquiry_type != null ? String(raw.inquiry_type) : null,
    scm_status: scmStatus,
    has_answer: scmStatus === '002' || (typeof ans === 'string' && ans.length > 0),
    created_at: String(raw.created_at ?? ''),
    answered_at: raw.answered_at != null ? String(raw.answered_at) : null,
    content: String(raw.content ?? ''),
    answer: typeof ans === 'string' ? ans : null,
  }
}

export function inquiryTypeLabel(value: string | null): string {
  if (value == null || value === '') return '-'
  const o = INQUIRY_TYPE_OPTIONS.find(t => t.value === value)
  return o?.label ?? value
}
