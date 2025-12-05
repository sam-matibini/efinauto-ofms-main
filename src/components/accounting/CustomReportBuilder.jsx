import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  FileText, Download, Save, FolderOpen, Plus, Trash2, Filter, 
  BarChart3, Play, Star, StarOff, Settings, Table, PieChart as PieIcon,
  LineChart as LineIcon, AreaChart as AreaIcon, X, ChevronDown
} from "lucide-react";

const ENTITY_CONFIG = {
  Transaction: {
    label: "Transactions",
    fields: [
      { name: "transaction_date", label: "Date", type: "date" },
      { name: "description", label: "Description", type: "string" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "category", label: "Category", type: "string" },
      { name: "transaction_type", label: "Type", type: "string" },
      { name: "status", label: "Status", type: "string" },
      { name: "reference_number", label: "Reference", type: "string" }
    ]
  },
  Sale: {
    label: "Sales",
    fields: [
      { name: "sale_date", label: "Sale Date", type: "date" },
      { name: "sale_number", label: "Sale Number", type: "string" },
      { name: "customer_name", label: "Customer", type: "string" },
      { name: "vehicle_details", label: "Vehicle", type: "string" },
      { name: "sale_price", label: "Sale Price", type: "number" },
      { name: "grand_total", label: "Grand Total", type: "number" },
      { name: "tax_total", label: "Tax", type: "number" },
      { name: "status", label: "Status", type: "string" },
      { name: "payment_status", label: "Payment Status", type: "string" },
      { name: "sale_type", label: "Sale Type", type: "string" }
    ]
  },
  Purchase: {
    label: "Purchases",
    fields: [
      { name: "order_date", label: "Order Date", type: "date" },
      { name: "purchase_number", label: "Purchase Number", type: "string" },
      { name: "supplier_name", label: "Supplier", type: "string" },
      { name: "purchase_type", label: "Type", type: "string" },
      { name: "total_amount", label: "Total Amount", type: "number" },
      { name: "amount_paid", label: "Amount Paid", type: "number" },
      { name: "status", label: "Status", type: "string" },
      { name: "payment_status", label: "Payment Status", type: "string" }
    ]
  },
  Vehicle: {
    label: "Vehicles",
    fields: [
      { name: "vin", label: "VIN", type: "string" },
      { name: "stock_number", label: "Stock Number", type: "string" },
      { name: "year", label: "Year", type: "number" },
      { name: "make", label: "Make", type: "string" },
      { name: "model", label: "Model", type: "string" },
      { name: "color", label: "Color", type: "string" },
      { name: "mileage", label: "Mileage", type: "number" },
      { name: "purchase_price", label: "Purchase Price", type: "number" },
      { name: "selling_price", label: "Selling Price", type: "number" },
      { name: "status", label: "Status", type: "string" },
      { name: "condition", label: "Condition", type: "string" }
    ]
  },
  Part: {
    label: "Parts",
    fields: [
      { name: "part_number", label: "Part Number", type: "string" },
      { name: "name", label: "Name", type: "string" },
      { name: "category", label: "Category", type: "string" },
      { name: "quantity", label: "Quantity", type: "number" },
      { name: "cost_price", label: "Cost Price", type: "number" },
      { name: "selling_price", label: "Selling Price", type: "number" },
      { name: "supplier", label: "Supplier", type: "string" }
    ]
  },
  Customer: {
    label: "Customers",
    fields: [
      { name: "full_name", label: "Name", type: "string" },
      { name: "email", label: "Email", type: "string" },
      { name: "phone", label: "Phone", type: "string" },
      { name: "city", label: "City", type: "string" },
      { name: "province", label: "Province", type: "string" },
      { name: "customer_type", label: "Type", type: "string" }
    ]
  },
  RepairOrder: {
    label: "Repair Orders",
    fields: [
      { name: "order_number", label: "Order Number", type: "string" },
      { name: "customer_name", label: "Customer", type: "string" },
      { name: "vehicle_make", label: "Vehicle Make", type: "string" },
      { name: "vehicle_model", label: "Vehicle Model", type: "string" },
      { name: "service_type", label: "Service Type", type: "string" },
      { name: "total_cost", label: "Total Cost", type: "number" },
      { name: "status", label: "Status", type: "string" },
      { name: "start_date", label: "Start Date", type: "date" }
    ]
  },
  Export: {
    label: "Exports",
    fields: [
      { name: "export_number", label: "Export Number", type: "string" },
      { name: "customer_name", label: "Customer", type: "string" },
      { name: "destination_country", label: "Destination", type: "string" },
      { name: "total_value", label: "Total Value", type: "number" },
      { name: "status", label: "Status", type: "string" },
      { name: "shipment_date", label: "Shipment Date", type: "date" }
    ]
  },
  FreightShipment: {
    label: "Freight Shipments",
    fields: [
      { name: "shipment_number", label: "Shipment Number", type: "string" },
      { name: "customer_name", label: "Customer", type: "string" },
      { name: "origin_country", label: "Origin", type: "string" },
      { name: "destination_country", label: "Destination", type: "string" },
      { name: "cargo_value", label: "Cargo Value", type: "number" },
      { name: "freight_cost", label: "Freight Cost", type: "number" },
      { name: "status", label: "Status", type: "string" }
    ]
  }
};

