'use client'
/**
 * 엑셀 업로드 — POST /excel/validate/{entity} → 미리보기 → POST /excel/import/{entity}
 */
import { useState, useCallback } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Snackbar from '@mui/material/Snackbar'
import { scmPost, scmPostMultipart } from '@/lib/scmApi'

export interface ValidateShippingResult {
  batch_id: string
  valid_rows: number
  error_rows: number
  errors: Array<{ row: number; message: string }>
  preview: Array<Record<string, string>>
}

export interface ExcelUploadDlgProps {
  entity: string
  onComplete?: () => void
  label?: string
}

export default function ExcelUploadDlg({ entity, onComplete, label = '대량 송장 등록' }: ExcelUploadDlgProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ValidateShippingResult | null>(null)
  const [err, setErr] = useState('')
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as 'success' | 'error' })

  const reset = () => {
    setFile(null)
    setResult(null)
    setErr('')
    setValidating(false)
    setImporting(false)
  }

  const handleClose = () => {
    if (validating || importing) return
    setOpen(false)
    reset()
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.toLowerCase().endsWith('.xlsx')) setFile(f)
  }, [])

  const validate = async () => {
    if (!file) {
      setErr('.xlsx 파일을 선택하세요.')
      return
    }
    setErr('')
    setValidating(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const data = await scmPostMultipart<ValidateShippingResult>(`/excel/validate/${encodeURIComponent(entity)}`, fd)
      setResult(data)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '검증에 실패했습니다.')
    } finally {
      setValidating(false)
    }
  }

  const runImport = async () => {
    if (!result?.batch_id) return
    setImporting(true)
    setErr('')
    try {
      const r = await scmPost<{ success: number; failed: number; errors: Array<{ order_no?: string; message: string }> }>(
        `/excel/import/${encodeURIComponent(entity)}?batch_id=${encodeURIComponent(result.batch_id)}`,
        {},
        120000,
      )
      setSnack({
        open: true,
        msg: `처리 완료: 성공 ${r.success}건, 실패 ${r.failed}건`,
        sev: r.failed > 0 ? 'error' : 'success',
      })
      onComplete?.()
      setOpen(false)
      reset()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '반영에 실패했습니다.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <Button variant='outlined' color='info' size='small' startIcon={<i className='tabler-upload' />} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>
          {!result ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                주문번호 · 택배사 · 송장번호 열이 포함된 .xlsx 파일을 선택하세요.
              </Typography>
              <Box
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={onDrop}
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: 'action.hover',
                }}
              >
                <input
                  type='file'
                  accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  style={{ display: 'none' }}
                  id='excel-upload-input'
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) setFile(f)
                  }}
                />
                <label htmlFor='excel-upload-input'>
                  <Button component='span' variant='outlined' size='small'>
                    파일 선택
                  </Button>
                </label>
                {file && (
                  <Typography variant='caption' display='block' sx={{ mt: 1 }}>
                    {file.name}
                  </Typography>
                )}
              </Box>
              {err && <Alert severity='error'>{err}</Alert>}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Alert severity={result.error_rows > 0 ? 'warning' : 'success'}>
                검증: 정상 {result.valid_rows}건 / 오류 {result.error_rows}건
              </Alert>
              {result.preview.length > 0 && (
                <>
                  <Typography variant='subtitle2'>미리보기 (최대 10행)</Typography>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>주문번호</TableCell>
                        <TableCell>택배사</TableCell>
                        <TableCell>송장번호</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.preview.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{p.order_no}</TableCell>
                          <TableCell>{p['택배사']}</TableCell>
                          <TableCell>{p['송장번호']}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
              {result.errors.length > 0 && (
                <Box sx={{ maxHeight: 160, overflow: 'auto' }}>
                  <Typography variant='subtitle2' color='error' sx={{ mb: 0.5 }}>
                    오류 목록
                  </Typography>
                  {result.errors.slice(0, 50).map((e, i) => (
                    <Typography key={i} variant='caption' display='block'>
                      {e.row}행: {e.message}
                    </Typography>
                  ))}
                </Box>
              )}
              {err && <Alert severity='error'>{err}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={validating || importing}>
            닫기
          </Button>
          {!result ? (
            <Button variant='contained' onClick={() => void validate()} disabled={validating || !file}
              startIcon={validating ? <CircularProgress size={14} color='inherit' /> : undefined}>
              {validating ? '검증 중…' : '검증'}
            </Button>
          ) : (
            <>
              <Button variant='outlined' onClick={() => { reset(); setOpen(true) }} disabled={importing}>
                다시 선택
              </Button>
              <Button
                variant='contained'
                color='success'
                onClick={() => void runImport()}
                disabled={importing || result.valid_rows === 0}
                startIcon={importing ? <CircularProgress size={14} color='inherit' /> : undefined}
              >
                {importing ? '반영 중…' : '확인 후 반영'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant='filled' onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}
