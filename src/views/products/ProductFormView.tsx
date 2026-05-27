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
 *  - ImageUploader / RichEditor — 어드민 ProductForm과 동일
 *  - CategorySelect → API 기반 3단 직접 구현
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Collapse from '@mui/material/Collapse'

import CustomTextField from '@core/components/mui/TextField'
import ImageUploader from '@/components/upload/ImageUploader'
import RichEditor, { isRichHtmlEmpty } from '@/components/editor/RichEditor'
import { scmGet, scmPost, scmPatch, publicGet } from '@/lib/scmApi'
import { updateOption, type LegacyOption } from '@/hooks/useOptionGroups'
import { useSystemCodes } from '@/hooks/useSystemCodes'
import StockOrderSection from './sections/StockOrderSection'
import SaleScheduleSection from './sections/SaleScheduleSection'
import ShippingPolicySection from './sections/ShippingPolicySection'
import OptionGroupSection from './sections/OptionGroupSection'
import type { ShippingState as ShippingPolicyValue } from './sections/productFormTypes'

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

interface CatNode {
  id: string
  category_name: string
  children?: CatNode[]
}

const mapCatNodes = (nodes: CatNode[] | undefined): Category[] =>
  (nodes ?? []).map(c => ({
    id: c.id,
    category_name: c.category_name,
    parent_id: null,
    depth: 0,
  }))

/** DB numeric → API 문자열 대응 */
const toPriceStr = (v: unknown) => String(Number(v) || 0)

interface FormState {
  product_name:  string
  brand:         string
  category_id:   string
  supplier_product_code: string
  summary:            string
  description:          string
  mobile_description: string
  supply_price:         string
  sale_price:    string
  stock_qty:     string
  min_order_qty: string
  max_order_qty: string
  is_option:     boolean
  sale_start_at: string
  sale_end_at:   string
}

interface ScmShippingState {
  sc_type:       ScType
  sc_price:      string
  sc_minimum:    string
  sc_condition:  'amount' | 'qty'
  sc_qty:        string
  delivery_days: string
  return_fee:    string
  exchange_fee:  string
  delivery_co:   string
}

interface OptionDraft {
  key:         string
  /** DB product_options.id — 수정 시 PATCH에 사용 */
  id?:         string
  option_name: string
  option_group?: string
  add_price:   string
  stock_qty:   string
}

interface OptionGroupsLoad {
  option_mode?: string
  legacy_options?: LegacyOption[]
}

function mapLegacyToDrafts(rows: LegacyOption[]): OptionDraft[] {
  return rows.map(o => ({
    key: o.id,
    id: o.id,
    option_name: String(o.option_name ?? ''),
    option_group: o.option_group != null ? String(o.option_group) : undefined,
    add_price: String(o.add_price ?? 0),
    stock_qty: String(o.stock_qty ?? 0),
  }))
}

async function loadLegacyOptionDrafts(productId: string): Promise<OptionDraft[]> {
  try {
    const data = await scmGet<OptionGroupsLoad>(
      `/products/${encodeURIComponent(productId)}/option-groups`
    )
    const legacy = data?.legacy_options ?? []
    if (legacy.length > 0) return mapLegacyToDrafts(legacy)
  } catch {
    /* fallback below */
  }
  try {
    const optData = await scmGet<{ items?: LegacyOption[] }>(
      `/products/${encodeURIComponent(productId)}/options`
    )
    const items = (optData?.items ?? []).filter(
      o => (o as { value1_id?: string | null }).value1_id == null
        && (o as { value2_id?: string | null }).value2_id == null
    )
    return mapLegacyToDrafts(items)
  } catch {
    return []
  }
}

async function persistLegacyOptions(productId: string, drafts: OptionDraft[]) {
  for (const d of drafts) {
    const name = d.option_name.trim()
    if (!name) continue
    const body = {
      option_name: name,
      add_price: parseFloat(d.add_price) || 0,
      stock_qty: parseInt(d.stock_qty, 10) || 0,
    }
    if (d.id) {
      await updateOption(productId, d.id, body)
    } else {
      await scmPost(`/products/${encodeURIComponent(productId)}/options`, {
        ...body,
        sort_order: 0,
      })
    }
  }
}

