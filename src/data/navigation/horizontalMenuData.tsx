// KN541 SCM 포털 — 상단 메뉴
import type { HorizontalMenuDataType } from '@/types/menuTypes'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
  { label: '대시보드', href: '/dashboard', icon: 'tabler-layout-dashboard' },
  { label: '상품 관리', href: '/products',   icon: 'tabler-package' },
  { label: '주문 관리', href: '/orders',     icon: 'tabler-shopping-cart' },
  { label: '정산 현황', href: '/settlements', icon: 'tabler-receipt' },
  { label: '문의 관리', href: '/inquiries',  icon: 'tabler-message-circle' },
  { label: '마이페이지', href: '/mypage',    icon: 'tabler-user-circle' }
]

export default horizontalMenuData
