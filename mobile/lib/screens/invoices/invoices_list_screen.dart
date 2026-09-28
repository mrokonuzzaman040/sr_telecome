import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/sale.dart';
import '../../theme/app_theme.dart';

const Map<String, String> kPaymentMethodLabels = {
  'cash': 'ক্যাশ',
  'bkash': 'বিকাশ',
  'nagad': 'নগদ',
  'rocket': 'রকেট',
  'bank': 'ব্যাংক',
  'due': 'বাকি',
};

class InvoicesListScreen extends StatefulWidget {
  const InvoicesListScreen({super.key});

  @override
  State<InvoicesListScreen> createState() => _InvoicesListScreenState();
}

class _InvoicesListScreenState extends State<InvoicesListScreen> {
  final TextEditingController _searchController = TextEditingController();
  final currencyFormat = NumberFormat('#,##0', 'en_US');
  String _filter = 'all'; // all | due | paid

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openInvoiceDetail(Sale sale) {
    final isAdmin = Provider.of<AuthProvider>(context, listen: false).isAdmin;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(16),
          child: ListView(
            controller: scrollController,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(sale.invoiceNo, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: sale.dueAmount > 0 ? Colors.red.shade50 : Colors.green.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      sale.dueAmount > 0 ? 'বাকি আছে' : 'পরিশোধিত',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: sale.dueAmount > 0 ? AppTheme.danger : AppTheme.success,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(sale.createdAt.split('T').first, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
              const Divider(height: 24),
              Row(
                children: [
                  Icon(sale.customerType == 'agent' ? Icons.storefront : Icons.person, size: 16, color: AppTheme.primary),
                  const SizedBox(width: 6),
                  Text(sale.customerName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  if (sale.customerPhone != null) ...[
                    const SizedBox(width: 8),
                    Text(sale.customerPhone!, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ],
              ),
              const SizedBox(height: 16),
              const Text('পণ্যসমূহ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              ...sale.items.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Text(item.productName, style: const TextStyle(fontSize: 13)),
                      ),
                      Expanded(
                        child: Text('${item.quantity} x ৳${currencyFormat.format(item.unitPrice)}',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      ),
                      Text('৳${currencyFormat.format(item.total)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                ),
              ),
              const Divider(height: 24),
              _summaryRow('সাবটোটাল', sale.subtotal),
              _summaryRow('ছাড়', sale.totalDiscount, color: AppTheme.danger),
              _summaryRow('প্রদেয় মোট', sale.payableAmount, bold: true),
              _summaryRow('পরিশোধিত', sale.paidAmount, color: AppTheme.success),
              _summaryRow('বাকি', sale.dueAmount, color: sale.dueAmount > 0 ? AppTheme.danger : Colors.grey),
              if (isAdmin) ...[
                const Divider(height: 24),
                _summaryRow('ক্রয়মূল্য (Cost)', sale.totalCost, color: Colors.grey),
                _summaryRow('গ্রস প্রফিট', sale.grossProfit, color: Colors.indigo, bold: true),
              ],
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(10)),
                child: Row(
                  children: [
                    const Icon(Icons.payments_outlined, size: 16, color: AppTheme.primary),
                    const SizedBox(width: 8),
                    Text('পেমেন্ট মাধ্যম: ${kPaymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _summaryRow(String label, double amount, {Color? color, bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
          Text(
            '৳${currencyFormat.format(amount)}',
            style: TextStyle(
              fontSize: bold ? 15 : 13,
              fontWeight: bold ? FontWeight.bold : FontWeight.normal,
              color: color ?? AppTheme.textDark,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);

    final query = _searchController.text.trim().toLowerCase();
    final filtered = store.sales.where((s) {
      if (_filter == 'due' && s.dueAmount <= 0) return false;
      if (_filter == 'paid' && s.dueAmount > 0) return false;
      if (query.isEmpty) return true;
      return s.invoiceNo.toLowerCase().contains(query) ||
          s.customerName.toLowerCase().contains(query) ||
          (s.customerPhone?.contains(query) ?? false);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('চালান তালিকা'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => store.loadAllData(),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'চালান নং, কাস্টমারের নাম বা ফোন খুঁজুন...',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                _filterChip('all', 'সব'),
                const SizedBox(width: 8),
                _filterChip('due', 'বাকি আছে'),
                const SizedBox(width: 8),
                _filterChip('paid', 'পরিশোধিত'),
              ],
            ),
          ),
          Expanded(
            child: store.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(child: Text('কোন চালান পাওয়া যায়নি', style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        itemCount: filtered.length,
                        itemBuilder: (ctx, index) {
                          final sale = filtered[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => _openInvoiceDetail(sale),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(sale.invoiceNo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${sale.customerName} · ${sale.createdAt.split('T').first}',
                                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '৳${currencyFormat.format(sale.payableAmount)}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                        Text(
                                          sale.dueAmount > 0 ? 'বাকি ৳${currencyFormat.format(sale.dueAmount)}' : 'পরিশোধিত',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: sale.dueAmount > 0 ? AppTheme.danger : AppTheme.success,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String value, String label) {
    final selected = _filter == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 12, color: selected ? Colors.white : AppTheme.textDark)),
      selected: selected,
      selectedColor: AppTheme.primary,
      onSelected: (_) => setState(() => _filter = value),
    );
  }
}
