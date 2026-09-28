import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/sale.dart';
import '../../theme/app_theme.dart';
import '../../widgets/invoice_preview_sheet.dart';

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
    showInvoicePreview(context, sale, isAdmin: isAdmin);
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
                _filterChip('all', 'সব', context),
                const SizedBox(width: 8),
                _filterChip('due', 'বাকি আছে', context),
                const SizedBox(width: 8),
                _filterChip('paid', 'পরিশোধিত', context),
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

  Widget _filterChip(String value, String label, BuildContext context) {
    final selected = _filter == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 12, color: selected ? Colors.white : AppTheme.textDark)),
      selected: selected,
      selectedColor: Theme.of(context).colorScheme.primary,
      onSelected: (_) => setState(() => _filter = value),
    );
  }
}
