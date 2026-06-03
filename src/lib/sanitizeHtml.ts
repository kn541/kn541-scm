// KN541 W1A 공통 HTML 새니타이저 (렌더측)
// 확정 allowlist 적용 — BE core/sanitize 와 동일 정책. 임의 변경 금지.
// 재사용: W1A-2(ReviewItem 등)에서 import 하여 동일 정책 사용.
import DOMPurify from 'isomorphic-dompurify'

// 허용 태그 (확정본)
const ALLOWED_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
  'span', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'img', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

// 허용 속성 (태그별). a/img 외 태그는 속성 전부 제거(style·class·id 포함).
const PER_TAG_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
}

// DOMPurify 전역 1차 필터(태그별 정밀 제어는 훅에서 수행)
const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height']

interface AttrHookData {
  attrName: string
  attrValue: string
  keepAttr: boolean
}

let hooksRegistered = false
function registerHooks() {
  if (hooksRegistered) return
  hooksRegistered = true

  // 태그별 속성 화이트리스트 + URL 스킴 제한
  DOMPurify.addHook('uponSanitizeAttribute', (node: Element, data: AttrHookData) => {
    const tag = (node.nodeName || '').toLowerCase()
    const allowed = PER_TAG_ATTRS[tag]
    // a/img 외 태그: 모든 속성 제거
    if (!allowed) {
      data.keepAttr = false
      return
    }
    // 허용 목록 외 속성 제거
    if (!allowed.includes(data.attrName)) {
      data.keepAttr = false
      return
    }
    // URL 스킴 제한: a@href = http·https·mailto / img@src = http·https
    const val = (data.attrValue || '').trim()
    if (tag === 'a' && data.attrName === 'href') {
      if (!/^https?:\/\//i.test(val) && !/^mailto:/i.test(val)) {
        data.keepAttr = false
      }
    }
    if (tag === 'img' && data.attrName === 'src') {
      if (!/^https?:\/\//i.test(val)) {
        data.keepAttr = false
      }
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
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'svg', 'math', 'form'],
    FORBID_ATTR: ['style', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}

export default sanitizeHtml
