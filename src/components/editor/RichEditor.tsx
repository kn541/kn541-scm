'use client'
// KN541 공용 리치 에디터
// 2026-04-15: 이미지 업로드 기능 추가
// 2026-04-22: fix — isRichHtmlEmpty가 이미지를 빈 값으로 판정하여 edit 모드에서 이미지 미출력 수정
// 2026-05-15: fix — @tiptap/core → @tiptap/react 변경 (Vercel pnpm strict 대응)

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import './RichEditor.css'

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL
const getToken = () =>
  typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : ''

/**
 * Supabase Storage에 이미지 업로드 → public URL 반환
 * 공용 함수로 export하여 다른 컴포넌트에서도 재사용 가능
 */
export async function uploadEditorImage(
  file: File,
  bucket: string,
  folder?: string
): Promise<string | null> {
  const params = new URLSearchParams({ bucket })
  if (folder) params.set('folder', folder)
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/upload/image?${params}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.detail ?? '업로드 실패')
    return json.data.url as string
  } catch (e) {
    alert(e instanceof Error ? e.message : '이미지 업로드 실패')
    return null
  }
}

export interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  readonly?: boolean
  /** 이미지 업로드 대상 Supabase 버킷 (미설정 시 이미지 버튼 숨김) */
  uploadBucket?: string
  /** 이미지 저장 하위 폴더 (예: 'editor') */
  uploadFolder?: string
}

/**
 * HTML 본문이 비었는지 판정.
 * fix(2026-04-22): <img> 태그가 있으면 콘텐츠가 있는 것으로 판정.
 * 기존에는 모든 태그를 제거하여 이미지만 있는 설명도 "빈 값"으로 처리했음.
 */
export function isRichHtmlEmpty(html: string): boolean {
  if (!html) return true
  // 이미지 태그가 있으면 콘텐츠가 있는 것
  if (/<img\s/i.test(html)) return false
  // iframe, video 등 미디어도 콘텐츠
  if (/<(iframe|video|audio)\s/i.test(html)) return false
  // 태그 제거 후 텍스트가 있는지
  return html.replace(/<[^>]*>/g, '').trim() === ''
}

