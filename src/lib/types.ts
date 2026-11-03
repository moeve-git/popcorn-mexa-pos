export type PaymentMethod = "efectivo" | "tarjeta";
export type Shift = "manana" | "noche";

export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  cost: number | null;
  track_stock: boolean;
  allow_oversell: boolean;
  stock: number;
  low_stock_alert: number;
  emoji: string;
  color: string;
  image_url: string | null;
  active: boolean;
  sort_order: number;
};

export type CashSession = {
  id: string;
  shift: Shift;
  status: "abierta" | "cerrada";
  opened_at: string;
  opening_cash: number;
  closed_at: string | null;
  cash_sales: number | null;
  card_sales: number | null;
  total_sales: number | null;
  sales_count: number | null;
  cash_in: number | null;
  cash_out: number | null;
  expected_cash: number | null;
  counted_cash: number | null;
  difference: number | null;
  notes: string | null;
};

export type SessionSummary = {
  session_id: string;
  shift: Shift;
  status: "abierta" | "cerrada";
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  cash_sales: number;
  card_sales: number;
  total_sales: number;
  sales_count: number;
  cancelled_count: number;
  cash_in: number;
  cash_out: number;
  expected_cash: number;
  counted_cash: number | null;
  difference: number | null;
  notes: string | null;
  products: { name: string; quantity: number; total: number }[];
};

export type CashMovement = {
  id: string;
  type: "entrada" | "salida";
  amount: number;
  reason: string;
  created_at: string;
};

export type SaleResult = {
  sale_id: string;
  folio: number;
  total: number;
  amount_received: number;
  change: number;
  payment_method: PaymentMethod;
};

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export type DashboardStats = {
  view: "day" | "week" | "month";
  start: string;
  end: string;
  summary: {
    total: number;
    count: number;
    avg: number;
    cash: number;
    card: number;
    cash_count: number;
    card_count: number;
    items: number;
  };
  previous: { total: number; count: number; avg: number };
  series: { bucket: string; total: number; cash: number; card: number; count: number }[];
  top: { name: string; quantity: number; total: number }[];
  categories: { name: string; quantity: number; total: number }[];
};
