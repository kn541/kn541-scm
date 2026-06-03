'use client'
/**
 * KN541 SCM 공지사항
 * FIX(S-7): 아코디언 펼칠 때 GET /scm/notices/{id}로 본문 lazy-load
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
import Button from '@mui/material/Button'
import { scmGet } from '@/lib/scmApi'
import { sanitizeLooseHtml } from '@/lib/sanitizeLooseHtml'

interface Notice {
  id: number
  title: string
  content?: string
  notice_content?: string
  body?: string
  is_pinned: boolean
  created_at: string
}

interface NoticesResponse {
  items: Notice[]
  total: number
}

function pickNoticeBody(res: Notice | Record<string, unknown>): string {
  const r = res as Record<string, unknown>
  return String(r.content ?? r.notice_content ?? r.body ?? '') || '(내용 없음)'
}

export default function NoticesView() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contentCache, setContentCache] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
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

  useEffect(() => { void load() }, [load])

  const handleAccordionChange = useCallback(async (noticeId: number, expanded: boolean) => {
    if (!expanded) return
    const key = String(noticeId)
    if (contentCache[key]) return
    setLoadingId(key)
    try {
      const res = await scmGet<Notice>(`/scm/notices/${noticeId}`)
      setContentCache(prev => ({ ...prev, [key]: pickNoticeBody(res) }))
    } catch {
      setContentCache(prev => ({ ...prev, [key]: '본문을 불러올 수 없습니다.' }))
    } finally {
      setLoadingId(null)
    }
  }, [contentCache])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>공지사항</Typography>
        <Alert severity='warning' action={
          <Button size='small' onClick={() => void load()}>다시 시도</Button>
        }>
          {error}
        </Alert>
      </Box>
    )
  }

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
            notices.map((n, i) => {
              const key = String(n.id)
              const cachedContent = contentCache[key]
              const isDetailLoading = loadingId === key

              return (
                <Box key={n.id}>
                  <Accordion disableGutters elevation={0}
                    onChange={(_, expanded) => void handleAccordionChange(n.id, expanded)}
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
                          {n.created_at?.slice(0, 10)}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 4, pb: 3, pt: 0 }}>
                      {isDetailLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : (
                        <Box
                          sx={{ '& img': { maxWidth: '100%' }, lineHeight: 1.8 }}
                          dangerouslySetInnerHTML={{ __html: sanitizeLooseHtml(cachedContent ?? '') }}
                        />
                      )}
                    </AccordionDetails>
                  </Accordion>
                  {i < notices.length - 1 && <Divider />}
                </Box>
              )
            })
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
