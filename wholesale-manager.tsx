"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, Plus, Edit, Trash2, Search, Package, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { toast } from "sonner"

interface Supplier {
  id: string
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  is_active: boolean
  created_at: string
}

interface PurchaseOrder {
  id: string
  supplier_id: string
  supplier_name: string
  order_number: string
  status: "pending" | "ordered" | "received" | "cancelled"
  total_amount: number
  items: PurchaseOrderItem[]
  notes: string
  created_at: string
  expected_delivery: string
}

interface PurchaseOrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
}

interface Product {
  id: string
  name: string
  category: string
  cost: number
  stock: number
}

const ORDER_STATUSES = [
  { value: "pending", label: "Pendiente", color: "secondary", icon: Clock },
  { value: "ordered", label: "Ordenado", color: "default", icon: Package },
  { value: "received", label: "Recibido", color: "default", icon: CheckCircle },
  { value: "cancelled", label: "Cancelado", color: "destructive", icon: AlertCircle },
]

export default function WholesaleManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("suppliers")
  const [searchTerm, setSearchTerm] = useState("")

  // Supplier form state
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  })

  // Purchase order form state
  const [isPurchaseOrderDialogOpen, setIsPurchaseOrderDialogOpen] = useState(false)
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [purchaseOrderForm, setPurchaseOrderForm] = useState({
    supplier_id: "",
    expected_delivery: "",
    notes: "",
    items: [] as { product_id: string; quantity: number; unit_cost: number }[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        // Demo data when Supabase is not available
        setSuppliers([
          {
            id: "1",
            name: "Distribuidora Premium",
            contact_person: "Juan Pérez",
            email: "juan@premium.com",
            phone: "+1234567890",
            address: "Calle Principal 123",
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        setPurchaseOrders([])
        setProducts([
          {
            id: "1",
            name: "Whisky Premium",
            category: "Licores",
            cost: 50.0,
            stock: 10,
          },
        ])
        setLoading(false)
        return
      }

      const [suppliersResult, ordersResult, productsResult] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id, name, category, price").eq("is_active", true).order("name"),
      ])

      if (suppliersResult.error) throw suppliersResult.error
      if (ordersResult.error) throw ordersResult.error
      if (productsResult.error) throw productsResult.error

      setSuppliers(suppliersResult.data || [])
      setPurchaseOrders(ordersResult.data || [])
      // Map price to cost for products
      setProducts(
        (productsResult.data || []).map((product) => ({
          ...product,
          cost: product.price || 0,
          stock: 0, // Default stock
        })),
      )
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar datos: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        toast.error("Base de datos no disponible")
        return
      }

      const supplierData = {
        ...supplierForm,
        is_active: true,
      }

      if (editingSupplier) {
        const { error } = await supabase.from("suppliers").update(supplierData).eq("id", editingSupplier.id)
        if (error) throw error
        toast.success("Proveedor actualizado correctamente")
      } else {
        const { error } = await supabase.from("suppliers").insert([supplierData])
        if (error) throw error
        toast.success("Proveedor creado correctamente")
      }

      setIsSupplierDialogOpen(false)
      setEditingSupplier(null)
      setSupplierForm({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
      })
      fetchData()
    } catch (error) {
      console.error("Error saving supplier:", error)
      toast.error("Error al guardar proveedor: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (purchaseOrderForm.items.length === 0) {
      toast.error("Agrega al menos un producto a la orden")
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        toast.error("Base de datos no disponible")
        return
      }

      const supplier = suppliers.find((s) => s.id === purchaseOrderForm.supplier_id)
      const totalAmount = purchaseOrderForm.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

      // Insert purchase order
      const { data: orderData, error: orderError } = await supabase
        .from("purchase_orders")
        .insert([
          {
            supplier_id: purchaseOrderForm.supplier_id,
            total_amount: totalAmount,
            status: "pending",
            order_date: new Date().toISOString(),
            notes: purchaseOrderForm.notes,
            created_by: "current-user-id", // You'll need to get this from auth context
          },
        ])
        .select()
        .single()

      if (orderError) throw orderError

      // Insert purchase order items
      const orderItems = purchaseOrderForm.items.map((item) => ({
        purchase_order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_cost,
        total_price: item.quantity * item.unit_cost,
      }))

      const { error: itemsError } = await supabase.from("purchase_order_items").insert(orderItems)
      if (itemsError) throw itemsError

      toast.success("Orden de compra creada correctamente")
      setIsPurchaseOrderDialogOpen(false)
      setPurchaseOrderForm({
        supplier_id: "",
        expected_delivery: "",
        notes: "",
        items: [],
      })
      fetchData()
    } catch (error) {
      console.error("Error creating purchase order:", error)
      toast.error("Error al crear orden de compra: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        toast.error("Base de datos no disponible")
        return
      }

      const { error } = await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", orderId)
      if (error) throw error

      // If status is "received", update inventory
      if (newStatus === "received") {
        const order = purchaseOrders.find((o) => o.id === orderId)
        if (order) {
          // Get order items
          const { data: orderItems, error: itemsError } = await supabase
            .from("purchase_order_items")
            .select("*")
            .eq("purchase_order_id", orderId)

          if (itemsError) throw itemsError

          // Update inventory for each item
          for (const item of orderItems || []) {
            // Check if inventory record exists
            const { data: existingInventory } = await supabase
              .from("inventory")
              .select("*")
              .eq("product_id", item.product_id)
              .single()

            if (existingInventory) {
              // Update existing inventory
              await supabase
                .from("inventory")
                .update({
                  quantity: existingInventory.quantity + item.quantity,
                  last_restocked: new Date().toISOString(),
                })
                .eq("product_id", item.product_id)
            } else {
              // Create new inventory record
              await supabase.from("inventory").insert([
                {
                  product_id: item.product_id,
                  quantity: item.quantity,
                  min_stock: 5, // Default minimum stock
                  max_stock: 100, // Default maximum stock
                  supplier_id: order.supplier_id,
                  last_restocked: new Date().toISOString(),
                },
              ])
            }
          }
        }
      }

      toast.success("Estado de orden actualizado")
      fetchData()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast.error("Error al actualizar estado: " + (error as Error).message)
    }
  }

  const addItemToPurchaseOrder = () => {
    setPurchaseOrderForm({
      ...purchaseOrderForm,
      items: [
        ...purchaseOrderForm.items,
        {
          product_id: "",
          quantity: 1,
          unit_cost: 0,
        },
      ],
    })
  }

  const updatePurchaseOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = [...purchaseOrderForm.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Auto-fill unit cost when product is selected
    if (field === "product_id") {
      const product = products.find((p) => p.id === value)
      if (product) {
        updatedItems[index].unit_cost = product.cost
      }
    }

    setPurchaseOrderForm({ ...purchaseOrderForm, items: updatedItems })
  }

  const removePurchaseOrderItem = (index: number) => {
    const updatedItems = purchaseOrderForm.items.filter((_, i) => i !== index)
    setPurchaseOrderForm({ ...purchaseOrderForm, items: updatedItems })
  }

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredOrders = purchaseOrders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading && suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Truck className="h-6 w-6 mr-2" />
          <h1 className="text-xl font-semibold">Compras al Por Mayor</h1>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Compras</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
            <TabsTrigger value="orders">Órdenes de Compra</TabsTrigger>
            <TabsTrigger value="received">Recepción</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingSupplier(null)
                      setSupplierForm({
                        name: "",
                        contact_person: "",
                        email: "",
                        phone: "",
                        address: "",
                      })
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Proveedor
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
                    <DialogDescription>
                      {editingSupplier ? "Modifica los datos del proveedor" : "Agrega un nuevo proveedor"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSupplierSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre de la Empresa</Label>
                        <Input
                          id="name"
                          value={supplierForm.name}
                          onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_person">Persona de Contacto</Label>
                        <Input
                          id="contact_person"
                          value={supplierForm.contact_person}
                          onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={supplierForm.email}
                          onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={supplierForm.phone}
                          onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Textarea
                        id="address"
                        value={supplierForm.address}
                        onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Guardando..." : editingSupplier ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSuppliers.map((supplier) => (
                <Card key={supplier.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        <CardDescription>{supplier.contact_person}</CardDescription>
                      </div>
                      <Badge variant={supplier.is_active ? "default" : "secondary"}>
                        {supplier.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Email:</span> {supplier.email}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Teléfono:</span> {supplier.phone}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Dirección:</span> {supplier.address}
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSupplier(supplier)
                            setSupplierForm({
                              name: supplier.name,
                              contact_person: supplier.contact_person,
                              email: supplier.email,
                              phone: supplier.phone,
                              address: supplier.address,
                            })
                            setIsSupplierDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar órdenes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Dialog open={isPurchaseOrderDialogOpen} onOpenChange={setIsPurchaseOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Orden
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nueva Orden de Compra</DialogTitle>
                    <DialogDescription>Crea una nueva orden de compra para un proveedor</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePurchaseOrderSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplier">Proveedor</Label>
                        <Select
                          value={purchaseOrderForm.supplier_id}
                          onValueChange={(value) => setPurchaseOrderForm({ ...purchaseOrderForm, supplier_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona proveedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expected_delivery">Fecha Esperada de Entrega</Label>
                        <Input
                          id="expected_delivery"
                          type="date"
                          value={purchaseOrderForm.expected_delivery}
                          onChange={(e) =>
                            setPurchaseOrderForm({ ...purchaseOrderForm, expected_delivery: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Productos</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addItemToPurchaseOrder}>
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar Producto
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {purchaseOrderForm.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-5">
                              <Select
                                value={item.product_id}
                                onValueChange={(value) => updatePurchaseOrderItem(index, "product_id", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona producto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} - {product.category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="Cantidad"
                                value={item.quantity}
                                onChange={(e) =>
                                  updatePurchaseOrderItem(index, "quantity", Number.parseInt(e.target.value))
                                }
                                min="1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Costo"
                                value={item.unit_cost}
                                onChange={(e) =>
                                  updatePurchaseOrderItem(index, "unit_cost", Number.parseFloat(e.target.value))
                                }
                                min="0"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                value={`$${(item.quantity * item.unit_cost).toFixed(2)}`}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removePurchaseOrderItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas</Label>
                      <Textarea
                        id="notes"
                        value={purchaseOrderForm.notes}
                        onChange={(e) => setPurchaseOrderForm({ ...purchaseOrderForm, notes: e.target.value })}
                        rows={3}
                        placeholder="Notas adicionales para la orden..."
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="text-lg font-semibold">
                        Total: $
                        {purchaseOrderForm.items
                          .reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
                          .toFixed(2)}
                      </div>
                      <div className="flex space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsPurchaseOrderDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Creando..." : "Crear Orden"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const status = ORDER_STATUSES.find((s) => s.value === order.status)
                const StatusIcon = status?.icon || Clock

                return (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{order.order_number}</CardTitle>
                          <CardDescription>{order.supplier_name}</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={status?.color as any}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status?.label}
                          </Badge>
                          <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Total:</span> ${order.total_amount.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Fecha:</span>{" "}
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Entrega:</span>{" "}
                            {new Date(order.expected_delivery).toLocaleDateString()}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Productos:</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Costo Unitario</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.items.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.product_name}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>${item.unit_cost.toFixed(2)}</TableCell>
                                  <TableCell>${item.total_cost.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {order.notes && (
                          <div>
                            <span className="font-medium">Notas:</span> {order.notes}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Órdenes Recibidas</CardTitle>
                <CardDescription>Historial de órdenes completadas y recibidas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {purchaseOrders
                    .filter((order) => order.status === "received")
                    .map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded">
                        <div>
                          <h4 className="font-medium">{order.order_number}</h4>
                          <p className="text-sm text-muted-foreground">{order.supplier_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${order.total_amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  {purchaseOrders.filter((order) => order.status === "received").length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay órdenes recibidas</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
