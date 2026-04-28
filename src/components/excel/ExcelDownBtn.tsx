'use client'
/**
 * 엑셀 다운로드 버튼 — useExcelDownload + 토스트
 */
import { useState } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useExcelDownload } from '@/lib/useExcel'

export interface ExcelDownBtnProps {
  entity: string
  filters?: Record<string, string | undefined>
  label?: string
}

export default function ExcelDownBtn({ entity, filters, label = '엑셀 다운로드' }: ExcelDownBtnProps) {
  const { downloading, download } = useExcelDownload()
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as 'success' | 'error' })

  const handle = async () => {
    try {
      await download(entity, filters)
      setSnack({ open: true, msg: '파일 다운로드를 시작했습니다.', sev: 'success' })
    } catch (e: unknown) {
      setSnack({
        open: true,
        msg: e instanceof Error ? e.message : '다운로드에 실패했습니다.',
        sev: 'error',
      })
    }
  }

  return (
    <>
      <Button
        variant='outlined'
        color='success'
        size='small'
        disabled={downloading}
        startIcon={
          downloading ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-download' />
        }
        onClick={() => void handle()}
      >
        {label}
      </Button>
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.sev}
          variant='filled'
          onClose={() => setSnack(s => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  )
}
