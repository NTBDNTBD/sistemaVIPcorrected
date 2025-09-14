"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { FileText, Download, TrendingUp, DollarSign, Package, ShoppingCart, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

interface SalesReport {
  date: string
  total_sales: number
  total_revenue: number
  transactions_count: number
  avg_transaction: number
}

interface ProductReport {
  product_id: string
  product_name: string
  category: string
  total_sold: number
  total_revenue: number
  profit_margin: number
  stock_remaining: number
}

interface CategoryReport {
  category: string
  total_sold: number
  total_revenue: number
  products_count: number
  avg_price: number
}

interface InventoryReport {
  product_id: string
  product_name: string
  category: string
  current_stock: number
  min_stock: number
  stock_value: number
  turnover_rate: number
  status: "healthy" | "low" | "critical"
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export default function ReportsDashboard() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  })
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [categories, setCategories] = useState<string[]>([])

  // Report data
  const [salesReport, setSalesReport] = useState<SalesReport[]>([])
  const [productReport, setProductReport] = useState<ProductReport[]>([])
  const [categoryReport, setCategoryReport] = useState<CategoryReport[]>([])
  const [inventoryReport, setInventoryReport] = useState<InventoryReport[]>([])

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    avgTransaction: 0,
    topProduct: "",
    topCategory: "",
    lowStockItems: 0,
  })

  useEffect(() => {
    fetchReportData()
  }, [dateRange, selectedCategory])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchSalesReport(), fetchProductReport(), fetchCategoryReport(), fetchInventoryReport()])
    } catch (error) {
      console.error("Error fetching report data:", error)
      toast.error("Error al cargar reportes")
    } finally {
      setLoading(false)
    }
  }

  const fetchSalesReport = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", `${dateRange.start}T00:00:00`)
        .lte("created_at", `${dateRange.end}T23:59:59`)
        .order("created_at")

      if (error) throw error

      // Group by date
      const salesByDate: { [key: string]: { sales: number; revenue: number; count: number } } = {}

      transactions?.forEach((transaction) => {
        const date = transaction.created_at.split("T")[0]
        if (!salesByDate[date]) {
          salesByDate[date] = { sales: 0, revenue: 0, count: 0 }
        }
        salesByDate[date].revenue += Number(transaction.amount || 0)
        salesByDate[date].count += 1
      })

      const salesReportData: SalesReport[] = Object.entries(salesByDate).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
        total_sales: data.count,
        total_revenue: data.revenue,
        transactions_count: data.count,
        avg_transaction: data.count > 0 ? data.revenue / data.count : 0,
      }))

      setSalesReport(salesReportData)

      // Calculate summary stats
      const totalRevenue = salesReportData.reduce((sum, day) => sum + day.total_revenue, 0)
      const totalTransactions = salesReportData.reduce((sum, day) => sum + day.transactions_count, 0)
      const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

      setSummaryStats((prev) => ({
        ...prev,
        totalRevenue,
        totalTransactions,
        avgTransaction,
      }))
    } catch (error) {
      console.error("Error fetching sales report:", error)
    }
  }

  const fetchProductReport = async () => {
    try {
      const { data: products, error: productsError } = await supabase.from("products").select("*").eq("is_active", true)

      if (productsError) throw productsError

      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", `${dateRange.start}T00:00:00`)
        .lte("created_at", `${dateRange.end}T23:59:59`)

      if (transactionsError) throw transactionsError

      // For demo purposes, we'll simulate product sales data
      // In a real app, you'd have a transaction_items table
      const productSales: { [key: string]: { sold: number; revenue: number } } = {}

      // Simulate some sales data based on transactions
      transactions?.forEach((transaction, index) => {
        const productIndex = index % (products?.length || 1)
        const product = products?.[productIndex]
        if (product) {
          if (!productSales[product.id]) {
            productSales[product.id] = { sold: 0, revenue: 0 }
          }
          const quantity = Math.floor(Math.random() * 5) + 1
          productSales[product.id].sold += quantity
          productSales[product.id].revenue += quantity * product.price
        }
      })

      const productReportData: ProductReport[] = (products || [])
        .map((product) => {
          const sales = productSales[product.id] || { sold: 0, revenue: 0 }
          const profit = sales.revenue - sales.sold * (product.cost || 0)
          const profitMargin = sales.revenue > 0 ? (profit / sales.revenue) * 100 : 0

          return {
            product_id: product.id,
            product_name: product.name,
            category: product.category,
            total_sold: sales.sold,
            total_revenue: sales.revenue,
            profit_margin: profitMargin,
            stock_remaining: product.stock || 0,
          }
        })
        .filter((item) => selectedCategory === "all" || item.category === selectedCategory)
        .sort((a, b) => b.total_revenue - a.total_revenue)

      setProductReport(productReportData)

      // Update categories
      const uniqueCategories = [...new Set(products?.map((p) => p.category) || [])]
      setCategories(uniqueCategories)

      // Find top product
      const topProduct = productReportData[0]?.product_name || "N/A"
      setSummaryStats((prev) => ({ ...prev, topProduct }))
    } catch (error) {
      console.error("Error fetching product report:", error)
    }
  }

  const fetchCategoryReport = async () => {
    try {
      const { data: products, error } = await supabase.from("products").select("*").eq("is_active", true)

      if (error) throw error

      // Group by category
      const categoryData: { [key: string]: { count: number; totalValue: number; totalStock: number } } = {}

      products?.forEach((product) => {
        if (!categoryData[product.category]) {
          categoryData[product.category] = { count: 0, totalValue: 0, totalStock: 0 }
        }
        categoryData[product.category].count += 1
        categoryData[product.category].totalValue += (product.stock || 0) * (product.price || 0)
        categoryData[product.category].totalStock += product.stock || 0
      })

      const categoryReportData: CategoryReport[] = Object.entries(categoryData).map(([category, data]) => ({
        category,
        total_sold: data.totalStock, // This would be actual sales in a real app
        total_revenue: data.totalValue,
        products_count: data.count,
        avg_price: data.count > 0 ? data.totalValue / data.totalStock : 0,
      }))

      setCategoryReport(categoryReportData)

      // Find top category
      const topCategory = categoryReportData.sort((a, b) => b.total_revenue - a.total_revenue)[0]?.category || "N/A"
      setSummaryStats((prev) => ({ ...prev, topCategory }))
    } catch (error) {
      console.error("Error fetching category report:", error)
    }
  }

  const fetchInventoryReport = async () => {
    try {
      const { data: products, error } = await supabase.from("products").select("*").eq("is_active", true)

      if (error) throw error

      const inventoryReportData: InventoryReport[] = (products || []).map((product) => {
        const stockValue = (product.stock || 0) * (product.cost || 0)
        const turnoverRate = Math.random() * 10 // Simulated turnover rate
        let status: "healthy" | "low" | "critical" = "healthy"

        if (product.stock <= 0) {
          status = "critical"
        } else if (product.stock <= (product.min_stock || 5)) {
          status = "low"
        }

        return {
          product_id: product.id,
          product_name: product.name,
          category: product.category,
          current_stock: product.stock || 0,
          min_stock: product.min_stock || 5,
          stock_value: stockValue,
          turnover_rate: turnoverRate,
          status,
        }
      })

      setInventoryReport(inventoryReportData)

      // Count low stock items
      const lowStockItems = inventoryReportData.filter((item) => item.status !== "healthy").length
      setSummaryStats((prev) => ({ ...prev, lowStockItems }))
    } catch (error) {
      console.error("Error fetching inventory report:", error)
    }
  }

  const exportReport = (reportType: string) => {
    let data: any[] = []
    let filename = ""

    switch (reportType) {
      case "sales":
        data = salesReport
        filename = "reporte-ventas"
        break
      case "products":
        data = productReport
        filename = "reporte-productos"
        break
      case "inventory":
        data = inventoryReport
        filename = "reporte-inventario"
        break
      default:
        return
    }

    const csv = [Object.keys(data[0] || {}).join(","), ...data.map((row) => Object.values(row).join(","))].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success("Reporte exportado correctamente")
  }

  if (loading) {
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
          <FileText className="h-6 w-6 mr-2" />
          <h1 className="text-xl font-semibold">Reportes y Análisis</h1>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Análisis de Ventas</h2>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Fecha Inicio</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Fecha Fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Acciones</Label>
                <Button onClick={fetchReportData} className="w-full">
                  Actualizar Reportes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryStats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Período seleccionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">Promedio: ${summaryStats.avgTransaction.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Producto Top</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{summaryStats.topProduct}</div>
              <p className="text-xs text-muted-foreground">Más vendido</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summaryStats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Productos críticos</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Ingresos por Día</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => exportReport("sales")}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesReport}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total_revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transacciones por Día</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesReport}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="transactions_count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rendimiento por Producto</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportReport("products")}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Vendidos</TableHead>
                      <TableHead>Ingresos</TableHead>
                      <TableHead>Margen</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productReport.slice(0, 10).map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.total_sold}</TableCell>
                        <TableCell>${product.total_revenue.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={product.profit_margin > 20 ? "default" : "secondary"}>
                            {product.profit_margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.stock_remaining > 10 ? "default" : "destructive"}>
                            {product.stock_remaining}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryReport}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total_revenue"
                      >
                        {categoryReport.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumen por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryReport.map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <div>
                            <p className="font-medium">{category.category}</p>
                            <p className="text-sm text-muted-foreground">{category.products_count} productos</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${category.total_revenue.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Promedio: ${category.avg_price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Estado del Inventario</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportReport("inventory")}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead>Stock Mínimo</TableHead>
                      <TableHead>Valor Stock</TableHead>
                      <TableHead>Rotación</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryReport.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.current_stock}</TableCell>
                        <TableCell>{item.min_stock}</TableCell>
                        <TableCell>${item.stock_value.toFixed(2)}</TableCell>
                        <TableCell>{item.turnover_rate.toFixed(1)}x</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "healthy"
                                ? "default"
                                : item.status === "low"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {item.status === "healthy" ? "Saludable" : item.status === "low" ? "Bajo" : "Crítico"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
