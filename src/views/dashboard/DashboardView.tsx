'use client'
/**
 * KN541 SCM 대시보드
 * GET /scm/dashboard — 카드 4개 + 바로가기 + 최근 주문
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import { scmGet, fmtMoney } from '@/lib/scmApi'

interface DashboardData {
  pending_products:  number
  new_orders:        number
  this_month_sales:  number
  unsettled_amount:  number
  recent_orders?: Array<{
    order_no: string; status: string; total_amount: number; created_at: string
  }>
}

const STAT_CARDS = [
  { key: 'pending_products', label: '승인대기 상품', icon: 'tabler-clock',          color: 'warning.main', href: '/products',    isMoney: false, unit: '건' },
  { key: 'new_orders',       label: '신규 주문',     icon: 'tabler-shopping-bag',   color: 'primary.main', href: '/orders',      isMoney: false, unit: '건' },
  { key: 'this_month_sales', label: '이번달 매출',   icon: 'tabler-currency-won',   color: 'success.main', href: '/settlements', isMoney: true  },
  { key: 'unsettled_amount', label: '미정산 금액',   icon: 'tabler-receipt-off',    color: 'error.main',   href: '/settlements', isMoney: true  },
]

const QUICK_LINKS = [
  { label: '상품 등록', href: '/products/new', icon: 'tabler-plus',         color: 'primary'   as const },
  { label: '주문 관리', href: '/orders',       icon: 'tabler-list',          color: 'secondary' as const },
  { label: '정산 확인', href: '/settlements',  icon: 'tabler-receipt',       color: 'success'   as const },
  { label: '문의 답변', href: '/inquiries',    icon: 'tabler-message-reply', color: 'info'      as const },
]

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING:   '결제대기', PAID: '결제완료', PREPARING: '배송준비중',
  SHIPPED:   '배송중',   DELIVERED: '배송완료', CANCELLED: '취소',
}

export default function DashboardView() {
  const router = useRouter()
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    scmGet<DashboardData>('/scm/dashboard')
      .then(d => setData(d))
      .catch(e => {
        setData({ pending_products: 0, new_orders: 0, this_month_sales: 0, unsettled_amount: 0 })
        setError(String((e as Error).message))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box className='flex flex-col gap-6'>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant='h5' fontWeight={700}>대시보드</Typography>
        {(data?.pending_products ?? 0) > 0 && (
          <Chip
            label={`승인대기 ${data!.pending_products}건`}
            color='warning' size='small'
            onClick={() => router.push('/products')}
            sx={{ cursor: 'pointer', fontWeight: 700 }}
          />
        )}
      </Box>

      {error && !error.includes('401') && (
        <Alert severity='warning' onClose={() => setError('')}>{error}</Alert>
      )}

      {/* ── 통계 카드 4개 ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {STAT_CARDS.map(card => {
            const val = (data as Record<string, number> | null)?.[card.key] ?? 0
            return (
              <Grid key={card.key} item xs={12} sm={6} md={3}>
                <Card
                  sx={{ cursor: 'pointer', transition: 'box-shadow .15s', '&:hover': { boxShadow: 6 } }}
                  onClick={() => router.push(card.href)}
                >
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{
                        width: 48, height: 48, borderRadius: 2, bgcolor: card.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <i className={card.icon} style={{ fontSize: 24, color: '#fff' }} />
                      </Box>
                      <Box>
                        <Typography variant='caption' color='text.secondary' display='block'>
                          {card.label}
                        </Typography>
                        <Typography variant='h5' fontWeight={700} lineHeight={1.3}>
                          {card.isMoney
                            ? fmtMoney(val)
                            : `${val.toLocaleString('ko-KR')}${card.unit ?? ''}`
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* ── 바로가기 ── */}
      <Card>
        <CardContent>
          <Typography variant='subtitle2' fontWeight={700} color='text.secondary' sx={{ mb: 2 }}>
            바로가기
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {QUICK_LINKS.map(link => (
              <Button
                key={link.href}
                variant='outlined'
                color={link.color}
                size='small'
                startIcon={<i className={link.icon} />}
                onClick={() => router.push(link.href)}
              >
                {link.label}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* ── 최근 주문 ── */}
      {(data?.recent_orders?.length ?? 0) > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant='subtitle2' fontWeight={700} color='text.secondary'>최근 주문</Typography>
              <Button size='small' onClick={() => router.push('/orders')}>전체보기</Button>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            {data!.recent_orders!.map(o => (
              <Box key={o.order_no} sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                py: 0.75, borderBottom: '1px dashed', borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' }
              }}>
                <Typography variant='body2' fontWeight={600}>{o.order_no}</Typography>
                <Typography variant='caption' color='text.secondary'>{o.created_at?.slice(0, 10)}</Typography>
                <Chip
                  label={ORDER_STATUS_LABEL[o.status] ?? o.status}
                  size='small' variant='outlined'
                />
                <Typography variant='body2'>{fmtMoney(o.total_amount)}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
