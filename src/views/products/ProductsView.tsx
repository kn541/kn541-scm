'use client'
/**
 * KN541 SCM 상품 관리
 * GET /scm/products — v_scm_products_list (status_name 등 뷰 응답)
 * 탭 라벨: GET /system-codes?category=product_status
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
import ExcelDownBtn from '@/components/excel/ExcelDownBtn'
import { scmGet, fetchSystemCodesPublic, fmtMoney, fmtDate } from '@/lib/scmApi'

interface ScmProduct {
  product_id: string
  product_name: string
  product_code: string | null
  supply_price: number
  sale_price: number
  stock: number
  thumbnail_url: string | null
  status_code: string
  status_value: string | null
  status_name: string | null
  created_at?: string
}

type StatusTab = { code: string; label: string }

/** 배지 색상만 코드 기준 (한글 매핑 없음) */
const STATUS_BADGE_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  '001': 'warning',
  '002': 'success',
  '003': 'error',
  '004': 'default',
  '005': 'error',
}

const SEARCH_TYPES = [
  { label: '상품명', value: 'product_name' },
  { label: '상품코드', value: 'product_code' },
]

export default function ProductsView() {
  const router = useRouter()
  const [statusTabs, setStatusTabs] = useState<StatusTab[]>([{ code: '', label: '전체' }])
  const [codesLoading, setCodesLoading] = useState(true)

  const [rows, setRows] = useState<ScmProduct[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState('')
  const [searchType, setSearchType] = useState(SEARCH_TYPES[0].value)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as 'success' | 'error' })
  const toast = (msg: string, sev: 'success' | 'error' = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const items = await fetchSystemCodesPublic('product_status')
        if (cancelled) return
        const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        const tabs: StatusTab[] = [
          { code: '', label: '전체' },
          ...sorted.map((c) => ({ code: c.code, label: c.code_name })),
        ]
        setStatusTabs(tabs)
      } catch (e: unknown) {
        if (!cancelled) {
          toast(e instanceof Error ? e.message : '상태 코드를 불러오지 못했습니다.', 'error')
          setStatusTabs([{ code: '', label: '전체' }])
        }
      } finally {
        if (!cancelled) setCodesLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async (pg = 0, tabVal = tab, kw = keyword, sType = searchType) => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      if (tabVal) qs.set('status', tabVal)
      const sk = kw.trim()
      if (sk) {
        qs.set('search_field', sType)
        qs.set('search_keyword', sk)
      }
      const data = await scmGet<{ items: ScmProduct[]; total: number }>(`/scm/products?${qs}`)
      setRows(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e: unknown) {
      if (e instanceof Error && e.message === '401') return
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [tab, keyword, searchType])

  useEffect(() => {
    if (codesLoading) return
    void load(0)
    // 최초 코드 로드 후 1회 목록 조회 (탭/검색은 각 핸들러에서 호출)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codesLoading])

  const handleTabChange = (_: React.SyntheticEvent, v: string) => {
    setTab(v)
    setPage(0)
    void load(0, v, keyword, searchType)
  }

  const handleSearch = () => {
    setPage(0)
    void load(0, tab, keyword, searchType)
  }

  const handleReset = () => {
    setKeyword('')
    setSearchType(SEARCH_TYPES[0].value)
    setTab('')
    setPage(0)
    void load(0, '', '', SEARCH_TYPES[0].value)
  }

  const openProductWindow = (productId: string) => {
    window.open(`/scm/products/${productId}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h5' fontWeight={700}>상품 관리</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ExcelDownBtn
            entity='scm_products'
            filters={{ ...(tab ? { status: tab } : {}), ...(keyword.trim() ? { keyword: keyword.trim() } : {}) }}
            label='상품 다운로드'
          />
          <Button variant='contained' startIcon={<i className='tabler-plus' />}
            onClick={() => router.push('/products/new')}>
            상품 등록
          </Button>
        </Box>
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

        <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          {codesLoading ? (
            <Box sx={{ py: 2 }}><CircularProgress size={20} /></Box>
          ) : (
            <Tabs value={tab} onChange={handleTabChange} variant='scrollable' scrollButtons='auto'>
              {statusTabs.map((t) => (
                <Tab key={t.code || 'all'} value={t.code} label={t.label} />
              ))}
            </Tabs>
          )}
        </Box>

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
                  <th style={{ width: 100 }}>썸네일</th>
                  <th>상품명</th>
                  <th>코드</th>
                  <th>공급가</th>
                  <th>판매가</th>
                  <th>재고</th>
                  <th>상태</th>
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
                  const name = p.status_name ?? p.status_code ?? '-'
                  const color = STATUS_BADGE_COLOR[p.status_code] ?? 'default'
                  const pending = p.status_code === '001'
                  return (
                    <tr key={p.product_id}
                      style={pending ? { background: 'var(--mui-palette-warning-lightOpacity)' } : {}}>
                      <td>
                        <Box
                          sx={{ cursor: 'pointer', display: 'inline-block' }}
                          onClick={() => openProductWindow(p.product_id)}
                        >
                          {p.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.thumbnail_url}
                              alt=''
                              style={{
                                width: 80, height: 80, objectFit: 'cover', borderRadius: 6,
                                border: '1px solid var(--mui-palette-divider)',
                              }}
                            />
                          ) : (
                            <Box sx={{
                              width: 80, height: 80, bgcolor: 'action.hover', borderRadius: '6px',
                              border: '1px solid var(--mui-palette-divider)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <i className='tabler-photo' style={{ fontSize: 24, color: 'var(--mui-palette-text-secondary)' }} />
                            </Box>
                          )}
                        </Box>
                      </td>
                      <td>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {pending && <i className='tabler-clock text-warning' style={{ fontSize: 14 }} />}
                          <Typography
                            variant='body2'
                            fontWeight={600}
                            onClick={() => openProductWindow(p.product_id)}
                            sx={{
                              maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              cursor: 'pointer', textDecoration: 'underline', color: 'primary.main',
                            }}
                          >
                            {p.product_name}
                          </Typography>
                        </Box>
                      </td>
                      <td><Typography variant='caption' color='text.secondary'>{p.product_code ?? '-'}</Typography></td>
                      <td><Typography variant='body2'>{fmtMoney(p.supply_price)}</Typography></td>
                      <td><Typography variant='body2' fontWeight={600}>{fmtMoney(p.sale_price)}</Typography></td>
                      <td>
                        <Typography variant='body2'
                          color={Number(p.stock) === 0 ? 'error.main' : 'text.primary'}>
                          {Number(p.stock ?? 0).toLocaleString('ko-KR')}
                        </Typography>
                      </td>
                      <td>
                        <Chip label={name} size='small' color={color}
                          variant={p.status_code === '002' ? 'filled' : 'outlined'} />
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
