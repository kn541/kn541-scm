'use client'
/**
 * KN541 SCM 상품 등록·수정 폼
 * 어드민 ProductForm.tsx와 동일한 섹션 구조
 *
 * 공급사 제약:
 *  - product_type: '001' 일반상품 고정 (탭 제거)
 *  - supplier_id:  localStorage.user_id 자동 지정 (선택 불가)
 *  - approval_status: PENDING 고정 (백엔드 자동 처리)
 *  - KMC 동기화 / 옵션 / 속성 / 상품정보고시 섹션 제거
 *  - ImageUploader → URL 직접 입력
 *  - RichEditor    → Textarea
 *  - CategorySelect → API 기반 3단 직접 구현
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Collapse from '@mui/material/Collapse'
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import TextField from '@mui/material/TextField'

import CustomTextField from '@core/components/mui/TextField'
import { scmGet, scmPost, scmPatch, publicGet } from '@/lib/scmApi'

// ─────────────────────────────────────────
// 타입
// ─────────────────────────────────────────
type ScType = 1 | 2 | 3 | 4

interface Category {
  id: string
  category_name: string
  parent_id: string | null
  depth: number
}

interface FormState {
  product_name:  string
  brand:         string
  category_id:   string
  summary:       string
  description:   string
  thumbnail_url: string
  detail_img_1:  string
  detail_img_2:  string
  detail_img_3:  string
  supply_price:  string
  sale_price:    string
  stock_qty:     string
  min_order_qty: string
  max_order_qty: string
  is_option:     boolean
  sale_start_at: string
  sale_end_at:   string
}

interface ShippingState {
  sc_type:       ScType
  sc_price:      string
  sc_minimum:    string
  sc_condition:  'amount' | 'qty'
  delivery_days: string
  return_fee:    string
  exchange_fee:  string
  delivery_co:   string
}

interface OptionDraft {
  key:         string
  option_name: string
  add_price:   string
  stock_qty:   string
}

const SC_TYPE_LABELS: Record<number, string> = {
  1: '무료배송',
  2: '조건부무료',
  3: '유료배송',
  4: '수량별부과',
}

const EMPTY_FORM: FormState = {
  product_name:  '',
  brand:         '',
  category_id:   '',
  summary:       '',
  description:   '',
  thumbnail_url: '',
  detail_img_1:  '',
  detail_img_2:  '',
  detail_img_3:  '',
  supply_price:  '0',
  sale_price:    '0',
  stock_qty:     '99999',
  min_order_qty: '1',
  max_order_qty: '',
  is_option:     false,
  sale_start_at: '',
  sale_end_at:   '',
}

const EMPTY_SHIP: ShippingState = {
  sc_type:       3,
  sc_price:      '0',
  sc_minimum:    '',
  sc_condition:  'amount',
  delivery_days: '3',
  return_fee:    '0',
  exchange_fee:  '0',
  delivery_co:   '',
}

const newKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())

// ─────────────────────────────────────────
// 배송비 미리보기
// ─────────────────────────────────────────
const ShippingPreview = ({ scQty, scPrice }: { scQty: number; scPrice: number }) => {
  if (!scQty || !scPrice) return null
  const samples = [1, 3, 5, 10]
  return (
    <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, mt: 1 }}>
      <Typography variant='caption' color='text.secondary' fontWeight={600}>
        💡 수량별부과 예시 (단위: {scQty}개당 ₩{scPrice.toLocaleString('ko-KR')})
      </Typography>
      {samples.map(qty => (
        <Box key={qty} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
          <Typography variant='caption'>{qty}개 구매</Typography>
          <Typography variant='caption' fontWeight={700}>
            → 배송비 ₩{(Math.ceil(qty / scQty) * scPrice).toLocaleString('ko-KR')}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─────────────────────────────────────────
// Props
// ─────────────────────────────────────────
type Props = { mode?: 'create' | 'edit'; productId?: string }

// ─────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────
export default function ProductFormView({ mode = 'create', productId }: Props) {
  const router = useRouter()

  // ── 폼 상태 ─────────────────────────────
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM)
  const [shipping, setShipping] = useState<ShippingState>(EMPTY_SHIP)
  const [options,  setOptions]  = useState<OptionDraft[]>([])

  // ── 카테고리 3단 ─────────────────────────
  const [cats1, setCats1] = useState<Category[]>([])   // 대분류
  const [cats2, setCats2] = useState<Category[]>([])   // 중분류
  const [cats3, setCats3] = useState<Category[]>([])   // 소분류
  const [sel1,  setSel1]  = useState('')
  const [sel2,  setSel2]  = useState('')

  // ── UI ──────────────────────────────────
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving,  setSaving]  = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>(
    { open: false, msg: '', sev: 'success' }
  )

  // 로그인 공급사 정보
  const [supplierName, setSupplierName] = useState('')

  const toast = useCallback((msg: string, sev: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, sev }), [])

  // ── 대분류 로드 ───────────────────────────
  useEffect(() => {
    void publicGet<{ items?: Category[] }>('/categories?parent_id=null&size=100')
      .then(d => setCats1(d.items ?? []))
      .catch(() => setCats1([]))

    // 공급사명 조회
    const uid = typeof window !== 'undefined' ? localStorage.getItem('user_id') : ''
    const uname = typeof window !== 'undefined' ? localStorage.getItem('username') : ''
    setSupplierName(uname ?? uid ?? '본인')
  }, [])

  // ── 중분류 로드 ───────────────────────────
  useEffect(() => {
    if (!sel1) { setCats2([]); setCats3([]); setSel2(''); setForm(f => ({ ...f, category_id: '' })); return }
    void publicGet<{ items?: Category[] }>(`/categories?parent_id=${encodeURIComponent(sel1)}&size=100`)
      .then(d => setCats2(d.items ?? []))
      .catch(() => setCats2([]))
    setCats3([]); setSel2(''); setForm(f => ({ ...f, category_id: '' }))
  }, [sel1])

  // ── 소분류 로드 ───────────────────────────
  useEffect(() => {
    if (!sel2) { setCats3([]); setForm(f => ({ ...f, category_id: '' })); return }
    void publicGet<{ items?: Category[] }>(`/categories?parent_id=${encodeURIComponent(sel2)}&size=100`)
      .then(d => {
        const items: Category[] = d.items ?? []
        setCats3(items)
        // 소분류가 없으면 중분류 자체를 category_id로
        if (items.length === 0) setForm(f => ({ ...f, category_id: sel2 }))
      })
      .catch(() => setCats3([]))
    setForm(f => ({ ...f, category_id: '' }))
  }, [sel2])

  // ── edit 모드 데이터 로드 ─────────────────
  // 백엔드: GET /products/{id} (v_product_detail) — SCM 목록 API에는 상세 필드가 부족해 공개 단건 조회 사용
  useEffect(() => {
    if (mode !== 'edit' || !productId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const product = await publicGet<Record<string, any>>(`/products/${encodeURIComponent(productId)}`)
        if (cancelled) return

        const imgs: Array<{ image_url?: string; image_type?: string }> = Array.isArray(product.images)
          ? [...product.images].sort(
              (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
            )
          : []
        const detailUrls = imgs
          .filter(i => i?.image_type !== 'THUMBNAIL' && i?.image_url)
          .map(i => String(i.image_url))

        setForm({
          product_name: String(product.product_name ?? ''),
          brand: String(product.brand ?? ''),
          category_id: String(product.category_id ?? product.category_id_2 ?? product.category_id_1 ?? ''),
          summary: String(product.summary ?? ''),
          description: String(product.description ?? ''),
          thumbnail_url: String(product.thumbnail_url ?? ''),
          detail_img_1: detailUrls[0] ?? '',
          detail_img_2: detailUrls[1] ?? '',
          detail_img_3: detailUrls[2] ?? '',
          supply_price: String(product.supply_price ?? 0),
          sale_price: String(product.sale_price ?? 0),
          stock_qty: String(product.stock_qty ?? 0),
          min_order_qty: String(product.min_order_qty ?? 1),
          max_order_qty: product.max_order_qty != null ? String(product.max_order_qty) : '',
          is_option: Boolean(product.is_option),
          sale_start_at: product.sale_start_at ? String(product.sale_start_at).slice(0, 10) : '',
          sale_end_at: product.sale_end_at ? String(product.sale_end_at).slice(0, 10) : '',
        })

        setShipping({
          sc_type: Number(product.sc_type ?? 3) as ScType,
          sc_price: String(product.sc_price ?? product.shipping_fee ?? 0),
          sc_minimum: product.sc_minimum != null ? String(product.sc_minimum) : '',
          sc_condition: (product.sc_condition as ShippingState['sc_condition']) ?? 'amount',
          delivery_days: String(product.delivery_days ?? 3),
          return_fee: String(product.return_fee ?? 0),
          exchange_fee: String(product.exchange_fee ?? 0),
          delivery_co: String(product.delivery_company ?? product.delivery_co ?? ''),
        })
      } catch (e: unknown) {
        toast(e instanceof Error ? e.message : '상품 정보를 불러올 수 없습니다.', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [mode, productId, toast])

  // ── 수익 계산 ─────────────────────────────
  const supplyN = parseFloat(form.supply_price) || 0
  const saleN   = parseFloat(form.sale_price)   || 0
  const profit  = saleN - supplyN

  // ── 배송비 변경 → 반품/교환비 자동 계산 ───
  const handleScPriceChange = (val: string) => {
    const p = parseFloat(val) || 0
    setShipping(s => ({ ...s, sc_price: val, return_fee: String(p * 2), exchange_fee: String(p * 2) }))
  }

  // ── 제출 ─────────────────────────────────
  const handleSubmit = async () => {
    if (!form.product_name.trim()) { toast('상품명을 입력하세요.', 'error'); return }
    if (!saleN || saleN <= 0)       { toast('판매가를 확인하세요.', 'error'); return }

    setSaving(true)
    try {
      const detailUrls = [form.detail_img_1, form.detail_img_2, form.detail_img_3]
        .filter(u => u.trim())

      const payload: Record<string, any> = {
        product_name:  form.product_name.trim(),
        brand:         form.brand.trim() || null,
        category_id:   form.category_id || null,
        summary:       form.summary.trim() || null,
        description:   form.description.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        detail_images: detailUrls,
        supply_price:  supplyN,
        sale_price:    saleN,
        stock_qty:     parseInt(form.stock_qty, 10) || 0,
        min_order_qty: parseInt(form.min_order_qty, 10) || 1,
        max_order_qty: form.max_order_qty.trim() ? parseInt(form.max_order_qty, 10) : null,
        sc_type:       shipping.sc_type,
        sc_price:      parseFloat(shipping.sc_price) || 0,
        delivery_days: parseInt(shipping.delivery_days, 10) || 3,
        sale_start_at: form.sale_start_at || null,
        sale_end_at:   form.sale_end_at   || null,
      }

      if (mode === 'create') {
        const res = await scmPost<any>('/scm/products', payload)
        toast(`등록 완료! (승인 대기)`, 'success')
        setTimeout(() => router.push('/products'), 1500)
      } else if (productId) {
        await scmPatch<any>(`/scm/products/${productId}`, payload)
        toast('저장되었습니다. (재심사 대기)', 'success')
        router.refresh()
      }
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    )
  }

  const showShippingFee = shipping.sc_type !== 1

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* 헤더 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant='h5' fontWeight={700}>
              {mode === 'create' ? '상품 등록' : '상품 수정'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              일반상품 · 공급사 자동 지정 ({supplierName}) · 등록 후 관리자 승인 필요
            </Typography>
          </Box>
          <Chip
            label='일반상품 (001)'
            color='primary'
            size='small'
            icon={<i className='tabler-package' style={{ fontSize: 14 }} />}
          />
        </Box>

        <Divider />

        {/* ① 공급사 자동지정 안내 (어드민의 ② 기본정보 상단 역할) */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='tabler-building' style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }} />
            <Box>
              <Typography variant='caption' color='text.secondary' display='block'>공급사 (자동 지정)</Typography>
              <Typography variant='body2' fontWeight={700}>{supplierName}</Typography>
            </Box>
          </Box>
          <Divider orientation='vertical' flexItem />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='tabler-clock' style={{ fontSize: 18, color: 'var(--mui-palette-warning-main)' }} />
            <Box>
              <Typography variant='caption' color='text.secondary' display='block'>승인 상태</Typography>
              <Typography variant='body2' fontWeight={700} color='warning.main'>PENDING (관리자 승인 대기)</Typography>
            </Box>
          </Box>
        </Box>

        {/* ② 기본정보 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>② 기본정보</Typography>
          <Grid container spacing={2}>

            {/* 카테고리 3단 */}
            <Grid size={12}>
              <Typography variant='body2' sx={{ mb: 0.5 }}>
                카테고리
                <Typography component='span' sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>
                  (3단까지 선택 권장)
                </Typography>
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size='small'>
                    <InputLabel>대분류</InputLabel>
                    <Select label='대분류' value={sel1}
                      onChange={e => setSel1(e.target.value)}>
                      <MenuItem value=''><em>선택</em></MenuItem>
                      {cats1.map(c => <MenuItem key={c.id} value={c.id}>{c.category_name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size='small' disabled={!sel1}>
                    <InputLabel>중분류</InputLabel>
                    <Select label='중분류' value={sel2}
                      onChange={e => setSel2(e.target.value)}>
                      <MenuItem value=''><em>선택</em></MenuItem>
                      {cats2.map(c => <MenuItem key={c.id} value={c.id}>{c.category_name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size='small' disabled={!sel2 || cats3.length === 0}>
                    <InputLabel>소분류</InputLabel>
                    <Select label='소분류' value={form.category_id}
                      onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                      <MenuItem value=''><em>{cats3.length === 0 && sel2 ? '(없음)' : '선택'}</em></MenuItem>
                      {cats3.map(c => <MenuItem key={c.id} value={c.id}>{c.category_name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField fullWidth size='small' label='브랜드 (선택)'
                value={form.brand}
                placeholder='브랜드명 입력 (미입력 가능)'
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField fullWidth size='small' label='상품코드' disabled
                value={mode === 'create' ? '저장 후 자동 생성' : productId ?? ''}
                helperText='시스템 자동 생성. 수정 불가' />
            </Grid>
            <Grid size={12}>
              <CustomTextField required fullWidth size='small' label='상품명'
                value={form.product_name}
                onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} />
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* ③ 가격정보 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>③ 가격정보</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField required fullWidth size='small' label='판매가 (원)' type='number'
                value={form.sale_price}
                onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))}
                slotProps={{ htmlInput: { min: 0, step: 'any' } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField fullWidth size='small' label='공급가 (원)' type='number'
                value={form.supply_price}
                onChange={e => setForm(f => ({ ...f, supply_price: e.target.value }))}
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                helperText='공급사 공급 가격' />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField fullWidth size='small' label='세금유형' disabled
                value='과세 (10%)'
                helperText='일반상품 기본 과세' />
            </Grid>
            <Grid size={12}>
              <Typography variant='body2' color={profit >= 0 ? 'primary' : 'error'}>
                예상 이익금: {profit.toLocaleString('ko-KR')}원
                <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>
                  (판매가 - 공급가)
                </Typography>
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* ④ 배송정책 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>④ 배송정책</Typography>
          <Card variant='outlined'>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

              <Box>
                <Typography variant='body2' fontWeight={600} sx={{ mb: 1 }}>배송비 유형 *</Typography>
                <RadioGroup row value={String(shipping.sc_type)}
                  onChange={e => setShipping(s => ({ ...s, sc_type: Number(e.target.value) as ScType }))}>
                  {([1, 2, 3, 4] as ScType[]).map(t => (
                    <FormControlLabel key={t} value={String(t)} control={<Radio />} label={SC_TYPE_LABELS[t]} />
                  ))}
                </RadioGroup>
              </Box>

              {/* 조건부무료 */}
              <Collapse in={shipping.sc_type === 2}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <RadioGroup row value={shipping.sc_condition}
                    onChange={e => setShipping(s => ({ ...s, sc_condition: e.target.value as 'amount' | 'qty' }))}>
                    <FormControlLabel value='amount' control={<Radio />} label='금액 기준 (N원 이상 무료)' />
                    <FormControlLabel value='qty'    control={<Radio />} label='수량 기준 (N개 이상 무료)' />
                  </RadioGroup>
                  <CustomTextField fullWidth size='small'
                    label={shipping.sc_condition === 'amount' ? '무료배송 기준금액 (원 이상)' : '무료배송 기준수량 (개 이상)'}
                    type='number' value={shipping.sc_minimum}
                    onChange={e => setShipping(s => ({ ...s, sc_minimum: e.target.value }))} />
                </Box>
              </Collapse>

              {/* 유료 / 수량별 배송비 */}
              <Collapse in={showShippingFee}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='배송비 (원)' type='number'
                      value={shipping.sc_price}
                      onChange={e => handleScPriceChange(e.target.value)}
                      helperText='입력 시 반품/교환비 ×2 자동계산' />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='반품 배송비 (원)' type='number'
                      value={shipping.return_fee}
                      onChange={e => setShipping(s => ({ ...s, return_fee: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='교환 배송비 (원)' type='number'
                      value={shipping.exchange_fee}
                      onChange={e => setShipping(s => ({ ...s, exchange_fee: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='배송사 (예: CJ대한통운)'
                      value={shipping.delivery_co}
                      onChange={e => setShipping(s => ({ ...s, delivery_co: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='평균 배송일' type='number'
                      value={shipping.delivery_days}
                      onChange={e => setShipping(s => ({ ...s, delivery_days: e.target.value }))}
                      slotProps={{ htmlInput: { min: 1, max: 60 } }} />
                  </Grid>
                </Grid>
                {shipping.sc_type === 4 && (
                  <ShippingPreview scQty={1} scPrice={parseFloat(shipping.sc_price) || 0} />
                )}
              </Collapse>

              {/* 무료배송일 때만 배송일 표시 */}
              <Collapse in={shipping.sc_type === 1}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='평균 배송일' type='number'
                      value={shipping.delivery_days}
                      onChange={e => setShipping(s => ({ ...s, delivery_days: e.target.value }))}
                      slotProps={{ htmlInput: { min: 1, max: 60 } }} />
                  </Grid>
                </Grid>
              </Collapse>

            </CardContent>
          </Card>
        </Box>

        <Divider />

        {/* ⑤ 재고·주문 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>⑤ 재고·주문</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField fullWidth size='small' label='재고수량' type='number'
                value={form.stock_qty}
                onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))}
                slotProps={{ htmlInput: { min: 0 } }}
                helperText='미설정 시 기본 99,999' />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField fullWidth size='small' label='최소주문수량' type='number'
                value={form.min_order_qty}
                onChange={e => setForm(f => ({ ...f, min_order_qty: e.target.value }))}
                slotProps={{ htmlInput: { min: 1 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField fullWidth size='small' label='최대주문수량 (비우면 무제한)' type='number'
                value={form.max_order_qty}
                onChange={e => setForm(f => ({ ...f, max_order_qty: e.target.value }))}
                slotProps={{ htmlInput: { min: 1 } }} />
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* ⑥ 예약 조건 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>⑥ 예약 조건</Typography>
          <Card variant='outlined'>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField fullWidth size='small' label='판매 시작일 (비우면 승인 후 즉시)' type='datetime-local'
                    value={form.sale_start_at}
                    onChange={e => setForm(f => ({ ...f, sale_start_at: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField fullWidth size='small' label='판매 종료일 (비우면 무기한)' type='datetime-local'
                    value={form.sale_end_at}
                    onChange={e => setForm(f => ({ ...f, sale_end_at: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>

        <Divider />

        {/* ⑦ 옵션 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>⑦ 옵션</Typography>
          <FormControlLabel
            control={<Switch checked={form.is_option}
              onChange={e => setForm(f => ({ ...f, is_option: e.target.checked }))} />}
            label='옵션 사용' />
          {form.is_option && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {options.map(d => (
                <Grid container spacing={1} key={d.key} alignItems='center'>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='옵션명'
                      value={d.option_name}
                      onChange={e => setOptions(prev =>
                        prev.map(x => x.key === d.key ? { ...x, option_name: e.target.value } : x))} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <CustomTextField fullWidth size='small' label='추가금액' type='number'
                      value={d.add_price}
                      onChange={e => setOptions(prev =>
                        prev.map(x => x.key === d.key ? { ...x, add_price: e.target.value } : x))} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <CustomTextField fullWidth size='small' label='재고' type='number'
                      value={d.stock_qty}
                      onChange={e => setOptions(prev =>
                        prev.map(x => x.key === d.key ? { ...x, stock_qty: e.target.value } : x))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <IconButton size='small'
                      onClick={() => setOptions(prev => prev.filter(x => x.key !== d.key))}>
                      <i className='tabler-x' />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button size='small' variant='outlined'
                onClick={() => setOptions(prev => [
                  ...prev, { key: newKey(), option_name: '', add_price: '0', stock_qty: '0' }
                ])}>+ 옵션 행 추가</Button>
            </Box>
          )}
        </Box>

        <Divider />

        {/* ⑧ 대표 이미지 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 1, color: 'text.secondary' }}>
            ⑧ 대표 이미지
            <Typography component='span' variant='caption' sx={{ ml: 1, color: 'error.main' }}>* URL 직접 입력</Typography>
          </Typography>
          <CustomTextField fullWidth size='small' label='대표 이미지 URL'
            value={form.thumbnail_url}
            placeholder='https://example.com/image.jpg'
            onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} />
          {form.thumbnail_url && (
            <Box sx={{ mt: 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.thumbnail_url} alt='preview'
                style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, border: '1px solid #ddd' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </Box>
          )}
        </Box>

        <Divider />

        {/* ⑨ 상세 이미지 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>
            ⑨ 상세 이미지
            <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>(최대 3개 URL)</Typography>
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {(['detail_img_1', 'detail_img_2', 'detail_img_3'] as const).map((key, i) => (
              <CustomTextField key={key} fullWidth size='small' label={`상세 이미지 ${i + 1}`}
                value={form[key]}
                placeholder='https://example.com/detail.jpg'
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            ))}
          </Box>
        </Box>

        <Divider />

        {/* ⑩ 상세설명 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>⑩ 상세설명</Typography>
          <CustomTextField fullWidth size='small' label='한줄 요약 (summary)' sx={{ mb: 2 }}
            value={form.summary}
            onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
          <TextField
            fullWidth multiline rows={8} label='상품 상세설명'
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder='상품 상세설명을 입력하세요.'
            size='small' />
        </Box>

        {/* 저장 버튼 */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant='outlined' onClick={() => router.push('/products')}>목록</Button>
          <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}>
            {mode === 'create' ? '등록하기' : '저장하기'}
          </Button>
        </Box>

      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant='filled'
          onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  )
}
