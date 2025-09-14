"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Package, Edit, Trash2, Search } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import QRCode from "qrcode"

interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  wholesale_price: number
  cost: number
  stock: number
  min_stock: number
  qr_code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  "Granos Básicos",
  "Concentrados",
  "Productos de Primera Necesidad",
  "Lácteos",
  "Carnes",
  "Frutas y Verduras",
  "Bebidas",
  "Limpieza",
  "Otros",
]

export default function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    wholesale_price: "",
    cost: "",
    stock: "",
    min_stock: "",
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_categories (
            name
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedProducts =
        data?.map((product) => ({
          ...product,
          category: product.product_categories?.name || product.category || "Sin categoría",
        })) || []

      setProducts(formattedProducts)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async (productId: string, productName: string) => {
    try {
      const qrData = JSON.stringify({
        id: productId,
        name: productName,
        type: "product",
      })
      return await QRCode.toDataURL(qrData)
    } catch (error) {
      console.error("Error generating QR code:", error)
      return ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: category } = await supabase
        .from("product_categories")
        .select("id")
        .eq("name", formData.category)
        .single()

      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        category_id: category?.id,
        price: Number.parseFloat(formData.price),
        wholesale_price: Number.parseFloat(formData.wholesale_price),
        cost: Number.parseFloat(formData.cost),
        stock: Number.parseInt(formData.stock),
        min_stock: Number.parseInt(formData.min_stock),
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id)

        if (error) throw error
        toast.success("Producto actualizado correctamente")
      } else {
        const { data, error } = await supabase.from("products").insert([productData]).select().single()

        if (error) throw error

        // Generate QR code for new product
        const qrCode = await generateQRCode(data.id, data.name)

        await supabase.from("products").update({ qr_code: qrCode }).eq("id", data.id)

        toast.success("Producto creado correctamente")
      }

      setIsDialogOpen(false)
      setEditingProduct(null)
      setFormData({
        name: "",
        description: "",
        category: "",
        price: "",
        wholesale_price: "",
        cost: "",
        stock: "",
        min_stock: "",
      })
      fetchProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      toast.error("Error al guardar producto")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.toString(),
      wholesale_price: product.wholesale_price?.toString() || "",
      cost: product.cost?.toString() || "",
      stock: product.stock?.toString() || "0",
      min_stock: product.min_stock?.toString() || "5",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return

    try {
      const { error } = await supabase.from("products").update({ is_active: false }).eq("id", productId)

      if (error) throw error
      toast.success("Producto eliminado correctamente")
      fetchProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Error al eliminar producto")
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory && product.is_active
  })

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= 0) return { label: "Sin Stock", color: "destructive" }
    if (stock <= minStock) return { label: "Stock Bajo", color: "secondary" }
    return { label: "En Stock", color: "default" }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Package className="h-6 w-6 mr-2" />
          <h1 className="text-xl font-semibold">Gestión de Productos</h1>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Productos</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingProduct(null)
                  setFormData({
                    name: "",
                    description: "",
                    category: "",
                    price: "",
                    wholesale_price: "",
                    cost: "",
                    stock: "",
                    min_stock: "",
                  })
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Modifica los datos del producto" : "Agrega un nuevo producto al inventario"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Producto</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost">Costo</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wholesale_price">Precio Mayorista</Label>
                    <Input
                      id="wholesale_price"
                      type="number"
                      step="0.01"
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Precio Minorista</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Actual</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Stock Mínimo</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Guardando..." : editingProduct ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock || 0, product.min_stock || 5)
            const margin =
              product.price && product.cost ? (((product.price - product.cost) / product.cost) * 100).toFixed(1) : "0"

            return (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription>{product.category}</CardDescription>
                    </div>
                    <Badge variant={stockStatus.color as any}>{stockStatus.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{product.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Costo:</span> ${product.cost?.toFixed(2) || "0.00"}
                      </div>
                      <div>
                        <span className="font-medium">Mayorista:</span> ${product.wholesale_price?.toFixed(2) || "0.00"}
                      </div>
                      <div>
                        <span className="font-medium">Minorista:</span> ${product.price?.toFixed(2) || "0.00"}
                      </div>
                      <div>
                        <span className="font-medium">Margen:</span> {margin}%
                      </div>
                      <div>
                        <span className="font-medium">Stock:</span> {product.stock || 0}
                      </div>
                      <div>
                        <span className="font-medium">Mín:</span> {product.min_stock || 5}
                      </div>
                    </div>

                    {product.qr_code && (
                      <div className="flex justify-center mt-4">
                        <img
                          src={product.qr_code || "/placeholder.svg"}
                          alt={`QR Code for ${product.name}`}
                          className="w-20 h-20"
                        />
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No se encontraron productos</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== "all"
                ? "Intenta cambiar los filtros de búsqueda"
                : "Comienza agregando tu primer producto"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