function Toolbar({
  editor,
  uploadBucket,
  uploadFolder,
}: {
  editor: Editor
  uploadBucket?: string
  uploadFolder?: string
}) {
  const [imgUploading, setImgUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      h1: ed.isActive('heading', { level: 1 }),
      h2: ed.isActive('heading', { level: 2 }),
      bulletList: ed.isActive('bulletList'),
      orderedList: ed.isActive('orderedList'),
      blockquote: ed.isActive('blockquote'),
      link: ed.isActive('link'),
    }),
  })

  const setLink = () => {
    const prev = String(editor.getAttributes('link').href ?? '')
    const href = window.prompt('링크 URL', prev || 'https://')
    if (href === null) return
    if (href === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  const clearFormat = () => {
    editor.chain().focus().selectAll().unsetAllMarks().clearNodes().run()
  }

  const handleImageUpload = async (file: File) => {
    if (!uploadBucket) return
    setImgUploading(true)
    try {
      const url = await uploadEditorImage(file, uploadBucket, uploadFolder)
      if (url) editor.chain().focus().setImage({ src: url }).run()
    } finally {
      setImgUploading(false)
    }
  }

  const btn = (
    title: string,
    icon: string,
    onClick: () => void,
    isActive?: boolean,
    disabled?: boolean
  ) => (
    <Tooltip title={title}>
      <span>
        <IconButton
          size='small'
          color={isActive ? 'primary' : 'default'}
          onClick={onClick}
          disabled={disabled}
          aria-label={title}
        >
          <i className={icon} />
        </IconButton>
      </span>
    </Tooltip>
  )

  return (
    <Stack
      direction='row'
      flexWrap='wrap'
      alignItems='center'
      className='rich-editor-toolbar border-be'
      sx={{ px: 0.5, py: 0.25, gap: 0.25, borderColor: 'divider', bgcolor: 'action.hover' }}
    >
      {btn('굵게', 'tabler-bold', () => editor.chain().focus().toggleBold().run(), active.bold)}
      {btn('기울임', 'tabler-italic', () => editor.chain().focus().toggleItalic().run(), active.italic)}
      <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
      {btn('제목 1', 'tabler-h-1', () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active.h1)}
      {btn('제목 2', 'tabler-h-2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active.h2)}
      <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
      {btn('글머리 기호', 'tabler-list', () => editor.chain().focus().toggleBulletList().run(), active.bulletList)}
      {btn('번호 목록', 'tabler-list-numbers', () => editor.chain().focus().toggleOrderedList().run(), active.orderedList)}
      <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
      {btn('인용구', 'tabler-blockquote', () => editor.chain().focus().toggleBlockquote().run(), active.blockquote)}
      {btn('구분선', 'tabler-separator-horizontal', () => editor.chain().focus().setHorizontalRule().run())}
      <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
      {btn('링크', 'tabler-link', setLink, active.link)}
      {btn('서식 초기화', 'tabler-clear-formatting', clearFormat)}

      {/* 이미지 업로드 버튼 — uploadBucket 설정 시만 표시 */}
      {uploadBucket && (
        <>
          <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
          <Tooltip title='이미지 삽입'>
            <span>
              <IconButton
                size='small'
                aria-label='이미지 삽입'
                disabled={imgUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {imgUploading
                  ? <CircularProgress size={16} />
                  : <i className='tabler-photo' />}
              </IconButton>
            </span>
          </Tooltip>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            style={{ display: 'none' }}
            onChange={async e => {
              const file = e.target.files?.[0]
              if (file) await handleImageUpload(file)
              e.target.value = ''
            }}
          />
        </>
      )}
    </Stack>
  )
}

const RichEditor = ({
  value,
  onChange,
  placeholder = '내용을 입력하세요.',
  minHeight = 200,
  readonly = false,
  uploadBucket,
  uploadFolder,
}: RichEditorProps) => {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2] },
          link: {
            openOnClick: false,
            autolink: true,
            HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
          },
        }),
        ImageExtension.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: { style: 'max-width:100%;height:auto;border-radius:4px;' },
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: value,
      editable: !readonly,
      onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    },
    []
  )

  useEffect(() => { editor?.setEditable(!readonly) }, [editor, readonly])

  // fix(2026-04-22): setContent 동기화 로직 개선
  // — isRichHtmlEmpty가 이미지 포함 HTML도 인식하도록 수정됨
  // — Tiptap이 HTML을 정규화하므로 정확한 문자열 비교 대신 빈값 체크 우선
  useEffect(() => {
    if (!editor) return
    const v = value || ''
    // 둘 다 비어있으면 스킵 (isRichHtmlEmpty는 이제 img 태그를 빈 값으로 취급하지 않음)
    if (isRichHtmlEmpty(v) && isRichHtmlEmpty(editor.getHTML())) return
    // 에디터 현재 HTML과 동일하면 스킵
    const cur = editor.getHTML()
    if (cur === v) return
    // emitUpdate: false — onChange 재호출 방지 (TipTap v3 SetContentOptions)
    editor.commands.setContent(v, { emitUpdate: false })
  }, [editor, value])

  const minH = `${minHeight}px`

  return (
    <Box
      className='rich-editor-root overflow-hidden rounded'
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        transition: theme => theme.transitions.create(['border-color', 'border-width'], { duration: 150 }),
        '&:focus-within': { borderColor: 'primary.main', borderWidth: 2 },
        '& .rich-editor .ProseMirror': { minHeight: minH },
        '& .rich-editor .ProseMirror img': {
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '4px',
          display: 'block',
          my: 1,
        },
      }}
    >
      {editor && !readonly
        ? <Toolbar editor={editor} uploadBucket={uploadBucket} uploadFolder={uploadFolder} />
        : null}
      {editor ? <EditorContent editor={editor} className='rich-editor' /> : null}
    </Box>
  )
}

export default RichEditor
