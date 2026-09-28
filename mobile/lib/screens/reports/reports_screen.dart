import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final currencyFormat = NumberFormat('#,##0', 'en_US');
  bool _adminUnlocked = false;

  void _promptAdminPin() {
    final pinController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('মালিক / এডমিন প্রমাণীকরণ'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'লাভ-ক্ষতি ও ব্যয় সংক্রান্ত গোপনীয় হিসাব দেখতে এডমিন পিন কোড দিন:',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: pinController,
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 4,
              decoration: const InputDecoration(
                labelText: '৪ ডিজিট এডমিন পিন (1234)',
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('বাতিল'),
          ),
          ElevatedButton(
            onPressed: () {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              if (auth.verifyAdminPin(pinController.text)) {
                setState(() => _adminUnlocked = true);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('এডমিন এক্সেস অনুমোদিত হয়েছে'), backgroundColor: AppTheme.success),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('ভুল পিন কোড!'), backgroundColor: AppTheme.danger),
                );
              }
            },
            child: const Text('আনলক করুন'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final hasAdminAccess = auth.isAdmin || _adminUnlocked;

    // Calculations
    final totalSalesAmount = store.sales.fold(0.0, (sum, s) => sum + s.payableAmount);
    final totalPaidAmount = store.sales.fold(0.0, (sum, s) => sum + s.paidAmount);
    final totalDueAmount = store.sales.fold(0.0, (sum, s) => sum + s.dueAmount);
    final totalGrossProfit = store.sales.fold(0.0, (sum, s) => sum + s.grossProfit);
    final totalExpenses = store.expenses.fold(0.0, (sum, e) => sum + e.amount);
    final netProfit = totalGrossProfit - totalExpenses;

    return Scaffold(
      appBar: AppBar(
        title: const Text('হিসাব-নিকাশ ও রিপোর্ট'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => store.loadAllData(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Sales Overview
            const Text(
              'বিক্রয় ও ক্যাশ সারসংক্ষেপ',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    title: 'মোট বিক্রয় (বিক্রিত মূল্য)',
                    amount: totalSalesAmount,
                    color: AppTheme.primary,
                    icon: Icons.point_of_sale,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    title: 'মোট সংগৃহীত নগদ টাকা',
                    amount: totalPaidAmount,
                    color: AppTheme.success,
                    icon: Icons.payments,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildMetricCard(
              title: 'বিক্রয় পরবর্তী নতুন বকেয়া (Due)',
              amount: totalDueAmount,
              color: AppTheme.danger,
              icon: Icons.receipt_long,
            ),

            const SizedBox(height: 24),

            // Financial & Profit Section (Protected)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'নিট লাভ-ক্ষতি ও ব্যয় বিবরণী',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                if (!hasAdminAccess)
                  TextButton.icon(
                    onPressed: _promptAdminPin,
                    icon: const Icon(Icons.lock_open, size: 16),
                    label: const Text('আনলক করুন'),
                  ),
              ],
            ),
            const SizedBox(height: 10),

            if (!hasAdminAccess)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.security, size: 40, color: Colors.amber),
                    const SizedBox(height: 8),
                    const Text(
                      'সুরক্ষিত সেকশন: মালিক / এডমিন এক্সেস প্রয়োজন',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'নিট মুনাফা ও ব্যয়ের হিসাব শুধুমাত্র দোকান মালিকের জন্য সংরক্ষিত।',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.amber.shade800),
                      icon: const Icon(Icons.vpn_key),
                      label: const Text('এডমিন পিন দিন (1234)'),
                      onPressed: _promptAdminPin,
                    ),
                  ],
                ),
              )
            else ...[
              // Unlocked Profit Breakdown
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      title: 'মোট গ্রস প্রফিট',
                      amount: totalGrossProfit,
                      color: Colors.indigo,
                      icon: Icons.trending_up,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      title: 'মোট দোকানের খরচ',
                      amount: totalExpenses,
                      color: Colors.deepOrange,
                      icon: Icons.money_off,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: netProfit >= 0 ? Colors.green.shade50 : Colors.red.shade50,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: netProfit >= 0 ? Colors.green.shade300 : Colors.red.shade300,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          netProfit >= 0 ? 'চূড়ান্ত নিট মুনাফা (Net Profit)' : 'মোট লোকসান (Net Loss)',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: netProfit >= 0 ? AppTheme.success : AppTheme.danger,
                          ),
                        ),
                        const Text('(গ্রস প্রফিট - পরিচালন ব্যয়)', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                    Text(
                      '৳${currencyFormat.format(netProfit)}',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: netProfit >= 0 ? AppTheme.success : AppTheme.danger,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Recent Transactions Count
            Text(
              'সর্বশেষ চালান সংখ্যা: ${store.sales.length} টি  |  খরচ ভাউচার: ${store.expenses.length} টি',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required double amount,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              Icon(icon, color: color, size: 20),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '৳${currencyFormat.format(amount)}',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}
