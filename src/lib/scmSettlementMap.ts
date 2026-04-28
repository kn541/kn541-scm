/**
 * supplier_settlements 테이블(백엔드 GET /scm/settlements) 원본 행 → UI 공통 필드
 */
export interface SettlementUi {
  settlement_id: string
  settlement_no: string
  period_from: string
  period_to: string
  gross_amount: number
  commission_amount: number
  net_amount: number
  status: string
  paid_at: string | null
  created_at: string
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0)
  const dd = String(d.getDate()).padStart(2, '0')
  return `${year}-${String(month).padStart(2, '0')}-${dd}`
}

export function mapSupplierSettlementRow(raw: Record<string, unknown>): SettlementUi {
  const id = String(raw.id ?? raw.settlement_id ?? '')
  const y = Number(raw.settle_year ?? 0)
  const m = Number(raw.settle_month ?? 0)
  const period =
    y > 0 && m > 0
      ? `${y}-${String(m).padStart(2, '0')}`
      : String(raw.period_from ?? '').slice(0, 7) || '-'
  const periodFrom =
    y > 0 && m > 0 ? `${period}-01` : String(raw.period_from ?? (period !== '-' ? `${period}-01` : ''))
  const periodTo =
    y > 0 && m >= 1 && m <= 12
      ? lastDayOfMonth(y, m)
      : String(raw.period_to ?? periodFrom)

  const totalOrder = Number(raw.total_order_amount ?? raw.gross_amount ?? 0)
  const totalSupply = Number(raw.total_supply_amount ?? 0)
  const commission =
    raw.commission_amount != null ? Number(raw.commission_amount) : Math.max(0, totalOrder - totalSupply)
  const net = Number(raw.final_settle_amount ?? raw.net_amount ?? raw.settle_amount ?? 0)

  const no = String(raw.settlement_no ?? `ST-${period}-${id.slice(0, 8)}`)

  return {
    settlement_id: id,
    settlement_no: no,
    period_from: periodFrom,
    period_to: periodTo,
    gross_amount: totalOrder,
    commission_amount: commission,
    net_amount: net,
    status: String(raw.status ?? ''),
    paid_at: raw.paid_at != null ? String(raw.paid_at) : null,
    created_at: String(raw.created_at ?? ''),
  }
}
