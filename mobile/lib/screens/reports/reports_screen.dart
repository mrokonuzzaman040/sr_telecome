import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/expense.dart';
import '../../theme/app_theme.dart';
import '../../widgets/section_header.dart';
import '../invoices/invoices_list_screen.dart';
import '../returns/returns_screen.dart';

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
        title: const Text('হিসাব-নিকাশ ও রিপোর্ট', maxLines: 1, overflow: TextOverflow.ellipsis),
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
            icon: const Icon(Icons.assignment_return_outlined),
            tooltip: 'রিটার্ন ও এক্সচেঞ্জ',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ReturnsScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'রিফ্রেশ',
            onPressed: () => store.loadAllData(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddExpenseDialog,
        icon: const Icon(Icons.add),
        label: const Text('খরচ যোগ করুন'),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          // Content width is capped on tablets so cards never stretch into
          // unreadable, unevenly spaced rows.
          final horizontalPadding = constraints.maxWidth >= 600 ? 20.0 : 14.0;
          final contentWidth = math.min(constraints.maxWidth, 760.0);

          return SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(horizontalPadding, 16, horizontalPadding, 0),
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: contentWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'বিক্রয় ও ক্যাশ সারসংক্ষেপ',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    _buildMetricGrid([
                      (
                        title: 'মোট বিক্রয় (বিক্রিত মূল্য)',
                        amount: totalSalesAmount,
                        color: Theme.of(context).colorScheme.primary,
                        icon: Icons.point_of_sale,
                      ),
                      (
                        title: 'মোট সংগৃহীত নগদ টাকা',
                        amount: totalPaidAmount,
                        color: AppTheme.success,
                        icon: Icons.payments,
                      ),
                      (
                        title: 'বিক্রয় পরবর্তী নতুন বকেয়া (Due)',
                        amount: totalDueAmount,
                        color: AppTheme.danger,
                        icon: Icons.receipt_long,
                      ),
                    ], contentWidth),

                    const SizedBox(height: 24),

                    // Financial & Profit Section (Protected)
                    SectionHeader(
                      title: 'নিট লাভ-ক্ষতি ও ব্যয় বিবরণী',
                      action: hasAdminAccess
                          ? null
                          : TextButton.icon(
                              onPressed: _promptAdminPin,
                              icon: const Icon(Icons.lock_open, size: 16),
                              label: const Text('আনলক করুন'),
                              style: TextButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                              ),
                            ),
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
                              textAlign: TextAlign.center,
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
                      _buildMetricGrid([
                        (
                          title: 'মোট গ্রস প্রফিট',
                          amount: totalGrossProfit,
                          color: Colors.indigo,
                          icon: Icons.trending_up,
                        ),
                        (
                          title: 'মোট দোকানের খরচ',
                          amount: totalExpenses,
                          color: Colors.deepOrange,
                          icon: Icons.money_off,
                        ),
                      ], contentWidth),
                      const SizedBox(height: 12),
                      _buildNetProfitCard(netProfit),
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
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    color: AppTheme.danger.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.account_balance_wallet_outlined,
                                    size: 17,
                                    color: AppTheme.danger,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        e.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          height: 1.25,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${kExpenseCategoryLabels[e.category] ?? e.category} · ${e.date}',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          color: Colors.grey.shade600,
                                          height: 1.2,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  '৳${currencyFormat.format(e.amount)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.danger,
                                    fontSize: 14,
                                    height: 1.25,
                                  ),
                                  maxLines: 1,
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                    const SizedBox(height: 24),

                    // Recent Transactions Count
                    Text(
                      'সর্বশেষ চালান সংখ্যা: ${store.sales.length} টি  |  খরচ ভাউচার: ${store.expenses.length} টি',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    SizedBox(height: 80 + MediaQuery.paddingOf(context).bottom),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  /// Lays metric cards out in 1 / 2 / 3 columns and guarantees every card in a
  /// row shares the same height, so titles never wrap into ragged double lines.
  Widget _buildMetricGrid(
    List<({String title, double amount, Color color, IconData icon})> metrics,
    double availableWidth,
  ) {
    final columns = availableWidth >= 560 ? 3 : 2;
    const spacing = 12.0;

    final rows = <Widget>[];
    for (var i = 0; i < metrics.length; i += columns) {
      final chunk = metrics.skip(i).take(columns).toList();
      rows.add(
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var c = 0; c < columns; c++) ...[
                if (c > 0) const SizedBox(width: spacing),
                Expanded(
                  child: c < chunk.length
                      ? _buildMetricCard(
                          title: chunk[c].title,
                          amount: chunk[c].amount,
                          color: chunk[c].color,
                          icon: chunk[c].icon,
                        )
                      : const SizedBox.shrink(),
                ),
              ],
            ],
          ),
        ),
      );
      if (i + columns < metrics.length) rows.add(const SizedBox(height: spacing));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: rows);
  }

  Widget _buildNetProfitCard(double netProfit) {
    final isProfit = netProfit >= 0;
    final accent = isProfit ? AppTheme.success : AppTheme.danger;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isProfit ? Colors.green.shade50 : Colors.red.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isProfit ? Colors.green.shade300 : Colors.red.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          // Stacks the amount under the label on narrow phones so long Bengali
          // headings never get squeezed into a clipped two-line block.
          final isCompact = constraints.maxWidth < 300;
          final label = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isProfit ? 'চূড়ান্ত নিট মুনাফা (Net Profit)' : 'মোট লোকসান (Net Loss)',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: accent,
                  height: 1.3,
                ),
              ),
              const Text(
                '(গ্রস প্রফিট - পরিচালন ব্যয়)',
                style: TextStyle(fontSize: 11, color: Colors.grey, height: 1.3),
              ),
            ],
          );
          final amount = Text(
            '৳${currencyFormat.format(netProfit)}',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: accent,
              height: 1.2,
            ),
            maxLines: 1,
            softWrap: false,
          );

          if (isCompact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                label,
                const SizedBox(height: 6),
                FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: amount),
              ],
            );
          }
          return Row(
            children: [
              Expanded(child: label),
              const SizedBox(width: 12),
              Flexible(child: FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerRight, child: amount)),
            ],
          );
        },
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
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade700,
                    height: 1.25,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6),
              Icon(icon, color: color, size: 18),
            ],
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              '৳${currencyFormat.format(amount)}',
              maxLines: 1,
              softWrap: false,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color, height: 1.2),
            ),
          ),
        ],
      ),
    );
  }
}
