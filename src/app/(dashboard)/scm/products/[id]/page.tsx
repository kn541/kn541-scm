import { redirect } from 'next/navigation'

/** /scm/products/:id — 상품 상세 진입점 (수정 화면과 동일 데이터) */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/products/${id}/edit`)
}
