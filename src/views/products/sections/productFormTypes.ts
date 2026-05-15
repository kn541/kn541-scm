// KN541 ProductForm 공통 타입 정의
// 어드민 + SCM 공유. 변경 시 양쪽 push 필수.

export interface StockOrderState {
  stock_qty: string
  min_order_qty: string
  max_order_qty: string
}

export interface SaleScheduleState {
  sale_start_date: string // ISO string or ''
  sale_end_date: string
  use_schedule: boolean
}

/** 배송정책 섹션 value (문자열 필드). 조건부무료(2)는 sc_condition_type + sc_minimum / sc_free_qty */
export interface ShippingState {
  sc_type: string // '1'|'2'|'3'|'4'
  sc_method: string
  sc_price: string
  sc_minimum: string
  sc_qty: string
  sc_condition_type: 'amount' | 'qty'
  sc_free_qty: string
  return_fee: string
  exchange_fee: string
  delivery_company: string
  delivery_days: string
}

export interface PricingState {
  sale_price: string
  original_supply_price: string
  supply_price: string
  consumer_price: string
  market_price: string
  discount_price: string
  commission_base_price: string
  tax_type: string // '0'|'1'
}

export interface OptionRow {
  id?: string
  option_name: string
  option_group: string
  add_price: string
  stock_qty: string
  is_active: boolean
}
