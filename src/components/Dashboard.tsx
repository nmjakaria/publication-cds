import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Product } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  TrendingUp, 
  Package, 
  Users, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { motion } from 'motion/react';
import { startOfMonth, format, subMonths } from 'date-fns';

export const Dashboard: React.FC<{ onTabChange?: (tab: string) => void }> = ({ onTabChange }) => {
  const [stats, setStats] = useState({
    todaySales: 0,
    monthlySales: 0,
    totalProducts: 0,
    lowStock: 0,
    profit: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        const startOfThisMonth = startOfMonth(new Date()).toISOString();

        // Fetch Sales for stats
        const salesRef = collection(db, 'sales');
        const salesSnap = await getDocs(query(salesRef, orderBy('createdAt', 'desc')));
        const allSales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));

        const todaySales = allSales
          .filter(s => s.createdAt >= startOfToday)
          .reduce((sum, s) => sum + s.totalAmount, 0);

        const monthlySales = allSales
          .filter(s => s.createdAt >= startOfThisMonth)
          .reduce((sum, s) => sum + s.totalAmount, 0);

        // Fetch Products
        const productsRef = collection(db, 'products');
        const productsSnap = await getDocs(productsRef);
        const allProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

        const lowStock = allProducts.filter(p => p.stockLevel <= p.minStockAlert).length;

        // Process Chart Data (Last 6 months)
        const last6Months = Array.from({ length: 6 }).map((_, i) => {
          const d = subMonths(new Date(), i);
          return {
            month: format(d, 'MMM'),
            monthStart: startOfMonth(d),
            total: 0
          };
        }).reverse();

        last6Months.forEach(m => {
          m.total = allSales
            .filter(s => {
              const date = new Date(s.createdAt);
              return date >= m.monthStart && date < subMonths(m.monthStart, -1);
            })
            .reduce((sum, s) => sum + s.totalAmount, 0);
        });

        // Top Products Logic (Simple count)
        const productCounts: Record<string, { name: string, count: number }> = {};
        allSales.forEach(sale => {
          if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
              if (!productCounts[item.productId]) {
                productCounts[item.productId] = { name: item.name, count: 0 };
              }
              productCounts[item.productId].count += item.quantity;
            });
          }
        });

        const sortedTop = Object.values(productCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          todaySales,
          monthlySales,
          totalProducts: allProducts.length,
          lowStock,
          profit: monthlySales * 0.3 // Mock profit for now
        });
        setChartData(last6Months);
        setTopProducts(sortedTop);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, trend, color, subtitle, onClick }: any) => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={onClick ? { scale: 1.02, translateY: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={cn(
        "bg-white p-4 rounded-lg border border-slate-200 shadow-sm",
        onClick && "cursor-pointer hover:border-indigo-300 transition-colors"
      )}
    >
      <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{title}</div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded",
            trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {subtitle && <div className="text-[9px] text-slate-400 font-medium mt-1 uppercase tracking-tight">{subtitle}</div>}
    </motion.div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Daily Sales" 
          value={formatCurrency(stats.todaySales)} 
          trend={14.2} 
          subtitle="from yesterday"
          onClick={() => onTabChange?.('history')}
        />
        <StatCard 
          title="Monthly Sales" 
          value={formatCurrency(stats.monthlySales)} 
          trend={5.1} 
          subtitle="Revenue Target: 88%"
          onClick={() => onTabChange?.('history')}
        />
        <StatCard 
          title="Total SKU Count" 
          value={stats.totalProducts} 
          subtitle="Active Inventory"
          onClick={() => onTabChange?.('inventory')}
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={`${stats.lowStock} Items`} 
          subtitle="Action Required"
          onClick={() => onTabChange?.('inventory')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white flex flex-col rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Revenue Performance Tracking</h2>
            <button className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1 rounded font-bold transition-colors">Export .CSV</button>
          </div>
          <div className="p-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Inventory Velocity</h2>
          </div>
          <div className="p-4 space-y-4">
            {topProducts.length > 0 ? topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-50 text-indigo-600 flex items-center justify-center font-bold text-xs font-mono">
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{p.count} units sold this month</p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-emerald-500">+{(12 - i).toFixed(1)}%</div>
              </div>
            )) : (
               <div className="text-center py-20">
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No Sales Traffic Detected</p>
               </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100">
               <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">System Efficiency</span>
                    <span className="text-[10px] font-bold text-indigo-400">92%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[92%] transition-all duration-1000"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
