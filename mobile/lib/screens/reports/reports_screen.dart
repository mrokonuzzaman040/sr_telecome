import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/expense.dart';
import '../../theme/app_theme.dart';
import '../invoices/invoices_list_screen.dart';

const Map<String, String> kExpenseCategoryLabels = {
  'rent': 'ভাড়া',
  'electricity': 'বিদ্যুৎ বিল',
  'staff': 'স্টাফ বেতন',
  'transport': 'যাতায়াত',
  'entertainment': 'আপ্যায়ন',
  'stationery_use': 'স্টেশনারি ব্যবহার',
  'other': 'অন্যান্য',
};

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
    bool isVerifying = false;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
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
                  labelText: '৪ ডিজিট এডমিন পিন',
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
              onPressed: isVerifying
                  ? null
                  : () async {
                      setModalState(() => isVerifying = true);
                      final auth = Provider.of<AuthProvider>(context, listen: false);
                      final ok = await auth.verifyAdminPin(pinController.text);
                      if (ok) {
                        setState(() => _adminUnlocked = true);
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('এডমিন এক্সেস অনুমোদিত হয়েছে'), backgroundColor: AppTheme.success),
                          );
                        }
                      } else {
                        setModalState(() => isVerifying = false);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('ভুল পিন কোড!'), backgroundColor: AppTheme.danger),
                          );
                        }
                      }
                    },
              child: isVerifying
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('আনলক করুন'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddExpenseDialog() {
    final titleController = TextEditingController();
    final amountController = TextEditingController();
    final notesController = TextEditingController();
    String category = 'other';
    DateTime date = DateTime.now();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          title: const Text('নতুন খরচ যোগ করুন'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(labelText: 'শিরোনাম', prefixIcon: Icon(Icons.title)),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  decoration: const InputDecoration(labelText: 'ক্যাটাগরি', prefixIcon: Icon(Icons.category_outlined)),
                  items: kExpenseCategoryLabels.entries
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                      .toList(),
                  onChanged: (val) => setModalState(() => category = val ?? 'other'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'পরিমাণ (৳)', prefixIcon: Icon(Icons.payments_outlined)),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: date,
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2100),
                    );
                    if (picked != null) setModalState(() => date = picked);
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(labelText: 'তারিখ', prefixIcon: Icon(Icons.calendar_today_outlined)),
                    child: Text(DateFormat('yyyy-MM-dd').format(date)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: notesController,
                  decoration: const InputDecoration(labelText: 'নোট (ঐচ্ছিক)', prefixIcon: Icon(Icons.note_outlined)),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('বাতিল'),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final amount = double.tryParse(amountController.text) ?? 0.0;
                      if (titleController.text.trim().isEmpty || amount <= 0) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('শিরোনাম ও সঠিক পরিমাণ দিন'), backgroundColor: AppTheme.danger),
                        );
                        return;
                      }
                      setModalState(() => isSubmitting = true);
                      try {
                        final store = Provider.of<StoreProvider>(context, listen: false);
                        await store.addExpense(Expense(
                          id: 'exp-${DateTime.now().millisecondsSinceEpoch}',
                          title: titleController.text.trim(),
                          category: category,
                          amount: amount,
                          date: DateFormat('yyyy-MM-dd').format(date),
                          notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
                        ));
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('খরচ সফলভাবে যোগ হয়েছে'), backgroundColor: AppTheme.success),
                          );
                        }
                      } catch (e) {
                        setModalState(() => isSubmitting = false);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('ত্রুটি: $e'), backgroundColor: AppTheme.danger),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('সংরক্ষণ করুন'),
            ),
          ],
        ),
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
    final recentExpenses = store.expenses.take(10).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('হিসাব-নিকাশ ও রিপোর্ট'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long_outlined),
            tooltip: 'চালান তালিকা',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const InvoicesListScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => store.loadAllData(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddExpenseDialog,
        icon: const Icon(Icons.add),
        label: const Text('খরচ যোগ করুন'),
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
                      label: const Text('এডমিন পিন দিন'),
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

            // Expense Log
            const Text(
              'সাম্প্রতিক খরচসমূহ',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            if (recentExpenses.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(child: Text('কোন খরচ যোগ করা হয়নি', style: TextStyle(color: Colors.grey))),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: recentExpenses.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (ctx, index) {
                  final e = recentExpenses[index];
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(e.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 2),
                              Text(
                                '${kExpenseCategoryLabels[e.category] ?? e.category} · ${e.date}',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '৳${currencyFormat.format(e.amount)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.danger, fontSize: 14),
                        ),
                      ],
                    ),
                  );
                },
              ),

            const SizedBox(height: 80),

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