const EMPTY_FORM: FormState = {
  product_name:  '',
  brand:         '',
  category_id:   '',
  supplier_product_code: '',
  summary:            '',
  description:          '',
  mobile_description: '',
  supply_price:         '0',
  sale_price:    '0',
  stock_qty:     '99999',
  min_order_qty: '1',
  max_order_qty: '',
  is_option:     false,
  sale_start_at: '',
  sale_end_at:   '',
}

const EMPTY_SHIP: ScmShippingState = {
  sc_type:       3,
  sc_price:      '0',
  sc_minimum:    '',
  sc_condition:  'amount',
  sc_qty:        '1',
  delivery_days: '2',
  return_fee:    '0',
  exchange_fee:  '0',
  delivery_co:   '',
}

const newKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())

function scmShippingToPolicy(s: ScmShippingState): ShippingPolicyValue {
  const threshold = s.sc_minimum
  return {
    sc_type: String(s.sc_type),
    sc_method: '0',
    sc_price: s.sc_price,
    sc_minimum: s.sc_condition === 'amount' ? threshold : '',
    sc_free_qty: s.sc_condition === 'qty' ? threshold : '',
    sc_qty: s.sc_qty,
    sc_condition_type: s.sc_condition,
    return_fee: s.return_fee,
    exchange_fee: s.exchange_fee,
    delivery_company: s.delivery_co,
    delivery_days: s.delivery_days,
  }
}

function policyToScmShipping(v: ShippingPolicyValue): ScmShippingState {
  const scType = Number(v.sc_type) as ScType
  const cond = v.sc_condition_type
  const sc_minimum = cond === 'amount' ? v.sc_minimum : (v.sc_free_qty || v.sc_minimum)
  return {
    sc_type: scType,
    sc_price: v.sc_price,
    sc_minimum,
    sc_condition: cond,
    sc_qty: v.sc_qty,
    delivery_days: v.delivery_days,
    return_fee: v.return_fee,
    exchange_fee: v.exchange_fee,
    delivery_co: v.delivery_company,
  }
}

