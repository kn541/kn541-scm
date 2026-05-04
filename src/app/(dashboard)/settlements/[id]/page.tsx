import SettlementDetailPage from '@/views/settlements/SettlementDetailPage'

export default async function SettlementDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SettlementDetailPage settlementId={id} />
}
