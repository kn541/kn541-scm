'use client'
// KN541 ProductForm 공통 sub-component (옵션 3: 양 레포 동일 파일 + prop-driven)
// 배송정책 섹션
//
// 변경 시 동기화:
//   1) admin/starter-kit/src/views/products/sections/ShippingPolicySection.tsx (master)
//   2) kn541-scm/src/views/products/sections/ShippingPolicySection.tsx
// 두 파일은 100% 동일해야 하며, 한쪽만 변경 시 양쪽 push 필수.

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Collapse from '@mui/material/Collapse'
import MenuItem from '@mui/material/MenuItem'
import CustomTextField from '@core/components/mui/TextField'

import type { ShippingState } from './productFormTypes'

const SC_TYPE_LABELS: Record<number, string> = {
  1: '무료배송',
  2: '조건부무료',
  3: '유료배송',
  4: '수량별부과',
}

function ShippingPreview({ scQty, scPrice }: { scQty: number; scPrice: number }) {
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

interface Props {
  value: ShippingState
  onChange: (next: ShippingState) => void
  sectionLabel?: string
  /** SCM에서 결제방식 필드 숨김 등 */
  mode?: 'admin' | 'scm'
}

export default function ShippingPolicySection({
  value,
  onChange,
  sectionLabel = '④ 배송정책',
  mode = 'admin',
}: Props) {
  const scType = Number(value.sc_type) || 1
  const showShippingFee = scType !== 1
  const patch = (partial: Partial<ShippingState>) => onChange({ ...value, ...partial })

  return (
    <Box>
      <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>
        {sectionLabel}
      </Typography>
      <Card variant='outlined'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant='body2' fontWeight={600} sx={{ mb: 1 }}>
              배송비 유형
            </Typography>
            <RadioGroup
              row
              value={String(scType)}
              onChange={e => patch({ sc_type: e.target.value })}
            >
              {([1, 2, 3, 4] as const).map(t => (
                <FormControlLabel key={t} value={String(t)} control={<Radio />} label={SC_TYPE_LABELS[t]} />
              ))}
            </RadioGroup>
          </Box>

          <Collapse in={scType === 2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant='body2' fontWeight={600} sx={{ mb: 1 }}>
                  조건 기준
                </Typography>
                <RadioGroup
                  row
                  value={value.sc_condition_type}
                  onChange={e => patch({ sc_condition_type: e.target.value as 'amount' | 'qty' })}
                >
                  <FormControlLabel value='amount' control={<Radio />} label='금액 기준 (N원 이상 구매 시 무료)' />
                  <FormControlLabel value='qty' control={<Radio />} label='수량 기준 (N개 이상 구매 시 무료)' />
                </RadioGroup>
              </Box>
              {value.sc_condition_type === 'amount' ? (
                <CustomTextField
                  fullWidth
                  size='small'
                  label='무료배송 기준금액 (원 이상)'
                  type='number'
                  value={value.sc_minimum}
                  onChange={e => patch({ sc_minimum: e.target.value })}
                  slotProps={{ htmlInput: { min: 0 } }}
                  helperText='이 금액 이상 구매 시 무료배송'
                />
              ) : (
                <CustomTextField
                  fullWidth
                  size='small'
                  label='무료배송 기준수량 (개 이상)'
                  type='number'
                  value={value.sc_free_qty}
                  onChange={e => patch({ sc_free_qty: e.target.value })}
                  slotProps={{ htmlInput: { min: 1 } }}
                  helperText='이 수량 이상 구매 시 무료배송'
                />
              )}
            </Box>
          </Collapse>

          <Collapse in={scType === 4}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='단위 수량 (N개당)'
                  type='number'
                  value={value.sc_qty}
                  onChange={e => patch({ sc_qty: e.target.value })}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
            </Grid>
            <ShippingPreview scQty={parseInt(value.sc_qty, 10) || 1} scPrice={parseFloat(value.sc_price) || 0} />
          </Collapse>

          <Collapse in={showShippingFee}>
            <Grid container spacing={2}>
              {mode === 'admin' && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='배송비 결제방식'
                    value={value.sc_method}
                    onChange={e => patch({ sc_method: e.target.value })}
                  >
                    <MenuItem value='0'>선불</MenuItem>
                    <MenuItem value='1'>착불</MenuItem>
                    <MenuItem value='2'>구매자 선택</MenuItem>
                  </CustomTextField>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='배송비 (원)'
                  type='number'
                  value={value.sc_price}
                  onChange={e => patch({ sc_price: e.target.value })}
                  slotProps={{ htmlInput: { min: 0 } }}
                  helperText='입력 시 반품/교환비 ×2 자동계산'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='배송사 (예: CJ대한통운)'
                  value={value.delivery_company}
                  onChange={e => patch({ delivery_company: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='반품 배송비 (원)'
                  type='number'
                  value={value.return_fee}
                  onChange={e => patch({ return_fee: e.target.value })}
                  slotProps={{ htmlInput: { min: 0 } }}
                  helperText='배송비 ×2 자동계산 (수정 가능)'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='교환 배송비 (원)'
                  type='number'
                  value={value.exchange_fee}
                  onChange={e => patch({ exchange_fee: e.target.value })}
                  slotProps={{ htmlInput: { min: 0 } }}
                  helperText='배송비 ×2 자동계산 (수정 가능)'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='평균 배송일'
                  type='number'
                  value={value.delivery_days}
                  onChange={e => patch({ delivery_days: e.target.value })}
                  slotProps={{ htmlInput: { min: 1, max: 60 } }}
                />
              </Grid>
            </Grid>
          </Collapse>

          <Collapse in={mode === 'scm' && scType === 1}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='평균 배송일'
                  type='number'
                  value={value.delivery_days}
                  onChange={e => patch({ delivery_days: e.target.value })}
                  slotProps={{ htmlInput: { min: 1, max: 60 } }}
                />
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  )
}
