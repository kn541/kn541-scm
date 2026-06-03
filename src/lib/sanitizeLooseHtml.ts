// KN541 클라이언트 "느슨(LOOSE)" HTML 새니타이저 (DOMPurify)
// 정책: docs/KN541_새니타이즈_정책.md §4 — 내부/승인 콘텐츠(공지·상품설명/KMC)용.
// 레이아웃(style/class/table/font 등) 보존 + 스크립트성만 제거. 클라이언트 컴포넌트('use client')용.
// 외부 소비자 콘텐츠(리뷰 등)는 강함(sanitizeHtml.ts) 사용.
import DOMPurify from 'isomorphic-dompurify'

// 허용 태그 = 강함셋 + 느슨 확장(레이아웃 태그)
const STRICT_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
  'span', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'img', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]
const LOOSE_EXTRA = [
  'div', 'small', 'sub', 'sup', 'mark', 'dl', 'dt', 'dd', 'figure', 'figcaption',
  'center', 'font', 'section', 'article', 'header', 'footer', 'h5', 'h6',
]
const ALLOWED_TAGS = Array.from(new Set([...STRICT_TAGS, ...LOOSE_EXTRA]))

// 모든 태그 공통 허용 속성(레이아웃 보존 핵심: style/class 등)
const GLOBAL_ATTRS = ['style', 'class', 'id', 'align', 'valign', 'title', 'dir', 'width', 'height']
// 태그별 추가 허용 속성
const PER_TAG_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel', 'name'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  table: ['border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'bgcolor'],
  thead: ['border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'bgcolor'],
  tbody: ['border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'bgcolor'],
  tr: ['border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'bgcolor'],
  td: ['border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'bgcolor'],
  th: ['border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'bgcolor'],
  font: ['color', 'size', 'face'],
}
// DOMPurify 전역 1차 허용(정밀 제어는 훅에서 keepAttr로 수행)
const ALLOWED_ATTR = [
  ...GLOBAL_ATTRS, 'href', 'title', 'target', 'rel', 'name', 'src', 'alt', 'loading',
  'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'bgcolor', 'color', 'size', 'face',
]

// style 값 위험구문 무력화 (정책 §4). 선언 단위 정확 매칭:
//  - 위험 프로퍼티(behavior / -moz-binding)만 제거 → 정상 'scroll-behavior'는 보존
//  - 값에 expression( · javascript: · vbscript: 포함 선언 제거(=url(javascript:) 포함)
function scrubStyle(style: string): string {
  return style
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((decl) => {
      const i = decl.indexOf(':')
      const prop = (i >= 0 ? decl.slice(0, i) : decl).trim().toLowerCase()
      const val = (i >= 0 ? decl.slice(i + 1) : '').toLowerCase()
      if (prop === 'behavior' || prop === '-moz-binding') return false
      if (val.includes('expression(') || val.includes('javascript:') || val.includes('vbscript:')) return false
      return true
    })
    .join('; ')
}

interface AttrHookData {
  attrName: string
  attrValue: string
  keepAttr: boolean
}

let hooksRegistered = false
function registerHooks() {
  if (hooksRegistered) return
  hooksRegistered = true

  // 태그별 속성 화이트리스트(글로벌 ∪ 태그별) + URL 스킴 제한 + style 스크럽
  DOMPurify.addHook('uponSanitizeAttribute', (node: Element, data: AttrHookData) => {
    const tag = (node.nodeName || '').toLowerCase()
    const allowed = new Set<string>([...GLOBAL_ATTRS, ...(PER_TAG_ATTRS[tag] || [])])
    if (!allowed.has(data.attrName)) {
      data.keepAttr = false
      return
    }
    const val = (data.attrValue || '').trim()
    if (tag === 'a' && data.attrName === 'href') {
      if (!/^https?:\/\//i.test(val) && !/^mailto:/i.test(val)) data.keepAttr = false
    }
    if (tag === 'img' && data.attrName === 'src') {
      if (!/^https?:\/\//i.test(val)) data.keepAttr = false
    }
    if (data.attrName === 'style') {
      const scrubbed = scrubStyle(data.attrValue || '')
      if (scrubbed) data.attrValue = scrubbed
      else data.keepAttr = false
    }
  })

  // a[target=_blank] → rel="noopener noreferrer" 자동 부여
  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    if ((node.nodeName || '').toLowerCase() === 'a' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

registerHooks()

// 저장된 HTML을 렌더 직전 정화. 항상 호출(분기 없이).
export function sanitizeLooseHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math', 'link', 'meta', 'base'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}

export default sanitizeLooseHtml
