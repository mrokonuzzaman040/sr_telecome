import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../invoices/invoices_list_screen.dart';

class DashboardScreen extends StatelessWidget {
  final void Function(int tabIndex)? onNavigate;

  const DashboardScreen({super.key, this.onNavigate});

  bool _isToday(String isoDate) {
    try {
      final d = DateTime.parse(isoDate);
      final now = DateTime.now();
      return d.year == now.year && d.month == now.month && d.day == now.day;
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final currency = NumberFormat('#,##0', 'en_US');

    final todaySales = store.sales.where((s) => _isToday(s.createdAt)).toList();
    final todayExpenses = store.expenses.where((e) => _isToday(e.date)).toList();

    final todaySalesTotal = todaySales.fold(0.0, (sum, s) => sum + s.payableAmount);
    final todayCashIn = todaySales.fold(0.0, (sum, s) => sum + s.paidAmount);
    final todayExpenseTotal = todayExpenses.fold(0.0, (sum, e) => sum + e.amount);
    final todayGrossProfit = todaySales.fold(0.0, (sum, s) => sum + s.grossProfit);
    final estimatedCashDrawer = todaySales
        .where((s) => s.paymentMethod == 'cash')
        .fold(0.0, (sum, s) => sum + s.paidAmount);
    final avgOrderValue = todaySales.isEmpty ? 0.0 : todaySalesTotal / todaySales.length;

    final totalDue = store.customers.fold(0.0, (sum, c) => sum + c.currentDue);
    final lowStockCount = store.products.where((p) => p.isLowStock).length;
    final stockValue = store.products.fold(0.0, (sum, p) => sum + (p.buyPrice * p.stockQty));

    final paymentBreakdown = <String, double>{};
    for (final s in todaySales) {
      paymentBreakdown[s.paymentMethod] = (paymentBreakdown[s.paymentMethod] ?? 0) + s.paidAmount;
    }

    final recentSales = store.sales.take(8).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('ড্যাশবোর্ড'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => store.loadAllData()),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => store.loadAllData(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('আজকের সারসংক্ষেপ', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _metricCard('আজকের বিক্রয়', todaySalesTotal, AppTheme.primary, Icons.point_of_sale, currency),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _metricCard('নগদ আদায়', todayCashIn, AppTheme.success, Icons.payments, currency),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _metricCard('আজকের খরচ', todayExpenseTotal, Colors.deepOrange, Icons.money_off, currency),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _metricCard('ক্যাশ ড্রয়ার (আনুমানিক)', estimatedCashDrawer, Colors.indigo, Icons.point_of_sale_outlined, currency),
                ),
              ],
            ),
            if (auth.isAdmin) ...[
              const SizedBox(height: 10),
              _metricCard('আজকের গ্রস প্রফিট', todayGrossProfit, Colors.teal, Icons.trending_up, currency),
            ],
            const SizedBox(height: 20),

            Text('হিসাব ও মজুদ', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => onNavigate?.call(3), // Due / Customers tab
                    child: _metricCard('মোট বকেয়া', totalDue, AppTheme.danger, Icons.receipt_long, currency),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => onNavigate?.call(2), // Stock / Inventory tab
                    child: _countCard('কম স্টক পণ্য', lowStockCount, AppTheme.danger, Icons.warning_amber),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _metricCard('গড় বিক্রয় মূল্য', avgOrderValue, Colors.purple, Icons.shopping_bag_outlined, currency),
                ),
                const SizedBox(width: 10),
                if (auth.isAdmin)
                  Expanded(
                    child: _metricCard('স্টকের মূল্য (ক্রয়মূল্যে)', stockValue, Colors.brown, Icons.inventory_2_outlined, currency),
                  ),
              ],
            ),
            const SizedBox(height: 20),

            if (paymentBreakdown.isNotEmpty) ...[
              Text('আজকের পেমেন্ট মাধ্যম বিভাজন', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              ...paymentBreakdown.entries.map(
                (e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(kPaymentMethodLabels[e.key] ?? e.key, style: const TextStyle(fontSize: 13)),
                      Text('৳${currency.format(e.value)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('সাম্প্রতিক বিক্রয়', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const InvoicesListScreen()),
                  ),
                  child: const Text('সব দেখুন'),
                ),
              ],
            ),
            if (recentSales.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(child: Text('কোন বিক্রয় নেই', style: TextStyle(color: Colors.grey))),
              )
            else
              ...recentSales.map(
                (sale) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    dense: true,
                    title: Text(sale.invoiceNo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: Text('${sale.customerName} · ${sale.createdAt.split('T').first}', style: const TextStyle(fontSize: 12)),
                    trailing: Text(
                      '৳${currency.format(sale.payableAmount)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _metricCard(String title, double amount, Color color, IconData icon, NumberFormat currency) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(title, style: TextStyle(fontSize: 12, color: Colors.grey.shade600))),
              Icon(icon, color: color, size: 18),
            ],
          ),
          const SizedBox(height: 6),
          Text('৳${currency.format(amount)}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _countCard(String title, int count, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(title, style: TextStyle(fontSize: 12, color: Colors.grey.shade600))),
              Icon(icon, color: color, size: 18),
            ],
          ),
          const SizedBox(height: 6),
          Text('$count টি', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}
