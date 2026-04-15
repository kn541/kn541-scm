'use client'
/**
 * KN541 SCM 상품 관리
 * GET  /scm/products       — 목록
 * 수정: /products/:id/edit 라우트로 이동
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
import Snackbar from '@mui/material/Snackbar'
import TablePagination from '@mui/material/TablePagination'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'
import { scmGet, fmtMoney, fmtDate } from '@/lib/scmApi'

interface ScmProduct {
  product_id:     string
  product_name:   string
  product_code:   string | null
  supply_price:   number
  sale_price:     number
  stock_qty:      number
  product_status: string
  is_display:     boolean
  created_at:     string
  category_name:  string | null
}

const STATUS_MAP: Record<string, { label: string; color: 'default'|'warning'|'success'|'error'|'info' }> = {
  WAITING:       { label: '승인대기', color: 'warning' },
  ON_SALE:       { label: '판매중',   color: 'success' },
  SOLD_OUT:      { label: '품절',     color: 'error'   },
  DISCONTINUED:  { label: '단종',     color: 'default' },
}

const STATUS_TABS = [
  { value: '',             label: '전체' },
  { value: 'WAITING',      label: '승인대기' },
  { value: 'ON_SALE',      label: '판매중' },
  { value: 'SOLD_OUT',     label: '품절' },
  { value: 'DISCONTINUED', label: '단종' },
]

const SEARCH_TYPES = [
  { label: '상품명', value: 'product_name' },
  { label: '상품코드', value: 'product_code' },
]

export default function ProductsView() {
  const router = useRouter()
  const [rows,       setRows]       = useState<ScmProduct[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)
  const [tab,        setTab]        = useState('')
  const [searchType, setSearchType] = useState(SEARCH_TYPES[0].value)
  const [keyword,    setKeyword]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [snack,      setSnack]      = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  const load = useCallback(async (pg = 0, status = tab, kw = keyword, sType = searchType) => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      if (status)    qs.set('product_status', status)
      if (kw.trim()) qs.set(sType, kw.trim())
      const data = await scmGet<{ items: ScmProduct[]; total: number }>(`/scm/products?${qs}`)
      setRows(data.items ?? []); setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [tab, keyword, searchType])

  useEffect(() => { void load(0) }, [load])

  const handleTabChange = (v: string) => {
    setTab(v); setPage(0); void load(0, v, keyword, searchType)
  }
  const handleSearch = () => { setPage(0); void load(0, tab, keyword, searchType) }
  const handleReset  = () => {
    setKeyword(''); setSearchType(SEARCH_TYPES[0].value); setPage(0)
    void load(0, tab, '', SEARCH_TYPES[0].value)
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h5' fontWeight={700}>상품 관리</Typography>
        <Button variant='contained' startIcon={<i className='tabler-plus' />}
          onClick={() => router.push('/products/new')}>
          상품 등록
        </Button>
      </Box>

      <Card>
        <CardHeader
          title='상품 목록'
          action={
            loading
              ? <CircularProgress size={16} />
              : <Chip label={`총 ${total.toLocaleString()}개`} size='small' color='primary' variant='outlined' sx={{ fontWeight: 600 }} />
          }
        />

        {/* 상태 탭 */}
        <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => handleTabChange(v)} variant='scrollable' scrollButtons='auto'>
            {STATUS_TABS.map(t => <Tab key={t.value} value={t.value} label={t.label} />)}
          </Tabs>
        </Box>

        {/* 검색 */}
        <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <CustomTextField select size='small' value={searchType}
            onChange={e => setSearchType(e.target.value)}
            sx={{ minWidth: 110 }}>
            {SEARCH_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </CustomTextField>
          <CustomTextField size='small' placeholder='검색어 입력' value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            sx={{ flex: 1, maxWidth: 320 }} />
          <Button variant='contained' size='small'
            startIcon={<i className='tabler-search' />}
            onClick={handleSearch}>검색</Button>
          <Button variant='outlined' color='secondary' size='small'
            startIcon={<i className='tabler-refresh' />}
            onClick={handleReset}>초기화</Button>
        </Box>

        {error && <Alert severity='error' sx={{ mx: 3, my: 2 }}>{error}</Alert>}

        <div className='overflow-x-auto'>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>코드</th>
                  <th>공급가</th>
                  <th>판매가</th>
                  <th>재고</th>
                  <th>상태</th>
                  <th>진열</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className='text-center py-10'>
                      <Typography color='text.secondary'>상품이 없습니다.</Typography>
                    </td>
                  </tr>
                ) : rows.map(p => {
                  const sm = STATUS_MAP[p.product_status] ?? { label: p.product_status, color: 'default' as const }
                  const isPending = p.product_status === 'WAITING'
                  return (
                    <tr key={p.product_id}
                      style={isPending ? { background: 'var(--mui-palette-warning-lightOpacity)' } : {}}>
                      <td>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isPending && <i className='tabler-clock text-warning' style={{ fontSize: 14 }} />}
                          <Box>
                            <Typography variant='body2' fontWeight={600} sx={{
                              maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>{p.product_name}</Typography>
                            {p.category_name && (
                              <Typography variant='caption' color='text.secondary'>{p.category_name}</Typography>
                            )}
                          </Box>
                        </Box>
                      </td>
                      <td><Typography variant='caption' color='text.secondary'>{p.product_code ?? '-'}</Typography></td>
                      <td><Typography variant='body2'>{fmtMoney(p.supply_price)}</Typography></td>
                      <td><Typography variant='body2' fontWeight={600}>{fmtMoney(p.sale_price)}</Typography></td>
                      <td>
                        <Typography variant='body2'
                          color={p.stock_qty === 0 ? 'error.main' : 'text.primary'}>
                          {p.stock_qty.toLocaleString('ko-KR')}
                        </Typography>
                      </td>
                      <td>
                        <Chip label={sm.label} size='small' color={sm.color}
                          variant={p.product_status === 'ON_SALE' ? 'filled' : 'outlined'} />
                      </td>
                      <td>
                        <Chip label={p.is_display ? '진열' : '숨김'} size='small'
                          color={p.is_display ? 'success' : 'default'} variant='outlined' />
                      </td>
                      <td><Typography variant='caption'>{fmtDate(p.created_at)}</Typography></td>
                      <td>
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
        <Alert severity={snack.sev} variant='filled'
          onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
