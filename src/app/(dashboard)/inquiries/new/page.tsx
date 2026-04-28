import { redirect } from 'next/navigation'

/** 문의 등록은 /inquiries 목록 다이얼로그로 통일 */
export default function InquiryNewPage() {
  redirect('/inquiries')
}
