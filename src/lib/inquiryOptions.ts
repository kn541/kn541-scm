/** scm_inquiries.inquiry_type — CHAR(3) 코드값 (system_codes: scm_inquiry_type) */
export const INQUIRY_TYPE_OPTIONS = [
  { value: '001', label: '상품 문의' },
  { value: '002', label: '정산 문의' },
  { value: '003', label: '계약 문의' },
  { value: '004', label: '시스템 문의' },
  { value: '005', label: '기타' },
] as const
