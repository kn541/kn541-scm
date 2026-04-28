/** scm_inquiries.inquiry_type — InquiriesView / InquiryFormView 공통 */
export const INQUIRY_TYPE_OPTIONS = [
  { value: 'PRODUCT', label: '상품 문의' },
  { value: 'ORDER', label: '주문/배송' },
  { value: 'SETTLEMENT', label: '정산 문의' },
  { value: 'ETC', label: '기타' },
] as const
