'use client'
/**
 * KN541 SCM 상품 관리
 * GET /scm/products — 목록 (승인대기 표시)
 * PATCH /scm/products/:id — 수정
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import TablePagination from '@mui/material/TablePagination'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import AlertMui from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { scmGet, fmtMoney, fmtDate } from '@/lib/scmApi'

interface ScmProduct {
  product_id: string
  product_name: string
  product_code: string | null
  supply_price: number
  sale_price: number
  stock_qty: number
  product_status: string
  is_display: boolean
  created_at: string
  category_name: string | null
}

const STATUS_MAP: Record<string, { label: string; color: 'default'|'warning'|'success'|'error'|'info' }> = {
  WAITING:      { label: '승인대기', color: 'warning' },
  ON_SALE:      { label: '판매중',   color: 'success' },
  SOLD_OUT:     { label: '품절',     color: 'error'   },
  DISCONTINUED: { label: '단종',     color: 'default' },
}

const STATUS_TABS = [
  { value: '',            label: '전체' },
  { value: 'WAITING',     label: '승인대기' },
  { value: 'ON_SALE',     label: '판매중' },
  { value: 'SOLD_OUT',    label: '품절' },
  { value: 'DISCONTINUED',label: '단종' },
]

export default function ProductsView() {
  const router = useRouter()
  const [rows,    setRows]    = useState<ScmProduct[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [tab,     setTab]     = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [snack,   setSnack]   = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  const load = useCallback(async (pg = 0, status = tab, kw = keyword) => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      if (status) qs.set('product_status', status)
      if (kw.trim()) qs.set('keyword', kw.trim())
      const data = await scmGet<{ items: ScmProduct[]; total: number }>(`/scm/products?${qs}`)
      setRows(data.items ?? []); setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [tab, keyword])

  useEffect(() => { void load(0) }, [load])

  const handleTabChange = (v: string) => { setTab(v); setPage(0); void load(0, v, keyword) }
  const handleSearch = () => { setPage(0); void load(0, tab, keyword) }

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h5' fontWeight={700}>상품 관리</Typography>
        <Button variant='contained' startIcon={<i className='tabler-plus' />}
          onClick={() => router.push('/products/new')}>상품 등록</Button>
      </Box>

      <Card>
        <CardHeader
          title='상품 목록'
          action={
            !loading && <Chip label={`총 ${total.toLocaleString()}개`} size='small' color='primary' variant='outlined' sx={{ fontWeight: 600 }} />
          }
        />

        {/* 상태 탭 */}
        <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => handleTabChange(v)} variant='scrollable' scrollButtons='auto'>
            {STATUS_TABS.map(t => <Tab key={t.value} value={t.value} label={t.label} />)}
          </Tabs>
        </Box>

        {/* 검색 */}
        <Box sx={{ px: 3, py: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField size='small' placeholder='상품명 / 상품코드' value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            sx={{ flex: 1, maxWidth: 320 }} />
          <Button variant='contained' size='small' startIcon={<i className='tabler-search' />}
            onClick={handleSearch}>검색</Button>
          <Button variant='outlined' color='secondary' size='small'
            onClick={() => { setKeyword(''); setPage(0); void load(0, tab, '') }}>초기화</Button>
        </Box>

        {error && <Alert severity='error' sx={{ mx: 3, mb: 2 }}>{error}</Alert>}

        <div className='overflow-x-auto'>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                  {['상품명', '코드', '공급가', '판매가', '재고', '상태', '진열', '등록일', '관리'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                      color: 'var(--mui-palette-text-secondary)', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Typography color='text.secondary'>상품이 없습니다.</Typography>
                  </td></tr>
                ) : rows.map(p => {
                  const sm = STATUS_MAP[p.product_status] ?? { label: p.product_status, color: 'default' as const }
                  return (
                    <tr key={p.product_id} style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='body2' fontWeight={600} sx={{
                          maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{p.product_name}</Typography>
                        {p.category_name && <Typography variant='caption' color='text.secondary'>{p.category_name}</Typography>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='caption' color='text.secondary'>{p.product_code ?? '-'}</Typography>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='body2'>{fmtMoney(p.supply_price)}</Typography>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='body2' fontWeight={600}>{fmtMoney(p.sale_price)}</Typography>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='body2'>{p.stock_qty.toLocaleString('ko-KR')}</Typography>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip label={sm.label} size='small' color={sm.color}
                          variant={p.product_status === 'ON_SALE' ? 'filled' : 'outlined'} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip label={p.is_display ? '진열' : '숨김'} size='small'
                          color={p.is_display ? 'success' : 'default'} variant='outlined' />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='caption'>{fmtDate(p.created_at)}</Typography>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Tooltip title='수정'>
                          <IconButton size='small'
                            onClick={() => router.push(`/products/${p.product_id}/edit`)}>
                            <i className='tabler-edit' style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <TablePagination component='div' count={total} page={page} rowsPerPage={20} rowsPerPageOptions={[]}
          onPageChange={(_, p) => { setPage(p); void load(p) }}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}개`} />
      </Card>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <AlertMui severity={snack.sev} variant='filled'
          onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</AlertMui>
      </Snackbar>
    </Box>
  )
}
