import ProductFormView from '@/views/products/ProductFormView'
export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductFormView productId={id} />
}
