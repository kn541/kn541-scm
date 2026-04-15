'use client'
/**
 * KN541 SCM 상품 등록/수정 폼
 * POST /scm/products — 등록
 * PATCH /scm/products/:id — 수정
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Grid from '@mui/material/Grid'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import { scmGet, scmPost, scmPatch } from '@/lib/scmApi'

interface ProductForm {
  product_name: string
  brand: string
  product_code: string
  summary: string
  supply_price: string
  sale_price: string
  stock_qty: string
  is_display: boolean
  tax_type: string
  origin: string
}

const EMPTY: ProductForm = {
  product_name: '', brand: '', product_code: '', summary: '',
  supply_price: '0', sale_price: '0', stock_qty: '99999',
  is_display: true, tax_type: '0', origin: ''
}

export default function ProductFormView({ mode, productId }: { mode: 'create'|'edit'; productId?: string }) {
  const router = useRouter()
  const [form,    setForm]    = useState<ProductForm>(EMPTY)
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving,  setSaving]  = useState(false)
  const [snack,   setSnack]   = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    if (mode !== 'edit' || !productId) return
    scmGet<Record<string, unknown>>(`/scm/products/${productId}`)
      .then(p => setForm({
        product_name: String(p.product_name ?? ''),
        brand:        String(p.brand ?? ''),
        product_code: String(p.product_code ?? ''),
        summary:      String(p.summary ?? ''),
        supply_price: String(p.supply_price ?? '0'),
        sale_price:   String(p.sale_price ?? '0'),
        stock_qty:    String(p.stock_qty ?? '0'),
        is_display:   Boolean(p.is_display),
        tax_type:     String(p.tax_type ?? '0'),
        origin:       String(p.origin ?? ''),
      }))
      .catch(e => toast(String(e.message), 'error'))
      .finally(() => setLoading(false))
  }, [mode, productId])

  const set = (key: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSubmit = async () => {
    if (!form.product_name.trim()) { toast('상품명을 입력하세요.', 'error'); return }
    setSaving(true)
    const payload = {
      ...form,
      supply_price: Number(form.supply_price) || 0,
      sale_price:   Number(form.sale_price)   || 0,
      stock_qty:    Number(form.stock_qty)    || 0,
      tax_type:     Number(form.tax_type),
    }
    try {
      if (mode === 'create') {
        await scmPost('/scm/products', payload)
        toast('상품이 등록됐습니다.')
        router.push('/products')
      } else {
        await scmPatch(`/scm/products/${productId}`, payload)
        toast('저장됐습니다.')
        router.push('/products')
      }
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '저장 실패', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button variant='text' color='inherit' startIcon={<i className='tabler-arrow-left' />}
          onClick={() => router.push('/products')}>목록</Button>
        <Typography variant='h5' fontWeight={700}>
          {mode === 'create' ? '상품 등록' : '상품 수정'}
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          <Typography variant='subtitle2' color='text.secondary'>기본 정보</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField required fullWidth size='small' label='상품명'
                value={form.product_name} onChange={set('product_name')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size='small' label='브랜드'
                value={form.brand} onChange={set('brand')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size='small' label='원상품코드 (선택)'
                value={form.product_code} onChange={set('product_code')} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size='small' label='한줄 요약' multiline rows={2}
                value={form.summary} onChange={set('summary')} />
            </Grid>
          </Grid>

          <Divider />
          <Typography variant='subtitle2' color='text.secondary'>가격 / 재고</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField required fullWidth size='small' label='공급가' type='number'
                value={form.supply_price} onChange={set('supply_price')}
                inputProps={{ min: 0, step: 'any' }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField required fullWidth size='small' label='판매가' type='number'
                value={form.sale_price} onChange={set('sale_price')}
                inputProps={{ min: 0, step: 'any' }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size='small' label='재고수량' type='number'
                value={form.stock_qty} onChange={set('stock_qty')}
                inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth size='small' label='세금유형'
                value={form.tax_type} onChange={set('tax_type')}>
                <MenuItem value='0'>과세 (10%)</MenuItem>
                <MenuItem value='1'>비과세</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size='small' label='원산지'
                value={form.origin} onChange={set('origin')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={<Switch checked={form.is_display}
                  onChange={e => setForm(f => ({ ...f, is_display: e.target.checked }))} />}
                label='진열 여부' />
            </Grid>
          </Grid>

          <Divider />
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
            <Button variant='outlined' color='secondary'
              onClick={() => router.push('/products')}>취소</Button>
            <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}>
              {mode === 'create' ? '등록하기' : '저장하기'}
            </Button>
          </Box>
        </CardContent>
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
