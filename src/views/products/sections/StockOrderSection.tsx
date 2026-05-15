'use client'
// KN541 ProductForm 공통 sub-component (옵션 3: 양 레포 동일 파일 + prop-driven)
// 재고·주문 섹션 (어드민 ProductForm.tsx + SCM ProductFormView.tsx 공통)
//
// 변경 시 동기화:
//   1) admin/starter-kit/src/views/products/sections/StockOrderSection.tsx (master)
//   2) kn541-scm/src/views/products/sections/StockOrderSection.tsx
// 두 파일은 100% 동일해야 하며, 한쪽만 변경 시 양쪽 push 필수.

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import CustomTextField from '@core/components/mui/TextField'

import type { StockOrderState } from './productFormTypes'

export type { StockOrderState } from './productFormTypes'

interface Props {
  value:    StockOrderState
  onChange: (next: StockOrderState) => void
  /** 섹션 헤더 텍스트 (예: '⑤ 재고·주문'). 미전달 시 '재고·주문' */
  sectionLabel?: string
  /** 재고수량 helperText. 어드민·SCM 멘트 차이 흡수용 */
  stockHelper?: string
}

export default function StockOrderSection({
  value,
  onChange,
  sectionLabel = '재고·주문',
  stockHelper  = '미설정 시 기본 99,999',
}: Props) {
  const update = <K extends keyof StockOrderState>(key: K, v: StockOrderState[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <Box>
      <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>
        {sectionLabel}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='재고수량'
            type='number'
            value={value.stock_qty}
            onChange={e => update('stock_qty', e.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
            helperText={stockHelper}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='최소주문수량'
            type='number'
            value={value.min_order_qty}
            onChange={e => update('min_order_qty', e.target.value)}
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='최대주문수량 (비우면 무제한)'
            type='number'
            value={value.max_order_qty}
            onChange={e => update('max_order_qty', e.target.value)}
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
