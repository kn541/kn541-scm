import ProductFormView from '@/views/products/ProductFormView'
export default function ProductEditPage({ params }: { params: { id: string } }) {
  return <ProductFormView mode='edit' productId={params.id} />
}
