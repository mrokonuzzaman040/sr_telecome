import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/customer.dart';
import '../../models/sale.dart';
import '../../models/return_record.dart';
import '../../providers/store_provider.dart';
import '../../theme/app_theme.dart';

class ReturnFormScreen extends StatefulWidget {
  const ReturnFormScreen({super.key});

  @override
  State<ReturnFormScreen> createState() => _ReturnFormScreenState();
}

class _ReturnFormScreenState extends State<ReturnFormScreen> {
  final currencyFormat = NumberFormat('#,##0', 'en_US');
  final TextEditingController _reasonController = TextEditingController();

  Customer? _selectedCustomer;
  Sale? _selectedInvoice;
  final List<ReturnItem> _returnedItems = [];
  final List<ReturnItem> _replacementItems = [];
  String _adjustmentType = 'due_deduct'; // 'cash' | 'due_deduct'
  bool _isSubmitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  double get _totalRefundCredit => _returnedItems.fold(0.0, (sum, i) => sum + i.total);
  double get _totalReplacementValue => _replacementItems.fold(0.0, (sum, i) => sum + i.total);
  double get _priceDifference => _totalReplacementValue - _totalRefundCredit;

  void _pickItem(List<ReturnItem> targetList) {
    final store = Provider.of<StoreProvider>(context, listen: false);
    final searchController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final query = searchController.text.trim().toLowerCase();
          final filtered = store.products.where((p) {
            if (query.isEmpty) return true;
            return p.name.toLowerCase().contains(query) ||
                (p.bengaliName?.toLowerCase().contains(query) == true) ||
                p.barcode.toLowerCase().contains(query);
          }).toList();

          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
            child: SizedBox(
              height: MediaQuery.of(context).size.height * 0.7,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: TextField(
                      controller: searchController,
                      decoration: const InputDecoration(
                        hintText: 'পণ্য খুঁজুন...',
                        prefixIcon: Icon(Icons.search),
                        isDense: true,
                      ),
                      onChanged: (_) => setModalState(() {}),
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (ctx, index) {
                        final product = filtered[index];
                        return ListTile(
                          title: Text(product.displayName, style: const TextStyle(fontSize: 14)),
                          subtitle: Text('৳${currencyFormat.format(product.mrp)}', style: const TextStyle(fontSize: 12)),
                          onTap: () {
                            setState(() {
                              final existing = targetList.indexWhere((i) => i.productId == product.id);
                              if (existing != -1) {
                                targetList[existing] = ReturnItem(
                                  productId: product.id,
                                  productName: product.displayName,
                                  quantity: targetList[existing].quantity + 1,
                                  unitPrice: product.mrp,
                                );
                              } else {
                                targetList.add(ReturnItem(
                                  productId: product.id,
                                  productName: product.displayName,
                                  quantity: 1,
                                  unitPrice: product.mrp,
                                ));
                              }
                            });
                            Navigator.pop(ctx);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _updateQty(List<ReturnItem> list, int index, int delta) {
    setState(() {
      final item = list[index];
      final newQty = item.quantity + delta;
      if (newQty <= 0) {
        list.removeAt(index);
      } else {
        list[index] = ReturnItem(productId: item.productId, productName: item.productName, quantity: newQty, unitPrice: item.unitPrice);
      }
    });
  }

  Future<void> _submit() async {
    if (_returnedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('অন্তত একটি ফেরত পণ্য যোগ করুন'), backgroundColor: AppTheme.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final store = Provider.of<StoreProvider>(context, listen: false);
      final useCustomerLedger = _adjustmentType == 'due_deduct' && _selectedCustomer != null;

      final record = ReturnRecord(
        id: 'ret-${DateTime.now().millisecondsSinceEpoch}',
        invoiceId: _selectedInvoice?.id,
        invoiceNo: _selectedInvoice?.invoiceNo,
        customerId: useCustomerLedger ? _selectedCustomer!.id : null,
        customerName: _selectedCustomer?.name ?? 'Walk-in Retail Customer',
        returnType: _replacementItems.isEmpty ? 'refund' : 'exchange',
        returnedItems: _returnedItems,
        replacementItems: _replacementItems,
        reason: _reasonController.text.trim().isEmpty ? 'General Return' : _reasonController.text.trim(),
        priceDifference: _priceDifference,
      );

      await store.submitReturn(record);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('রিটার্ন সফলভাবে সংরক্ষিত হয়েছে'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('ত্রুটি: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _itemList(String title, List<ReturnItem> list, VoidCallback onAdd) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            TextButton.icon(onPressed: onAdd, icon: const Icon(Icons.add, size: 16), label: const Text('পণ্য যোগ করুন')),
          ],
        ),
        if (list.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('কোন পণ্য যোগ করা হয়নি', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
          )
        else
          ...list.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Expanded(child: Text(item.productName, style: const TextStyle(fontSize: 13))),
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                    onPressed: () => _updateQty(list, index, -1),
                  ),
                  Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, size: 20),
                    onPressed: () => _updateQty(list, index, 1),
                  ),
                  SizedBox(
                    width: 70,
                    child: Text('৳${currencyFormat.format(item.total)}', textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final customerInvoices = _selectedCustomer == null
        ? <Sale>[]
        : store.sales.where((s) => s.customerId == _selectedCustomer!.id).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('নতুন রিটার্ন / এক্সচেঞ্জ')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DropdownButtonFormField<Customer?>(
            initialValue: _selectedCustomer,
            decoration: const InputDecoration(labelText: 'কাস্টমার (ঐচ্ছিক)', prefixIcon: Icon(Icons.person_outline)),
            hint: const Text('ওয়াক-ইন কাস্টমার'),
            items: [
              const DropdownMenuItem<Customer?>(value: null, child: Text('ওয়াক-ইন কাস্টমার')),
              ...store.customers.map((c) => DropdownMenuItem<Customer?>(value: c, child: Text(c.name))),
            ],
            onChanged: (c) => setState(() {
              _selectedCustomer = c;
              _selectedInvoice = null;
            }),
          ),
          if (_selectedCustomer != null && customerInvoices.isNotEmpty) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<Sale?>(
              initialValue: _selectedInvoice,
              decoration: const InputDecoration(labelText: 'মূল চালান (ঐচ্ছিক)', prefixIcon: Icon(Icons.receipt_long_outlined)),
              hint: const Text('চালান নির্বাচন করুন'),
              items: [
                const DropdownMenuItem<Sale?>(value: null, child: Text('চালান ছাড়া')),
                ...customerInvoices.map((s) => DropdownMenuItem<Sale?>(value: s, child: Text(s.invoiceNo))),
              ],
              onChanged: (s) => setState(() => _selectedInvoice = s),
            ),
          ],
          const SizedBox(height: 20),
          _itemList('ফেরত পণ্যসমূহ (Returned)', _returnedItems, () => _pickItem(_returnedItems)),
          const Divider(height: 32),
          _itemList('পরিবর্তিত পণ্যসমূহ (Replacement, ঐচ্ছিক)', _replacementItems, () => _pickItem(_replacementItems)),
          const SizedBox(height: 20),
          TextField(
            controller: _reasonController,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'কারণ', prefixIcon: Icon(Icons.info_outline)),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
            child: Column(
              children: [
                _summaryRow('মোট ফেরত মূল্য', _totalRefundCredit),
                _summaryRow('মোট পরিবর্তিত মূল্য', _totalReplacementValue),
                const Divider(),
                _summaryRow(
                  _priceDifference > 0 ? 'কাস্টমারকে বাড়তি দিতে হবে' : 'কাস্টমারকে ফেরত/জমা দিতে হবে',
                  _priceDifference.abs(),
                  bold: true,
                  color: _priceDifference > 0 ? AppTheme.danger : AppTheme.success,
                ),
              ],
            ),
          ),
          if (_priceDifference != 0 && _selectedCustomer != null) ...[
            const SizedBox(height: 16),
            const Text('সমন্বয় পদ্ধতি', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'due_deduct', label: Text('বাকির খাতায় সমন্বয়')),
                ButtonSegment(value: 'cash', label: Text('নগদ মিটমাট')),
              ],
              selected: {_adjustmentType},
              onSelectionChanged: (val) => setState(() => _adjustmentType = val.first),
            ),
          ],
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : const Text('রিটার্ন সংরক্ষণ করুন'),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, double amount, {bool bold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(
            '৳${currencyFormat.format(amount)}',
            style: TextStyle(fontSize: bold ? 15 : 13, fontWeight: bold ? FontWeight.bold : FontWeight.normal, color: color),
          ),
        ],
      ),
    );
  }
}

