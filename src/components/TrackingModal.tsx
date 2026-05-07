'use client'
/**
 * TrackingModal — SweetTracker 배송조회 모달 (SCM용)
 * API: GET /tracking/info?company={택배사}&tracking_no={운송장번호}
 */

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import { scmGet } from '@/lib/scmApi'

// SweetTracker 배송 레벨 → 한글 / 색상
const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  '1': { label: '배송정보 수집',  color: 'default', icon: 'tabler-file-text'    },
  '2': { label: '집화처리',       color: 'primary',  icon: 'tabler-package'      },
  '3': { label: '이동중',         color: 'info',     icon: 'tabler-truck'        },
  '4': { label: '도착',           color: 'warning',  icon: 'tabler-map-pin'      },
  '5': { label: '배달출발',       color: 'warning',  icon: 'tabler-run'          },
  '6': { label: '배달완료',       color: 'success',  icon: 'tabler-circle-check' },
}

interface TrackingDetail {
  time:     string
  where:    string
  kind:     string
  level:    string
  manName?: string
  telno?:   string
}

interface SweetTrackerData {
  status:           boolean
  msg?:             string
  itemName?:        string
  receiverAddr?:    string
  level?:           string
  lastDetail?:      TrackingDetail
  trackingDetails?: TrackingDetail[]
}

interface TrackingResponse {
  status:      string
  company:     string
  tracking_no: string
  data:        SweetTrackerData
}

export interface TrackingModalProps {
  open:       boolean
  onClose:    () => void
  company:    string
  trackingNo: string
  orderNo?:   string
}

export default function TrackingModal({
  open, onClose, company, trackingNo, orderNo
}: TrackingModalProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [data,    setData]    = useState<SweetTrackerData | null>(null)

  useEffect(() => {
    if (!open || !company || !trackingNo) return
    setLoading(true); setError(''); setData(null)

    scmGet<TrackingResponse>(`/tracking/info?company=${encodeURIComponent(company)}&tracking_no=${encodeURIComponent(trackingNo)}`)
      .then(res => {
        const d = res.data
        if (!d || d.status === false) {
          setError(d?.msg ?? '배송 정보를 찾을 수 없습니다.')
        } else {
          setData(d)
        }
      })
      .catch((e: Error) => setError(e.message || '배송 조회 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }, [open, company, trackingNo])

  const currentLevel  = data?.level ?? data?.lastDetail?.level ?? '1'
  const currentConfig = LEVEL_CONFIG[currentLevel] ?? LEVEL_CONFIG['1']
  const details       = [...(data?.trackingDetails ?? [])].reverse()

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>

      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-truck' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
          <Box>
            <Typography variant='h6' fontWeight={700}>배송 조회</Typography>
            {orderNo && (
              <Typography variant='caption' color='text.secondary'>주문번호 {orderNo}</Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        {/* 운송장 정보 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Box>
            <Typography variant='caption' color='text.secondary'>택배사</Typography>
            <Typography variant='body2' fontWeight={600}>{company}</Typography>
          </Box>
          <Divider orientation='vertical' flexItem />
          <Box>
            <Typography variant='caption' color='text.secondary'>운송장번호</Typography>
            <Typography variant='body2' fontWeight={600} fontFamily='monospace'>{trackingNo}</Typography>
          </Box>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={36} />
          </Box>
        )}

        {!loading && error && (
          <Alert severity='warning' sx={{ mb: 2 }}>
            <Typography variant='body2'>{error}</Typography>
          </Alert>
        )}

        {!loading && data && (
          <>
            {/* 현재 상태 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Chip
                label={currentConfig.label}
                color={currentConfig.color as 'default'}
                icon={<i className={currentConfig.icon} style={{ fontSize: 14 }} />}
                sx={{ fontWeight: 700, fontSize: 14, height: 32 }}
              />
              {data.lastDetail?.where && (
                <Typography variant='body2' color='text.secondary'>
                  최종위치: {data.lastDetail.where}
                </Typography>
              )}
            </Box>

            {/* 상품/수취인 정보 */}
            {(data.itemName || data.receiverAddr) && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                {data.itemName && (
                  <Typography variant='body2'><strong>상품명:</strong> {data.itemName}</Typography>
                )}
                {data.receiverAddr && (
                  <Typography variant='body2' color='text.secondary'>
                    <strong>배송지:</strong> {data.receiverAddr}
                  </Typography>
                )}
              </Box>
            )}

            <Divider sx={{ mb: 2 }}>
              <Typography variant='caption' color='text.secondary'>배송 이력</Typography>
            </Divider>

            {/* 배송 이력 — @mui/lab 미사용, 직접 구현 */}
            {details.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {details.map((d, i) => {
                  const cfg      = LEVEL_CONFIG[d.level] ?? LEVEL_CONFIG['1']
                  const isLatest = i === 0
                  return (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, position: 'relative' }}>
                      {/* 타임라인 선 */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: isLatest ? `${cfg.color}.main` : 'action.hover',
                          border: '2px solid',
                          borderColor: isLatest ? `${cfg.color}.main` : 'divider',
                          zIndex: 1, flexShrink: 0,
                        }}>
                          <i className={cfg.icon} style={{
                            fontSize: 12,
                            color: isLatest ? '#fff' : 'var(--mui-palette-text-secondary)'
                          }} />
                        </Box>
                        {i < details.length - 1 && (
                          <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', my: 0.5 }} />
                        )}
                      </Box>

                      {/* 내용 */}
                      <Box sx={{ pb: i < details.length - 1 ? 2 : 0, pt: 0.25 }}>
                        <Typography
                          variant='body2'
                          fontWeight={isLatest ? 700 : 400}
                          color={isLatest ? 'text.primary' : 'text.secondary'}>
                          {d.kind}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>{d.where}</Typography>
                        <Typography variant='caption' color='text.disabled' display='block'>
                          {d.time?.slice(0, 16)}
                          {d.manName && ` · 담당: ${d.manName}${d.telno ? ` (${d.telno})` : ''}`}
                        </Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            ) : (
              <Typography variant='body2' color='text.secondary' textAlign='center' py={2}>
                배송 이력이 없습니다.
              </Typography>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant='outlined'
          color='secondary'
          href={`https://tracking.sweettracker.co.kr/t/api?${new URLSearchParams({ t_invoice: trackingNo })}`}
          target='_blank'
          rel='noopener noreferrer'
          startIcon={<i className='tabler-external-link' />}
          size='small'>
          SweetTracker에서 보기
        </Button>
        <Button variant='contained' onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  )
}
