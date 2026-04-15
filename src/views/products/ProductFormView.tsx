'use client'
/**
 * KN541 SCM 상품 등록 / 수정
 * POST  /scm/products        — 등록
 * GET   /scm/products/:id    — 상세 조회 (수정 시)
 * PATCH /scm/products/:id    — 수정
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import CustomTextField from '@core/components/mui/TextField'
import { scmGet, scmPost, scmPatch } from '@/lib/scmApi'

interface ProductForm {
  product_name:    string
  product_code:    string
  category_id:     string
  supply_price:    string
  sale_price:      string
  stock_qty:       string
  product_status:  string
  is_display:      boolean
  description:     string
  weight_gram:     string
  origin:          string
}

const INITIAL: ProductForm = {
  product_name:   '',
  product_code:   '',
  category_id:    '',
  supply_price:   '',
  sale_price:     '',
  stock_qty:      '',
  product_status: 'WAITING',
  is_display:     false,
  description:    '',
  weight_gram:    '',
  origin:         '',
}

const STATUS_OPTIONS = [
  { value: 'WAITING',      label: '승인대기' },
  { value: 'ON_SALE',      label: '판매중' },
  { value: 'SOLD_OUT',     label: '품절' },
  { value: 'DISCONTINUED', label: '단종' },
]

interface Props { productId?: string }

export default function ProductFormView({ productId }: Props) {
  const router = useRouter()
  const isEdit = !!productId

  const [form,    setForm]    = useState<ProductForm>(INITIAL)
  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [snack,   setSnack]   = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  // 수정 시 기존 데이터 로드
  useEffect(() => {
    if (!isEdit) return
    scmGet<Record<string, unknown>>(`/scm/products/${productId}`)
      .then(d => setForm({
        product_name:   String(d.product_name   ?? ''),
        product_code:   String(d.product_code   ?? ''),
        category_id:    String(d.category_id    ?? ''),
        supply_price:   String(d.supply_price   ?? ''),
        sale_price:     String(d.sale_price     ?? ''),
        stock_qty:      String(d.stock_qty      ?? ''),
        product_status: String(d.product_status ?? 'WAITING'),
        is_display:     Boolean(d.is_display),
        description:    String(d.description   ?? ''),
        weight_gram:    String(d.weight_gram    ?? ''),
        origin:         String(d.origin         ?? ''),
      }))
      .catch(e => setError(String((e as Error).message)))
      .finally(() => setLoading(false))
  }, [productId, isEdit])

  const set = (k: keyof ProductForm, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.product_name.trim()) { toast('상품명을 입력하세요.', 'error'); return }
    if (!form.sale_price)         { toast('판매가를 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      const body = {
        product_name:   form.product_name.trim(),
        product_code:   form.product_code.trim() || null,
        category_id:    form.category_id  || null,
        supply_price:   Number(form.supply_price) || 0,
        sale_price:     Number(form.sale_price),
        stock_qty:      Number(form.stock_qty) || 0,
        product_status: form.product_status,
        is_display:     form.is_display,
        description:    form.description.trim() || null,
        weight_gram:    Number(form.weight_gram) || null,
        origin:         form.origin.trim() || null,
      }
      if (isEdit) {
        await scmPatch(`/scm/products/${productId}`, body)
        toast('상품이 수정됐습니다.')
      } else {
        await scmPost('/scm/products', body)
        toast('상품이 등록됐습니다.')
      }
      setTimeout(() => router.push('/products'), 1200)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.', 'error')
    } finally { setSaving(false) }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h5' fontWeight={700}>
          {isEdit ? '상품 수정' : '상품 등록'}
        </Typography>
        <Button variant='outlined' color='secondary' onClick={() => router.push('/products')}>
          목록으로
        </Button>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}

      <Card>
        <CardHeader title='기본 정보' />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <CustomTextField fullWidth label='상품명 *' value={form.product_name}
                onChange={e => set('product_name', e.target.value)}
                placeholder='상품명을 입력하세요' />
            </Grid>
            <Grid item xs={12} md={6}>
              <CustomTextField fullWidth label='상품코드' value={form.product_code}
                onChange={e => set('product_code', e.target.value)}
                placeholder='상품코드 (선택)' />
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomTextField fullWidth label='공급가 (원)' value={form.supply_price}
                onChange={e => set('supply_price', e.target.value)}
                type='number' placeholder='0' />
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomTextField fullWidth label='판매가 (원) *' value={form.sale_price}
                onChange={e => set('sale_price', e.target.value)}
                type='number' placeholder='0' />
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomTextField fullWidth label='재고 수량' value={form.stock_qty}
                onChange={e => set('stock_qty', e.target.value)}
                type='number' placeholder='0' />
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomTextField select fullWidth label='상품 상태' value={form.product_status}
                onChange={e => set('product_status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </CustomTextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomTextField fullWidth label='원산지' value={form.origin}
                onChange={e => set('origin', e.target.value)}
                placeholder='원산지 (선택)' />
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomTextField fullWidth label='무게 (g)' value={form.weight_gram}
                onChange={e => set('weight_gram', e.target.value)}
                type='number' placeholder='0' />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='상품 설명' />
        <CardContent>
          <CustomTextField fullWidth multiline rows={6} label='상품 설명'
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder='상품 설명을 입력하세요 (선택)' />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='진열 설정' />
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_display}
                onChange={e => set('is_display', e.target.checked)}
                color='success'
              />
            }
            label={
              <Box>
                <Typography variant='body2' fontWeight={600}>
                  {form.is_display ? '진열 중' : '숨김'}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  승인 후 진열 여부를 설정합니다
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      <Divider />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant='outlined' color='secondary' onClick={() => router.push('/products')}>
          취소
        </Button>
        <Button variant='contained' onClick={() => void handleSubmit()}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}>
          {saving ? '저장 중…' : isEdit ? '수정 완료' : '등록 완료'}
        </Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant='filled'
          onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
