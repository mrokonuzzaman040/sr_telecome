import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../models/return_record.dart';
import '../../theme/app_theme.dart';
import 'return_form_screen.dart';

class ReturnsScreen extends StatelessWidget {
  const ReturnsScreen({super.key});

  void _openDetail(BuildContext context, ReturnRecord r) {
    final currency = NumberFormat('#,##0', 'en_US');
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(r.invoiceNo ?? 'চালান ছাড়া রিটার্ন', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(r.customerName, style: TextStyle(color: Colors.grey.shade600)),
            const Divider(height: 24),
            if (r.returnedItems.isNotEmpty) ...[
              const Text('ফেরত পণ্য', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              ...r.returnedItems.map((i) => Text('${i.productName} x${i.quantity} = ৳${currency.format(i.total)}', style: const TextStyle(fontSize: 13))),
              const SizedBox(height: 10),
            ],
            if (r.replacementItems.isNotEmpty) ...[
              const Text('পরিবর্তিত পণ্য', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              ...r.replacementItems.map((i) => Text('${i.productName} x${i.quantity} = ৳${currency.format(i.total)}', style: const TextStyle(fontSize: 13))),
              const SizedBox(height: 10),
            ],
            Text('কারণ: ${r.reason}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 8),
            Text(
              r.priceDifference == 0
                  ? 'সমন্বয়ের প্রয়োজন হয়নি'
                  : r.priceDifference > 0
                      ? 'কাস্টমার বাড়তি দিয়েছেন: ৳${currency.format(r.priceDifference)}'
                      : 'কাস্টমারকে ফেরত দেওয়া হয়েছে: ৳${currency.format(r.priceDifference.abs())}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final currency = NumberFormat('#,##0', 'en_US');

    return Scaffold(
      appBar: AppBar(
        title: const Text('রিটার্ন ও এক্সচেঞ্জ'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => store.loadAllData()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ReturnFormScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('নতুন রিটার্ন'),
      ),
      body: store.isLoading
          ? const Center(child: CircularProgressIndicator())
          : store.returns.isEmpty
              ? const Center(child: Text('কোন রিটার্ন রেকর্ড নেই', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: store.returns.length,
                  itemBuilder: (ctx, index) {
                    final r = store.returns[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => _openDetail(context, r),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Icon(
                                r.returnType == 'exchange' ? Icons.swap_horiz : Icons.assignment_return_outlined,
                                color: AppTheme.secondary,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(r.invoiceNo ?? 'চালান ছাড়া', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    Text(r.customerName, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                  ],
                                ),
                              ),
                              Text(
                                r.priceDifference == 0 ? '-' : '৳${currency.format(r.priceDifference.abs())}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: r.priceDifference > 0 ? AppTheme.danger : AppTheme.success,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
