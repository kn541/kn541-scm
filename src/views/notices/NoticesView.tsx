'use client'
/**
 * KN541 SCM 공지사항
 * GET /scm/notices
 */
import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Pagination from '@mui/material/Pagination'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { scmGet } from '@/lib/scmApi'

interface Notice {
  id: number
  title: string
  content: string
  is_pinned: boolean
  created_at: string
}

interface NoticesResponse {
  items: Notice[]
  total: number
}

export default function NoticesView() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await scmGet<NoticesResponse>(`/scm/notices?page=${page}&size=${SIZE}`)
      setNotices(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  )
  if (error) return <Alert severity='error'>{error}</Alert>

  return (
    <Box>
      <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>공지사항</Typography>
      <Card>
        <CardContent sx={{ p: 0 }}>
          {notices.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color='text.secondary'>공지사항이 없습니다.</Typography>
            </Box>
          ) : (
            notices.map((n, i) => (
              <Box key={n.id}>
                <Accordion disableGutters elevation={0}
                  sx={{ '&:before': { display: 'none' } }}>
                  <AccordionSummary
                    expandIcon={<i className='tabler-chevron-down' style={{ fontSize: 18 }} />}
                    sx={{ px: 4, py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                      {n.is_pinned && (
                        <Chip label='공지' size='small' color='primary' sx={{ fontWeight: 700, flexShrink: 0 }} />
                      )}
                      <Typography variant='body2' fontWeight={n.is_pinned ? 700 : 400}
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {n.title}
                      </Typography>
                      <Typography variant='caption' color='text.disabled' sx={{ flexShrink: 0 }}>
                        {n.created_at.slice(0, 10)}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 4, pb: 3, pt: 0 }}>
                    <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                      {n.content}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
                {i < notices.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </CardContent>
      </Card>
      {total > SIZE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={Math.ceil(total / SIZE)} page={page}
            onChange={(_, v) => setPage(v)} color='primary' />
        </Box>
      )}
    </Box>
  )
}
