// KN541 SCM 포털 — 사이드 메뉴 데이터
// 기획서: docs/기획서_SCM관리_어드민메뉴.md 참조
// 공급사(user_type=004) 전용 포털

export type SCMMenuItemType = {
  label: string
  href?: string
  icon: string
  children?: Omit<SCMMenuItemType, 'children'>[]
}

const verticalMenuData = (): SCMMenuItemType[] => [
  {
    label: '대시보드',
    href: '/dashboard',
    icon: 'tabler-layout-dashboard'
  },
  {
    label: '상품 관리',
    icon: 'tabler-package',
    children: [
      { label: '내 상품 목록', href: '/products',     icon: 'tabler-list' },
      { label: '상품 등록',   href: '/products/new',  icon: 'tabler-plus' }
    ]
  },
  {
    label: '주문 확인',
    icon: 'tabler-shopping-cart',
    children: [
      { label: '주문 목록', href: '/orders',          icon: 'tabler-clipboard-list' },
      { label: '배송 처리', href: '/orders/shipping', icon: 'tabler-truck' }
    ]
  },
  {
    label: '정산',
    icon: 'tabler-receipt',
    children: [
      { label: '정산 내역', href: '/settlements',          icon: 'tabler-file-text' },
      { label: '입금 확인', href: '/settlements/payments', icon: 'tabler-credit-card' }
    ]
  },
  {
    label: '문의',
    icon: 'tabler-message-circle',
    children: [
      { label: '문의 내역', href: '/inquiries',     icon: 'tabler-messages' },
      { label: '문의 등록', href: '/inquiries/new', icon: 'tabler-edit' }
    ]
  },
  {
    label: '공지사항',
    href: '/notices',
    icon: 'tabler-speakerphone'
  },
  {
    label: '마이페이지',
    icon: 'tabler-user-circle',
    children: [
      { label: '사업자 정보',   href: '/mypage',          icon: 'tabler-building' },
      { label: '담당자 관리',   href: '/mypage/contacts', icon: 'tabler-users' },
      { label: '비밀번호 변경', href: '/mypage/password', icon: 'tabler-lock' }
    ]
  }
]

export default verticalMenuData
