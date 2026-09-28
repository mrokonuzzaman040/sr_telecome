import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/section_header.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/status_badge.dart';
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

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'শুভ সকাল';
    if (hour < 17) return 'শুভ অপরাহ্ন';
    return 'শুভ সন্ধ্যা';
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild only when the domains this screen reads actually change.
    context.select<StoreProvider, int>((s) => s.salesVersion);
    context.select<StoreProvider, int>((s) => s.expensesVersion);
    context.select<StoreProvider, int>((s) => s.customersVersion);
    context.select<StoreProvider, int>((s) => s.productsVersion);
    final store = context.read<StoreProvider>();
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
    final todayLabel = DateFormat('d MMMM, EEEE').format(DateTime.now());

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: RefreshIndicator(
        onRefresh: () => store.loadAllData(),
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 56, 20, 28),
                decoration: const BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(28),
                    bottomRight: Radius.circular(28),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: Colors.white.withValues(alpha: 0.2),
                          child: Icon(
                            auth.isAdmin ? Icons.admin_panel_settings : Icons.badge,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_greeting()}, ${auth.currentUser?.name ?? ''}',
                                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                todayLabel,
                                style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh, color: Colors.white),
                          onPressed: () => store.loadAllData(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('আজকের মোট বিক্রয়', style: TextStyle(color: Colors.white70, fontSize: 12)),
                              const SizedBox(height: 4),
                              Text(
                                '৳${currency.format(todaySalesTotal)}',
                                style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.receipt_long, color: Colors.white, size: 16),
                              const SizedBox(width: 6),
                              Text('${todaySales.length} চালান', style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  SectionHeader(title: 'আজকের সারসংক্ষেপ'),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.5,
                    children: [
                      StatCard(label: 'নগদ আদায়', value: '৳${currency.format(todayCashIn)}', icon: Icons.payments, color: AppTheme.success),
                      StatCard(label: 'আজকের খরচ', value: '৳${currency.format(todayExpenseTotal)}', icon: Icons.money_off, color: Colors.deepOrange),
                      StatCard(label: 'ক্যাশ ড্রয়ার (আনুমানিক)', value: '৳${currency.format(estimatedCashDrawer)}', icon: Icons.savings_outlined, color: Colors.indigo),
                      if (auth.isAdmin)
                        StatCard(label: 'আজকের গ্রস প্রফিট', value: '৳${currency.format(todayGrossProfit)}', icon: Icons.trending_up, color: Colors.teal)
                      else
                        StatCard(label: 'গড় বিক্রয় মূল্য', value: '৳${currency.format(avgOrderValue)}', icon: Icons.shopping_bag_outlined, color: Colors.purple),
                    ],
                  ),
                  const SizedBox(height: 24),

                  SectionHeader(title: 'হিসাব ও মজুদ'),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.5,
                    children: [
                      StatCard(
                        label: 'মোট বকেয়া',
                        value: '৳${currency.format(totalDue)}',
                        icon: Icons.receipt_long,
                        color: AppTheme.danger,
                        onTap: () => onNavigate?.call(3),
                      ),
                      StatCard(
                        label: 'কম স্টক পণ্য',
                        value: '$lowStockCount টি',
                        icon: Icons.warning_amber,
                        color: AppTheme.danger,
                        onTap: () => onNavigate?.call(2),
                      ),
                      StatCard(label: 'গড় বিক্রয় মূল্য', value: '৳${currency.format(avgOrderValue)}', icon: Icons.shopping_bag_outlined, color: Colors.purple),
                      if (auth.isAdmin)
                        StatCard(label: 'স্টকের মূল্য (ক্রয়মূল্যে)', value: '৳${currency.format(stockValue)}', icon: Icons.inventory_2_outlined, color: Colors.brown),
                    ],
                  ),

                  if (paymentBreakdown.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    SectionHeader(title: 'আজকের পেমেন্ট মাধ্যম বিভাজন'),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(color: AppTheme.border),
                        boxShadow: AppTheme.softShadow,
                      ),
                      child: Column(
                        children: paymentBreakdown.entries.map((e) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                StatusBadge(
                                  label: kPaymentMethodLabels[e.key] ?? e.key,
                                  color: AppTheme.secondary,
                                  icon: Icons.account_balance_wallet_outlined,
                                ),
                                Text('৳${currency.format(e.value)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  SectionHeader(
                    title: 'সাম্প্রতিক বিক্রয়',
                    action: TextButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const InvoicesListScreen()),
                      ),
                      icon: const Text('সব দেখুন', style: TextStyle(fontSize: 12.5)),
                      label: const Icon(Icons.arrow_forward_ios, size: 12),
                      iconAlignment: IconAlignment.end,
                    ),
                  ),
                  if (recentSales.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: EmptyState(icon: Icons.receipt_long_outlined, message: 'আজ পর্যন্ত কোন বিক্রয় হয়নি'),
                    )
                  else
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(color: AppTheme.border),
                        boxShadow: AppTheme.softShadow,
                      ),
                      child: Column(
                        children: recentSales.asMap().entries.map((entry) {
                          final sale = entry.value;
                          final isLast = entry.key == recentSales.length - 1;
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              border: isLast ? null : const Border(bottom: BorderSide(color: AppTheme.border)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.receipt, color: AppTheme.primary, size: 16),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(sale.invoiceNo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${sale.customerName} · ${sale.createdAt.split('T').first}',
                                        style: const TextStyle(fontSize: 11.5, color: AppTheme.textMuted),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '৳${currency.format(sale.payableAmount)}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppTheme.textDark),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  const SizedBox(height: 12),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
