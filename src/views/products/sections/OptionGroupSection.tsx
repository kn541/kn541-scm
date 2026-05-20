'use client'
// KN541 옵션 2단 조합 UI 컴포넌트 (SCM용)
import { useCallback, useEffect, useState } from 'react'
import { Box, Button, Chip, CircularProgress, IconButton, TextField, Tooltip, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Snackbar } from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import { fetchOptionGroups, createOptionGroup, deleteOptionGroup, createOptionValuesBulk, deleteOptionValue, generateCombinations, updateOption, type OptionGroup, type OptionCombination, type OptionGroupsData } from '@/hooks/useOptionGroups'

interface Props { productId: string; disabled?: boolean }

export default function OptionGroupSection({ productId, disabled }: Props) {
  const [data, setData] = useState<OptionGroupsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newValues, setNewValues] = useState<Record<string, string>>({})
  const [editingCells, setEditingCells] = useState<Record<string, Record<string, string>>>({})
  const [generating, setGenerating] = useState(false)
  const [snack, setSnack] = useState<{open:boolean;msg:string;sev:'success'|'error'}>({open:false,msg:'',sev:'success'})
  const notify = (msg:string, sev:'success'|'error'='success') => setSnack({open:true,msg,sev})

  const reload = useCallback(async () => {
    if (!productId) return; setLoading(true)
    const result = await fetchOptionGroups(productId); setData(result); setLoading(false)
  }, [productId])
  useEffect(() => { reload() }, [reload])

  const handleAddGroup = async () => {
    const name = newGroupName.trim(); if (!name) { notify('그룹명을 입력하세요','error'); return }
    try { await createOptionGroup(productId, name, (data?.groups.length ?? 0)); setNewGroupName(''); notify(`옵션그룹 "${name}" 생성`); reload() } catch (e: any) { notify(e.message,'error') }
  }
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`"${groupName}" 그룹과 관련 조합을 모두 삭제하시겠습니까?`)) return
    try { await deleteOptionGroup(productId, groupId); notify('그룹 삭제 완료'); reload() } catch (e: any) { notify(e.message,'error') }
  }
  const handleAddValues = async (groupId: string) => {
    const raw = (newValues[groupId] || '').trim(); if (!raw) { notify('값을 입력하세요 (콤마로 구분)','error'); return }
    const vals = raw.split(',').map(v => v.trim()).filter(Boolean); if (!vals.length) return
    try { await createOptionValuesBulk(productId, groupId, vals); setNewValues(prev => ({ ...prev, [groupId]: '' })); notify(`${vals.length}개 값 추가 완료`); reload() } catch (e: any) { notify(e.message,'error') }
  }
  const handleDeleteValue = async (valueId: string) => {
    try { await deleteOptionValue(productId, valueId); notify('값 삭제 완료'); reload() } catch (e: any) { notify(e.message,'error') }
  }
  const handleGenerate = async () => {
    setGenerating(true)
    try { const result = await generateCombinations(productId, 0, 0); notify(result.message); reload() } catch (e: any) { notify(e.message,'error') }
    setGenerating(false)
  }
  const handleCellChange = (optId: string, field: string, value: string) => {
    setEditingCells(prev => ({ ...prev, [optId]: { ...(prev[optId] || {}), [field]: value } }))
  }
  const handleCellSave = async (optId: string, field: string) => {
    const value = editingCells[optId]?.[field]; if (value === undefined) return
    try {
      const payload: Record<string, unknown> = {}
      if (field === 'add_price') payload.add_price = parseFloat(value) || 0
      if (field === 'stock_qty') payload.stock_qty = parseInt(value) || 0
      await updateOption(productId, optId, payload)
      setEditingCells(prev => { const next = { ...prev }; if (next[optId]) { delete next[optId][field]; if (!Object.keys(next[optId]).length) delete next[optId] }; return next })
      reload()
    } catch (e: any) { notify(e.message,'error') }
  }

  if (loading && !data) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>
  const groups = data?.groups ?? []; const combos = data?.combinations ?? []; const canAddGroup = groups.length < 2

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>옵션그룹 정의</Typography>
      {groups.map((g) => (
        <Paper key={g.id} variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip label={`그룹 ${groups.indexOf(g) + 1}`} size="small" color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{g.group_name}</Typography>
            {!disabled && <Tooltip title="그룹 삭제"><IconButton size="small" color="error" onClick={() => handleDeleteGroup(g.id, g.group_name)}>✕</IconButton></Tooltip>}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {g.values.map(v => <Chip key={v.id} label={v.value_name} size="small" variant="outlined" onDelete={disabled ? undefined : () => handleDeleteValue(v.id)} />)}
            {g.values.length === 0 && <Typography variant="caption" color="text.secondary">값을 추가하세요</Typography>}
          </Box>
          {!disabled && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" placeholder="빨강, 파랑, 초록 (콤마 구분)" value={newValues[g.id] || ''} sx={{ flex: 1 }}
                onChange={e => setNewValues(prev => ({ ...prev, [g.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddValues(g.id) } }} />
              <Button size="small" variant="outlined" onClick={() => handleAddValues(g.id)}>추가</Button>
            </Box>
          )}
        </Paper>
      ))}
      {!disabled && canAddGroup && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" placeholder={groups.length === 0 ? '그룹명 (예: 색상)' : '그룹명 (예: 사이즈)'} value={newGroupName} sx={{ flex: 1 }}
            onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddGroup() } }} />
          <Button size="small" variant="contained" onClick={handleAddGroup}>그룹 추가</Button>
        </Box>
      )}
      {groups.length >= 2 && <Alert severity="info" sx={{ py: 0 }}>옵션그룹은 최대 2개까지 생성 가능합니다</Alert>}
      {groups.length > 0 && groups.every(g => g.values.length > 0) && !disabled && (
        <Button variant="contained" color="success" onClick={handleGenerate} disabled={generating} startIcon={generating ? <CircularProgress size={16} /> : null}>
          {generating ? '조합 생성 중...' : `조합 자동생성 (${groups.map(g => g.values.length).join(' × ')} = ${groups.reduce((a, g) => a * g.values.length, 1)}개)`}
        </Button>
      )}
      {combos.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>조합 목록 ({combos.length}개)</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow>
                <TableCell sx={{ fontWeight: 600 }}>옵션명</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 120 }} align="right">추가금액</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">재고</TableCell>
              </TableRow></TableHead>
              <TableBody>{combos.map(c => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.option_name}</TableCell>
                  <TableCell align="right">
                    {disabled ? Number(c.add_price).toLocaleString() : (
                      <TextField size="small" type="number" sx={{ width: 100 }} value={editingCells[c.id]?.add_price ?? c.add_price}
                        onChange={e => handleCellChange(c.id, 'add_price', e.target.value)} onBlur={() => handleCellSave(c.id, 'add_price')}
                        inputProps={{ style: { textAlign: 'right', padding: '4px 8px' } }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {disabled ? c.stock_qty.toLocaleString() : (
                      <TextField size="small" type="number" sx={{ width: 80 }} value={editingCells[c.id]?.stock_qty ?? String(c.stock_qty)}
                        onChange={e => handleCellChange(c.id, 'stock_qty', e.target.value)} onBlur={() => handleCellSave(c.id, 'stock_qty')}
                        inputProps={{ style: { textAlign: 'right', padding: '4px 8px' } }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({...s,open:false}))} anchorOrigin={{vertical:'bottom',horizontal:'center'}}>
        <MuiAlert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({...s,open:false}))}>{snack.msg}</MuiAlert>
      </Snackbar>
    </Box>
  )
}
