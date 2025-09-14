"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ShoppingCart,
  Scan,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  DollarSign,
  Smartphone,
  Receipt,
  Search,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import QRScanner from "@/components/qr-scanner"

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
}

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  subtotal: number
}

interface Sale {
  id: string
  total: number
  payment_method: string
  items: CartItem[]
  created_at: string
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: DollarSign },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "digital", label: "Pago Digital", icon: Smartphone },
]

export default function POSSystem() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showScanner, setShowScanner] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [receivedAmount, setReceivedAmount] = useState("")
  const [processingPayment, setProcessingPayment] = useState(false)

  const categories = [
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

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .gt("stock", 0)
        .order("name")

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product, quantity = 1, useWholesale = false) => {
    const unit_price = useWholesale ? product.wholesale_price : product.price
    const existingItem = cart.find((item) => item.product.id === product.id && item.unit_price === unit_price)

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      if (newQuantity > product.stock) {
        toast.error(`Stock insuficiente. Disponible: ${product.stock}`)
        return
      }
      updateCartItemQuantity(product.id, unit_price, newQuantity)
    } else {
      if (quantity > product.stock) {
        toast.error(`Stock insuficiente. Disponible: ${product.stock}`)
        return
      }
      const newItem: CartItem = {
        product,
        quantity,
        unit_price,
        subtotal: unit_price * quantity,
      }
      setCart([...cart, newItem])
    }
    toast.success(`${product.name} agregado al carrito`)
  }

  const updateCartItemQuantity = (productId: string, unitPrice: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, unitPrice)
      return
    }

    const product = products.find((p) => p.id === productId)
    if (product && newQuantity > product.stock) {
      toast.error(`Stock insuficiente. Disponible: ${product.stock}`)
      return
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId && item.unit_price === unitPrice
          ? { ...item, quantity: newQuantity, subtotal: item.unit_price * newQuantity }
          : item,
      ),
    )
  }

  const removeFromCart = (productId: string, unitPrice: number) => {
    setCart(cart.filter((item) => !(item.product.id === productId && item.unit_price === unitPrice)))
  }

  const clearCart = () => {
    setCart([])
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handleQRScan = (result: string) => {
    try {
      const qrData = JSON.parse(result)
      if (qrData.type === "product" && qrData.id) {
        const product = products.find((p) => p.id === qrData.id)
        if (product) {
          addToCart(product)
          setShowScanner(false)
        } else {
          toast.error("Producto no encontrado")
        }
      } else {
        toast.error("Código QR no válido")
      }
    } catch (error) {
      toast.error("Error al procesar código QR")
    }
  }

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío")
      return
    }

    if (!paymentMethod) {
      toast.error("Selecciona un método de pago")
      return
    }

    const total = getTotalAmount()
    if (paymentMethod === "cash" && Number.parseFloat(receivedAmount) < total) {
      toast.error("El monto recibido es insuficiente")
      return
    }

    setProcessingPayment(true)

    try {
      const { data: sale, error: saleError } = await supabase
        .from("transactions")
        .insert([
          {
            transaction_code: `TXN${Date.now()}`,
            total_amount: total,
            payment_method: paymentMethod,
            payment_status: "completed",
            loyalty_points_earned: Math.floor(total * 0.1),
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (saleError) throw saleError

      const transactionDetails = cart.map((item) => ({
        transaction_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }))

      const { error: detailsError } = await supabase.from("transaction_details").insert(transactionDetails)

      if (detailsError) throw detailsError

      // Update product stock
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq("id", item.product.id)

        if (stockError) throw stockError
      }

      // Show success message
      const change = paymentMethod === "cash" ? Number.parseFloat(receivedAmount) - total : 0
      toast.success(`Venta procesada correctamente. ${paymentMethod === "cash" ? `Cambio: $${change.toFixed(2)}` : ""}`)

      // Reset form
      clearCart()
      setShowPayment(false)
      setPaymentMethod("")
      setReceivedAmount("")
      fetchProducts() // Refresh products to update stock
    } catch (error) {
      console.error("Error processing sale:", error)
      toast.error("Error al procesar la venta")
    } finally {
      setProcessingPayment(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const total = getTotalAmount()
  const itemCount = getTotalItems()

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <ShoppingCart className="h-6 w-6 mr-2" />
          <h1 className="text-xl font-semibold">Sistema POS</h1>
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Products Section */}
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Productos</h2>
              <div className="flex space-x-2">
                <Dialog open={showScanner} onOpenChange={setShowScanner}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Scan className="h-4 w-4 mr-2" />
                      Escanear QR
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Escanear Código QR</DialogTitle>
                      <DialogDescription>Apunta la cámara hacia el código QR del producto</DialogDescription>
                    </DialogHeader>
                    <QRScanner onScan={handleQRScan} />
                  </DialogContent>
                </Dialog>
              </div>
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
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{product.name}</CardTitle>
                    <CardDescription className="text-xs">{product.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                        <Badge variant={product.stock <= product.min_stock ? "destructive" : "default"}>
                          Stock: {product.stock}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Mayorista: ${product.wholesale_price.toFixed(2)}
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" onClick={() => addToCart(product, 1, false)} className="flex-1">
                          <Plus className="h-3 w-3 mr-1" />
                          Minorista
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToCart(product, 1, true)}
                          className="flex-1"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Mayorista
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-96 border-l bg-muted/10">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Carrito ({itemCount})</h3>
              {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto space-y-2">
              {cart.map((item, index) => (
                <Card key={`${item.product.id}-${item.unit_price}-${index}`}>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.product.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            ${item.unit_price.toFixed(2)}{" "}
                            {item.unit_price === item.product.wholesale_price ? "(Mayorista)" : "(Minorista)"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id, item.unit_price)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartItemQuantity(item.product.id, item.unit_price, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartItemQuantity(item.product.id, item.unit_price, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {cart.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">El carrito está vacío</p>
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <Dialog open={showPayment} onOpenChange={setShowPayment}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg">
                      <Receipt className="h-4 w-4 mr-2" />
                      Procesar Venta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Procesar Venta</DialogTitle>
                      <DialogDescription>Total a pagar: ${total.toFixed(2)}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Método de Pago</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona método de pago" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                <div className="flex items-center">
                                  <method.icon className="h-4 w-4 mr-2" />
                                  {method.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {paymentMethod === "cash" && (
                        <div className="space-y-2">
                          <Label htmlFor="received">Monto Recibido</Label>
                          <Input
                            id="received"
                            type="number"
                            step="0.01"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                            placeholder="0.00"
                          />
                          {receivedAmount && (
                            <p className="text-sm text-muted-foreground">
                              Cambio: ${Math.max(0, Number.parseFloat(receivedAmount) - total).toFixed(2)}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowPayment(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={processSale} disabled={processingPayment}>
                          {processingPayment ? "Procesando..." : "Confirmar Venta"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