const FILTER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "between", label: "Between" }
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function CustomReportBuilder() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    report_name: "",
    description: "",
    entity_type: "Sale",
    selected_fields: [],
    filters: [],
    sort_field: "",
    sort_direction: "desc",
    chart_type: "none",
    chart_x_field: "",
    chart_y_field: "",
    chart_group_by: ""
  });
  
  const [reportData, setReportData] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");

  const { data: savedReports = [] } = useQuery({
    queryKey: ['custom-reports', selectedCompanyId],
    queryFn: () => base44.entities.CustomReport.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const saveReportMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomReport.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success("Report saved");
      setShowSaveDialog(false);
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success("Report deleted");
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomReport.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-reports'] })
  });

  const entityFields = ENTITY_CONFIG[config.entity_type]?.fields || [];

  const handleFieldToggle = (fieldName) => {
    setConfig(prev => ({
      ...prev,
      selected_fields: prev.selected_fields.includes(fieldName)
        ? prev.selected_fields.filter(f => f !== fieldName)
        : [...prev.selected_fields, fieldName]
    }));
  };

  const addFilter = () => {
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, { field: entityFields[0]?.name || "", operator: "equals", value: "" }]
    }));
  };

  const updateFilter = (index, updates) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map((f, i) => i === index ? { ...f, ...updates } : f)
    }));
  };

  const removeFilter = (index) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const runReport = async () => {
    if (config.selected_fields.length === 0) {
      toast.error("Please select at least one field");
      return;
    }

    setIsRunning(true);
    try {
      const entityMap = {
        Transaction: base44.entities.Transaction,
        Sale: base44.entities.Sale,
        Purchase: base44.entities.Purchase,
        Vehicle: base44.entities.Vehicle,
        Part: base44.entities.Part,
        Customer: base44.entities.Customer,
        RepairOrder: base44.entities.RepairOrder,
        Export: base44.entities.Export,
        FreightShipment: base44.entities.FreightShipment
      };

      let data = await entityMap[config.entity_type].filter({ company_id: selectedCompanyId });

      // Apply filters
      config.filters.forEach(filter => {
        if (!filter.value) return;
        data = data.filter(item => {
          const itemValue = item[filter.field];
          const filterValue = filter.value;

          switch (filter.operator) {
            case "equals":
              return String(itemValue).toLowerCase() === String(filterValue).toLowerCase();
            case "not_equals":
              return String(itemValue).toLowerCase() !== String(filterValue).toLowerCase();
            case "contains":
              return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
            case "greater_than":
              return Number(itemValue) > Number(filterValue);
            case "less_than":
              return Number(itemValue) < Number(filterValue);
            default:
              return true;
          }
        });
      });

      // Sort
      if (config.sort_field) {
        data.sort((a, b) => {
          const aVal = a[config.sort_field];
          const bVal = b[config.sort_field];
          const modifier = config.sort_direction === "asc" ? 1 : -1;
          if (typeof aVal === "number") return (aVal - bVal) * modifier;
          return String(aVal).localeCompare(String(bVal)) * modifier;
        });
      }

      setReportData(data);
      setActiveTab("results");
      toast.success(`Found ${data.length} records`);
    } catch (error) {
      toast.error("Failed to run report");
    } finally {
      setIsRunning(false);
    }
  };

  const loadReport = (report) => {
    setConfig({
      report_name: report.report_name,
      description: report.description || "",
      entity_type: report.entity_type,
      selected_fields: report.selected_fields || [],
      filters: report.filters || [],
      sort_field: report.sort_field || "",
      sort_direction: report.sort_direction || "desc",
      chart_type: report.chart_type || "none",
      chart_x_field: report.chart_x_field || "",
      chart_y_field: report.chart_y_field || "",
      chart_group_by: report.chart_group_by || ""
    });
    setShowLoadDialog(false);
    toast.success("Report loaded");
  };

  const exportCSV = () => {
    if (reportData.length === 0) return;
    
    const headers = config.selected_fields;
    const rows = reportData.map(row => 
      headers.map(h => {
        const val = row[h];
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(",")
    );
    
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.report_name || "report"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("CSV exported");
  };

  const exportPDF = () => {
    window.print();
    toast.success("PDF export initiated");
  };

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (!config.chart_group_by || !config.chart_y_field || reportData.length === 0) return [];
    
    const grouped = {};
    reportData.forEach(item => {
      const key = item[config.chart_group_by] || "Unknown";
      if (!grouped[key]) grouped[key] = { name: key, value: 0, count: 0 };
      grouped[key].value += Number(item[config.chart_y_field]) || 0;
      grouped[key].count += 1;
    });
    
    return Object.values(grouped).slice(0, 10);
  }, [reportData, config.chart_group_by, config.chart_y_field]);

  const renderChart = () => {
    if (config.chart_type === "none" || chartData.length === 0) return null;

    const ChartWrapper = ({ children }) => (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Chart Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {children}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );

    switch (config.chart_type) {
      case "bar":
        return (
          <ChartWrapper>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ChartWrapper>
        );
      case "line":
        return (
          <ChartWrapper>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ChartWrapper>
        );
      case "pie":
        return (
          <ChartWrapper>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            </PieChart>
          </ChartWrapper>
        );
      case "area":
        return (
          <ChartWrapper>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ChartWrapper>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Custom Report Builder</h2>
          <p className="text-sm text-gray-500">Create and save custom reports with charts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLoadDialog(true)}>
            <FolderOpen className="w-4 h-4 mr-2" /> Load
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} disabled={!config.report_name}>
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={reportData.length === 0}>
                <Download className="w-4 h-4 mr-2" /> Export <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportCSV}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF}>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> Builder
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Table className="w-4 h-4" /> Results ({reportData.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Report Name</Label>
                  <Input
                    value={config.report_name}
                    onChange={(e) => setConfig({ ...config, report_name: e.target.value })}
                    placeholder="My Custom Report"
                  />
                </div>
                
                <div>
                  <Label>Entity Type</Label>
                  <Select value={config.entity_type} onValueChange={(v) => setConfig({ ...config, entity_type: v, selected_fields: [], filters: [] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ENTITY_CONFIG).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Fields</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 mt-1">
                    {entityFields.map((field) => (
                      <div key={field.name} className="flex items-center gap-2">
                        <Checkbox
                          id={field.name}
                          checked={config.selected_fields.includes(field.name)}
                          onCheckedChange={() => handleFieldToggle(field.name)}
                        />
                        <label htmlFor={field.name} className="text-sm cursor-pointer">{field.label}</label>
                        <Badge variant="outline" className="text-xs ml-auto">{field.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Sort By</Label>
                    <Select value={config.sort_field} onValueChange={(v) => setConfig({ ...config, sort_field: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        {entityFields.map((f) => (
                          <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Direction</Label>
                    <Select value={config.sort_direction} onValueChange={(v) => setConfig({ ...config, sort_direction: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right: Filters & Charts */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Filter className="w-4 h-4" /> Filters
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={addFilter}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {config.filters.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No filters applied</p>
                  ) : (
                    <div className="space-y-2">
                      {config.filters.map((filter, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Select value={filter.field} onValueChange={(v) => updateFilter(idx, { field: v })}>
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {entityFields.map((f) => (
                                <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={filter.operator} onValueChange={(v) => updateFilter(idx, { operator: v })}>
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FILTER_OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={filter.value}
                            onChange={(e) => updateFilter(idx, { value: e.target.value })}
                            placeholder="Value"
                            className="flex-1"
                          />
                          <Button size="icon" variant="ghost" onClick={() => removeFilter(idx)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Chart Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Chart Type</Label>
                    <div className="flex gap-2 mt-1">
                      {[
                        { type: "none", icon: Table, label: "None" },
                        { type: "bar", icon: BarChart3, label: "Bar" },
                        { type: "line", icon: LineIcon, label: "Line" },
                        { type: "pie", icon: PieIcon, label: "Pie" },
                        { type: "area", icon: AreaIcon, label: "Area" }
                      ].map(({ type, icon: Icon, label }) => (
                        <Button
                          key={type}
                          size="sm"
                          variant={config.chart_type === type ? "default" : "outline"}
                          onClick={() => setConfig({ ...config, chart_type: type })}
                        >
                          <Icon className="w-4 h-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                  {config.chart_type !== "none" && (
                    <>
                      <div>
                        <Label>Group By (X-Axis)</Label>
                        <Select value={config.chart_group_by} onValueChange={(v) => setConfig({ ...config, chart_group_by: v })}>
                          <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                          <SelectContent>
                            {entityFields.filter(f => f.type === "string").map((f) => (
                              <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Aggregate (Y-Axis)</Label>
                        <Select value={config.chart_y_field} onValueChange={(v) => setConfig({ ...config, chart_y_field: v })}>
                          <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                          <SelectContent>
                            {entityFields.filter(f => f.type === "number").map((f) => (
                              <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Button onClick={runReport} disabled={isRunning} className="w-full">
            <Play className="w-4 h-4 mr-2" /> {isRunning ? "Running..." : "Run Report"}
          </Button>
        </TabsContent>

        <TabsContent value="results">
          {reportData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No results yet. Configure and run your report.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {renderChart()}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Results ({reportData.length} records)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          {config.selected_fields.map((field) => (
                            <th key={field} className="text-left p-2 font-medium">
                              {entityFields.find(f => f.name === field)?.label || field}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.slice(0, 100).map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            {config.selected_fields.map((field) => {
                              const fieldConfig = entityFields.find(f => f.name === field);
                              let value = row[field];
                              if (fieldConfig?.type === "date" && value) {
                                value = format(new Date(value), "MMM d, yyyy");
                              } else if (fieldConfig?.type === "number" && value) {
                                value = typeof value === "number" ? value.toLocaleString() : value;
                              }
                              return <td key={field} className="p-2">{value ?? "-"}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reportData.length > 100 && (
                      <p className="text-sm text-gray-500 text-center mt-2">Showing first 100 of {reportData.length} records</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Report Name</Label>
              <Input
                value={config.report_name}
                onChange={(e) => setConfig({ ...config, report_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={() => saveReportMutation.mutate(config)}>Save Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Load Saved Report</DialogTitle>
          </DialogHeader>
          {savedReports.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No saved reports yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {savedReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="cursor-pointer flex-1" onClick={() => loadReport(report)}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{report.report_name}</span>
                      <Badge variant="outline">{report.entity_type}</Badge>
                      {report.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    </div>
                    {report.description && <p className="text-xs text-gray-500">{report.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateReportMutation.mutate({ id: report.id, data: { is_favorite: !report.is_favorite } })}
                    >
                      {report.is_favorite ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => deleteReportMutation.mutate(report.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}