function toDatetimeLocalInput(v: unknown): string {
  const s = v != null ? String(v) : ''
  if (!s) return ''
  if (s.includes('T')) return s.slice(0, 16)
  if (s.length >= 10) return `${s.slice(0, 10)}T00:00`
  return s
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
  const [draftProductId, setDraftProductId] = useState<string | null>(null)
  const [optionDraftSaving, setOptionDraftSaving] = useState(false)
  const resolvedProductId = productId ?? draftProductId
  const effectiveMode: 'create' | 'edit' = mode === 'edit' || draftProductId ? 'edit' : 'create'

  // ── 폼 상태 ─────────────────────────────
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM)
  const [shipping, setShipping] = useState<ScmShippingState>(EMPTY_SHIP)
  const [options,  setOptions]  = useState<OptionDraft[]>([])
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([])
  const [detailUrls, setDetailUrls] = useState<string[]>([])
  const [mobileDescriptionOpen, setMobileDescriptionOpen] = useState(false)
  const [productCode, setProductCode] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('PENDING')

  const categoryInitRef = useRef(false)

  const isApprovedLocked = mode === 'edit' && approvalStatus === 'APPROVED'

  // ── 카테고리 3단 ─────────────────────────
  const [cats1, setCats1] = useState<Category[]>([])   // 대분류
  const [cats2, setCats2] = useState<Category[]>([])   // 중분류
  const [cats3, setCats3] = useState<Category[]>([])   // 소분류
  const [sel1,  setSel1]  = useState('')
  const [sel2,  setSel2]  = useState('')
  const [taxType, setTaxType] = useState('0')

  const { codes: taxCodes } = useSystemCodes(['tax_type'])
  const taxTypeOptions = (taxCodes['tax_type'] ?? []).map(c => ({
    value: c.code_value || c.code,
    label: c.code_name,
  }))

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

  // ── 대분류 로드 (GET /categories — 루트 노드 전체, 1뎁스·사전예약·밸류업 포함) ─────
  useEffect(() => {
    void publicGet<{ items?: Array<CatNode & { depth?: number }> }>('/categories')
      .then(d => {
        const items = d?.items ?? []
        setCats1(mapCatNodes(items))
      })
      .catch(() => setCats1([]))

    const uname = typeof window !== 'undefined' ? localStorage.getItem('username') : ''
    const uid = typeof window !== 'undefined' ? localStorage.getItem('user_id') : ''
    setSupplierName(uname ?? uid ?? '본인')
  }, [])

  // ── 중분류 로드 (GET /categories/{id} → children) ──
  useEffect(() => {
    if (!sel1) {
      setCats2([])
      setCats3([])
      setSel2('')
      if (!categoryInitRef.current) {
        setForm(f => ({ ...f, category_id: '' }))
      }
      return
    }
    if (categoryInitRef.current) return
    void publicGet<CatNode>(`/categories/${encodeURIComponent(sel1)}`)
      .then(node => {
        const children = mapCatNodes(node?.children)
        setCats2(children)
        setCats3([])
        setSel2('')
        // 하위 없는 1뎁스(사전예약·밸류업 등): 대분류 ID를 leaf category_id로 사용
        setForm(f => ({ ...f, category_id: children.length === 0 ? sel1 : '' }))
      })
      .catch(() => {
        setCats2([])
        setCats3([])
        setSel2('')
        setForm(f => ({ ...f, category_id: sel1 }))
      })
  }, [sel1])

  // ── 소분류 로드 ───────────────────────────
  useEffect(() => {
    if (!sel2) {
      setCats3([])
      if (!sel1 && !categoryInitRef.current) {
        setForm(f => ({ ...f, category_id: '' }))
      }
      return
    }
    if (categoryInitRef.current) return
    void publicGet<CatNode>(`/categories/${encodeURIComponent(sel2)}`)
      .then(node => {
        const items = mapCatNodes(node?.children)
        setCats3(items)
        if (items.length === 0) setForm(f => ({ ...f, category_id: sel2 }))
        else setForm(f => ({ ...f, category_id: '' }))
      })
      .catch(() => setCats3([]))
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

        setProductCode(String(product.product_code ?? ''))
        setTaxType(String(product.tax_type ?? '0'))

        setApprovalStatus(String(product.approval_status ?? 'PENDING'))

        const cid1 = product.category_id_1 ? String(product.category_id_1) : ''
        const cid2 = product.category_id_2 ? String(product.category_id_2) : ''
        const leafId = String(product.category_id ?? product.category_id_2 ?? product.category_id_1 ?? '')

        categoryInitRef.current = true
        try {
          if (cid1) {
            const n1 = await publicGet<CatNode>(`/categories/${encodeURIComponent(cid1)}`)
            const sub1 = mapCatNodes(n1?.children)
            setCats2(sub1)
            setSel1(cid1)
            if (!cid2 && leafId === cid1) {
              setForm(f => ({ ...f, category_id: cid1 }))
            }
          }
          if (cid2) {
            const n2 = await publicGet<CatNode>(`/categories/${encodeURIComponent(cid2)}`)
            const sub = mapCatNodes(n2?.children)
            setCats3(sub)
            setSel2(cid2)
            if (sub.length === 0 && leafId === cid2) {
              setForm(f => ({ ...f, category_id: cid2 }))
            }
          }
        } finally {
          categoryInitRef.current = false
        }

        setForm({
          product_name: String(product.product_name ?? ''),
          brand: String(product.brand ?? ''),
          category_id: leafId,
          supplier_product_code: String(product.supplier_product_code ?? product.supplier_product_no ?? ''),
          summary: String(product.summary ?? ''),
          description: String(product.description ?? ''),
          mobile_description: String(product.mobile_description ?? ''),
          supply_price: toPriceStr(product.supply_price ?? product.original_supply_price ?? 0),
          sale_price: toPriceStr(product.sale_price ?? product.consumer_price ?? 0),
          stock_qty: String(product.stock_qty ?? 0),
          min_order_qty: String(product.min_order_qty ?? 1),
          max_order_qty: product.max_order_qty != null ? String(product.max_order_qty) : '',
          is_option: Boolean(product.is_option),
          sale_start_at: toDatetimeLocalInput(product.sale_start_at),
          sale_end_at: toDatetimeLocalInput(product.sale_end_at),
        })

        setThumbnailUrls(product.thumbnail_url ? [String(product.thumbnail_url)] : [])
        setDetailUrls(detailUrls)
        if (product.mobile_description) setMobileDescriptionOpen(true)

        const rawCond = product.sc_condition_type ?? product.sc_condition
        const sc_condition: ScmShippingState['sc_condition'] =
          rawCond === 'qty' || rawCond === 'QTY' ? 'qty' : 'amount'

        setShipping({
          sc_type: Number(product.sc_type ?? 3) as ScType,
          sc_price: String(product.sc_price ?? product.shipping_fee ?? 0),
          sc_minimum: product.sc_minimum != null ? String(product.sc_minimum) : '',
          sc_condition,
          sc_qty: product.sc_qty != null ? String(product.sc_qty) : '1',
          delivery_days: String(product.delivery_days ?? 2),
          return_fee: String(product.return_fee ?? 0),
          exchange_fee: String(product.exchange_fee ?? 0),
          delivery_co: String(product.delivery_company ?? product.delivery_co ?? ''),
        })

        if (!cancelled) setOptions([])
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

  const buildScmPayload = useCallback((): Record<string, unknown> => {
    const descHtml = isRichHtmlEmpty(form.description) ? null : form.description
    const mobileHtml = isRichHtmlEmpty(form.mobile_description) ? null : form.mobile_description
    return {
      product_name: form.product_name.trim(),
      brand: form.brand.trim() || null,
      category_id: form.category_id || null,
      supplier_product_code: form.supplier_product_code.trim() || null,
      summary: form.summary.trim() || null,
      description: descHtml,
      mobile_description: mobileHtml,
      thumbnail_url: thumbnailUrls[0]?.trim() || null,
      detail_images: detailUrls.filter(u => u.trim()),
      supply_price: supplyN,
      sale_price: saleN > 0 ? saleN : 1,
      stock_qty: parseInt(form.stock_qty, 10) || 0,
      min_order_qty: parseInt(form.min_order_qty, 10) || 1,
      max_order_qty: form.max_order_qty.trim() ? parseInt(form.max_order_qty, 10) : null,
      sc_type: shipping.sc_type,
      sc_price: parseFloat(shipping.sc_price) || 0,
      delivery_days: parseInt(shipping.delivery_days, 10) || 2,
      sale_start_at: form.sale_start_at || null,
      sale_end_at: form.sale_end_at || null,
      tax_type: parseInt(taxType, 10) || 0,
      is_option: form.is_option,
    }
  }, [form, supplyN, saleN, shipping, thumbnailUrls, detailUrls, taxType])

  const createDraftForOptions = useCallback(async (): Promise<string | null> => {
    try {
      const data = await scmPost<{ product_id?: string }>('/scm/products', {
        ...buildScmPayload(),
        product_name: form.product_name.trim() || '(임시) 옵션 상품',
        is_option: true,
      })
      const id = data?.product_id ? String(data.product_id) : null
      if (!id) {
        toast('임시 저장에 실패했습니다.', 'error')
        return null
      }
      return id
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '임시 저장에 실패했습니다.', 'error')
      return null
    }
  }, [buildScmPayload, form.product_name, toast])

  const handleIsOptionChange = useCallback(async (checked: boolean) => {
    if (!checked) {
      setForm(f => ({ ...f, is_option: false }))
      return
    }
    if (resolvedProductId) {
      setForm(f => ({ ...f, is_option: true }))
      return
    }
    setOptionDraftSaving(true)
    try {
      const id = await createDraftForOptions()
      if (!id) return
      setDraftProductId(id)
      setForm(f => ({ ...f, is_option: true }))
      toast('옵션 설정을 위해 상품이 임시 저장되었습니다.', 'success')
      // SCM-18 fix: router.replace() → history.replaceState()
      // router.replace()는 페이지를 리마운트시켜 sel1/sel2가 ''로 초기화되고
      // useEffect([sel1])이 category_id를 ''로 리셋하는 레이스 컨디션 발생
      // history.replaceState()는 URL만 변경하고 React 상태를 유지
      window.history.replaceState(null, '', `/products/${id}/edit`)
    } finally {
      setOptionDraftSaving(false)
    }
  }, [resolvedProductId, createDraftForOptions, toast])

  // ── 제출 ─────────────────────────────────
  const handleSubmit = async () => {
    if (isApprovedLocked) {
      toast('승인 완료(APPROVED) 상품은 공급사에서 수정할 수 없습니다. 변경이 필요하면 관리자에게 문의하세요.', 'error')
      return
    }
    if (!form.product_name.trim()) { toast('상품명을 입력하세요.', 'error'); return }
    if (!form.category_id)         { toast('카테고리를 선택하세요.', 'error'); return }
    if (!saleN || saleN <= 0)       { toast('판매가를 확인하세요.', 'error'); return }
    if (thumbnailUrls.length === 0) { toast('대표 이미지를 업로드해 주세요.', 'error'); return }

    setSaving(true)
    try {
      const payload = buildScmPayload()
      const pid = resolvedProductId

      if (effectiveMode === 'create' && !pid) {
        await scmPost<unknown>('/scm/products', payload)
        toast('등록 완료! (승인 대기)', 'success')
        setTimeout(() => router.push('/products'), 1500)
      } else if (pid) {
        const patchBody = {
          product_name: payload.product_name,
          supplier_product_code: payload.supplier_product_code,
          summary: payload.summary,
          description: payload.description,
          mobile_description: payload.mobile_description,
          thumbnail_url: payload.thumbnail_url,
          detail_images: payload.detail_images,
          supply_price: supplyN,
          sale_price: saleN,
          stock_qty: payload.stock_qty,
          min_order_qty: payload.min_order_qty,
          max_order_qty: payload.max_order_qty,
          sc_price: payload.sc_price,
          delivery_days: payload.delivery_days,
          is_option: form.is_option,
        }
        await scmPatch<unknown>(`/scm/products/${pid}`, patchBody)
        toast('저장되었습니다. (재심사 대기)', 'success')
        router.refresh()
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.'
      if (msg.includes('APPROVED') || msg.includes('승인')) {
        toast('승인 완료 상품은 수정할 수 없습니다. (PENDING/REJECTED만 수정 가능)', 'error')
      } else {
        toast(msg, 'error')
      }
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

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* 헤더 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant='h5' fontWeight={700}>
              {effectiveMode === 'create' ? '상품 등록' : '상품 수정'}
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
              <Typography
                variant='body2'
                fontWeight={700}
                color={
                  approvalStatus === 'APPROVED'
                    ? 'success.main'
                    : approvalStatus === 'REJECTED'
                      ? 'error.main'
                      : 'warning.main'
                }
              >
                {approvalStatus === 'APPROVED'
                  ? '승인완료 (수정 불가)'
                  : approvalStatus === 'REJECTED'
                    ? '반려 (수정 후 재심사)'
                    : '승인대기 (관리자 검토 중)'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {isApprovedLocked && (
          <Alert severity='info'>
            이 상품은 <strong>승인완료(APPROVED)</strong> 상태입니다. 공급사 계정에서는 내용을 변경할 수 없습니다.
            가격·카테고리 변경이 필요하면 관리자에게 요청해 주세요.
          </Alert>
        )}

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
                  (하위가 없으면 대분류만 선택 — 사전예약·밸류업 등)
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
                  <FormControl fullWidth size='small' disabled={!sel1 || (cats2.length === 0 && Boolean(sel1))}>
                    <InputLabel>중분류</InputLabel>
                    <Select label='중분류' value={cats2.length === 0 && sel1 ? sel1 : sel2}
                      onChange={e => setSel2(e.target.value)}>
                      <MenuItem value=''><em>{cats2.length === 0 && sel1 ? '(하위 없음 — 대분류 적용)' : '선택'}</em></MenuItem>
                      {cats2.length === 0 && sel1 ? (
                        <MenuItem value={sel1}>
                          {cats1.find(c => c.id === sel1)?.category_name ?? '대분류'}
                        </MenuItem>
                      ) : null}
                      {cats2.map(c => <MenuItem key={c.id} value={c.id}>{c.category_name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size='small' disabled={!sel2 || (cats2.length === 0 && Boolean(sel1))}>
                    <InputLabel>소분류</InputLabel>
                    <Select
                      label='소분류'
                      value={
                        cats2.length === 0 && sel1 && form.category_id === sel1
                          ? sel1
                          : cats3.length === 0 && sel2 && form.category_id === sel2
                            ? sel2
                            : form.category_id
                      }
                      onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    >
                      <MenuItem value=''><em>{cats2.length === 0 && sel1 ? '(대분류 적용)' : cats3.length === 0 && sel2 ? '(소분류 없음 — 중분류 적용)' : '선택'}</em></MenuItem>
                      {cats2.length === 0 && sel1 ? (
                        <MenuItem value={sel1}>
                          {cats1.find(c => c.id === sel1)?.category_name ?? '대분류'}
                        </MenuItem>
                      ) : null}
                      {cats3.length === 0 && sel2 ? (
                        <MenuItem value={sel2}>
                          {cats2.find(c => c.id === sel2)?.category_name ?? '중분류'}
                        </MenuItem>
                      ) : null}
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
            {mode === 'edit' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField fullWidth size='small' label='상품코드 (자사)' disabled
                  value={productCode || '—'}
                  helperText='8자리 자사코드. 시스템 자동 생성·수정 불가' />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField fullWidth size='small' label='공급사 상품코드'
                value={form.supplier_product_code}
                placeholder='공급사/KMC 상품코드 (선택)'
                helperText={mode === 'create' ? '자사 상품코드는 저장 후 자동 생성됩니다' : undefined}
                onChange={e => setForm(f => ({ ...f, supplier_product_code: e.target.value }))} />
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
              <CustomTextField
                select
                fullWidth
                size='small'
                label='세금유형'
                value={taxType}
                onChange={e => setTaxType(e.target.value)}
                helperText={taxTypeOptions.length ? 'system_codes tax_type' : '과세/면세 선택'}
              >
                {taxTypeOptions.length > 0 ? (
                  taxTypeOptions.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))
                ) : (
                  <>
                    <MenuItem value='0'>과세 (10%)</MenuItem>
                    <MenuItem value='1'>면세</MenuItem>
                  </>
                )}
              </CustomTextField>
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
        <ShippingPolicySection
          mode='scm'
          value={scmShippingToPolicy(shipping)}
          onChange={v => {
            setShipping(prev => {
              const next = policyToScmShipping(v)
              if (v.sc_price !== String(prev.sc_price)) {
                const price = parseFloat(v.sc_price) || 0
                next.return_fee = String(price * 2)
                next.exchange_fee = String(price * 2)
              }
              return next
            })
          }}
        />

        <Divider />

        {/* ⑤ 재고·주문 */}
        <StockOrderSection
          value={{ stock_qty: form.stock_qty, min_order_qty: form.min_order_qty, max_order_qty: form.max_order_qty }}
          onChange={s => setForm(f => ({ ...f, ...s }))}
          sectionLabel='⑤ 재고·주문'
        />

        <Divider />

        {/* ⑥ 예약 조건 */}
        <SaleScheduleSection
          sectionLabel='⑥ 예약 조건'
          hidePeriodToggle
          value={{
            sale_start_date: form.sale_start_at,
            sale_end_date: form.sale_end_at,
            use_schedule: true,
          }}
          onChange={next =>
            setForm(f => ({ ...f, sale_start_at: next.sale_start_date, sale_end_at: next.sale_end_date }))
          }
        />

        <Divider />

        {/* ⑦ 옵션 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>⑦ 옵션</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_option}
                disabled={optionDraftSaving || isApprovedLocked}
                onChange={e => void handleIsOptionChange(e.target.checked)}
              />
            }
            label={optionDraftSaving ? '옵션 사용 (임시 저장 중…)' : '옵션 사용'}
          />
          {form.is_option && resolvedProductId && (
            <Box sx={{ mt: 2, mb: 1, p: 2, border: '1px dashed', borderColor: 'primary.main', borderRadius: 2 }}>
              <Typography variant='body2' color='primary.main' sx={{ mb: 1, fontWeight: 600 }}>
                2단 조합 옵션
              </Typography>
              <OptionGroupSection productId={resolvedProductId} disabled={isApprovedLocked} />
            </Box>
          )}
          {form.is_option && !resolvedProductId && optionDraftSaving && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} />
              <Typography variant='caption' color='text.secondary'>
                옵션 설정을 위해 상품을 임시 저장하는 중…
              </Typography>
            </Box>
          )}
        </Box>

        <Divider />

        {/* ⑧ 대표 이미지 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>
            ⑧ 대표 이미지
            <Typography component='span' variant='caption' sx={{ ml: 1, color: 'error.main' }}>* 필수</Typography>
          </Typography>
          <ImageUploader
            bucket='products'
            folder='thumbnails'
            value={thumbnailUrls}
            onChange={setThumbnailUrls}
            maxCount={1}
          />
          {thumbnailUrls.length === 0 && (
            <Typography variant='caption' color='error' sx={{ mt: 0.5, display: 'block' }}>
              대표 이미지를 업로드해 주세요.
            </Typography>
          )}
        </Box>

        <Divider />

        {/* ⑨ 상세 이미지 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>
            ⑨ 상세 이미지
            <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>
              (최대 10장)
            </Typography>
          </Typography>
          <ImageUploader
            bucket='products'
            folder='detail'
            value={detailUrls}
            onChange={setDetailUrls}
            maxCount={10}
          />
        </Box>

        <Divider />

        {/* ⑩ 상세설명 */}
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>⑩ 상세설명</Typography>
          <CustomTextField fullWidth size='small' label='한줄 요약 (summary)' sx={{ mb: 2 }}
            value={form.summary}
            onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
          <Box>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
              상품 상세설명 (이미지 삽입 가능 — Supabase products/editor 저장)
            </Typography>
            <RichEditor
              value={form.description}
              onChange={v => setForm(f => ({ ...f, description: v }))}
              placeholder='상품 상세설명을 입력하세요.'
              minHeight={240}
              uploadBucket='products'
              uploadFolder='editor'
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Button
              size='small'
              variant='text'
              onClick={() => setMobileDescriptionOpen(o => !o)}
              sx={{ mb: mobileDescriptionOpen ? 1 : 0 }}
              endIcon={<i className={mobileDescriptionOpen ? 'tabler-chevron-up' : 'tabler-chevron-down'} />}
            >
              모바일 상세설명 {mobileDescriptionOpen ? '접기' : '펼치기'}
            </Button>
            <Collapse in={mobileDescriptionOpen}>
              <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                모바일 앱·좁은 화면용 상세 (비우면 PC 상세와 동일 노출 정책은 쇼핑몰 설정에 따름)
              </Typography>
              <RichEditor
                value={form.mobile_description}
                onChange={v => setForm(f => ({ ...f, mobile_description: v }))}
                placeholder='모바일용 상세설명'
                minHeight={200}
                uploadBucket='products'
                uploadFolder='editor'
              />
            </Collapse>
          </Box>
        </Box>

        {/* 저장 버튼 */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant='outlined' onClick={() => router.push('/products')}>목록</Button>
          <Button
            variant='contained'
            onClick={() => void handleSubmit()}
            disabled={saving || isApprovedLocked}
            startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
          >
            {effectiveMode === 'create' ? '등록하기' : isApprovedLocked ? '승인완료 — 수정 불가' : '저장하기'}
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
