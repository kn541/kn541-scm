'use client'
// KN541 ProductForm 공통 sub-component (옵션 3: 양 레포 동일 파일 + prop-driven)
// 판매 기간(예약) 섹션
//
// 변경 시 동기화:
//   1) admin/starter-kit/src/views/products/sections/SaleScheduleSection.tsx (master)
//   2) kn541-scm/src/views/products/sections/SaleScheduleSection.tsx
// 두 파일은 100% 동일해야 하며, 한쪽만 변경 시 양쪽 push 필수.

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CustomTextField from '@core/components/mui/TextField'

import type { SaleScheduleState } from './productFormTypes'

interface Props {
  value: SaleScheduleState
  onChange: (next: SaleScheduleState) => void
  sectionLabel?: string
  /** SCM 등: 판매기간 스위치 없이 항상 입력 가능 */
  hidePeriodToggle?: boolean
}

export default function SaleScheduleSection({
  value,
  onChange,
  sectionLabel = '⑥ 예약 조건',
  hidePeriodToggle = false,
}: Props) {
  const scheduleOn = hidePeriodToggle || value.use_schedule
  const patch = (partial: Partial<SaleScheduleState>) => onChange({ ...value, ...partial })

  return (
    <Box>
      <Typography variant='subtitle2' sx={{ mb: 2, color: 'text.secondary' }}>
        {sectionLabel}
      </Typography>
      <Card variant='outlined'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!hidePeriodToggle && (
            <FormControlLabel
              control={
                <Switch
                  checked={value.use_schedule}
                  onChange={e => {
                    const on = e.target.checked
                    if (!on) {
                      onChange({ use_schedule: false, sale_start_date: '', sale_end_date: '' })
                    } else {
                      patch({ use_schedule: true })
                    }
                  }}
                />
              }
              label='판매 기간 설정'
            />
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='판매 시작일 (비우면 즉시)'
                type='datetime-local'
                value={value.sale_start_date}
                onChange={e => patch({ sale_start_date: e.target.value })}
                disabled={!scheduleOn}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={hidePeriodToggle ? '비우면 승인 후 즉시' : '비우면 등록 즉시 판매 시작'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='판매 종료일 (비우면 무기한)'
                type='datetime-local'
                value={value.sale_end_date}
                onChange={e => patch({ sale_end_date: e.target.value })}
                disabled={!scheduleOn}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText='비우면 기한 없이 계속 판매'
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}
