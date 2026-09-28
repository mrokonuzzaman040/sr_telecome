import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/customer.dart';
import '../../models/product.dart';
import '../../models/sale.dart';
import '../../models/return_record.dart';
import '../../providers/store_provider.dart';
import '../../theme/app_theme.dart';
import '../../services/pdf_invoice_service.dart';
import '../pos/barcode_scanner_screen.dart';

class ReturnFormScreen extends StatefulWidget {
  const ReturnFormScreen({super.key});

  @override
  State<ReturnFormScreen> createState() => _ReturnFormScreenState();
}

class _ReturnFormScreenState extends State<ReturnFormScreen> {
  final currencyFormat = NumberFormat('#,##0', 'en_US');
  final TextEditingController _reasonController = TextEditingController();

  // Return Type: 'exchange' | 'refund' | 'replacement'
  String _returnType = 'exchange';

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

  double get _totalReplacementValue {
    if (_returnType == 'replacement') {
      return _totalRefundCredit;
    }
    if (_returnType == 'refund') {
      return 0.0;
    }
    return _replacementItems.fold(0.0, (sum, i) => sum + i.total);
  }

  double get _priceDifference {
    if (_returnType == 'replacement') return 0.0;
    return _totalReplacementValue - _totalRefundCredit;
  }

  double _getDefaultCommissionRate() {
    if (_selectedCustomer != null && _selectedCustomer!.type == 'agent') {
      return _selectedCustomer!.defaultCommissionRate ?? 30.0;
    }
    return 0.0;
  }

  // --- Add from Original Invoice ---
  void _addFromInvoice(SaleItem item) {
    final existingIdx = _returnedItems.indexWhere((i) => i.productId == item.productId);
    if (existingIdx != -1) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"${item.productName}" ইতোমধ্যে ফেরত তালিকায় আছে'),
          backgroundColor: AppTheme.secondary,
        ),
      );
      return;
    }

    final mrp = item.mrp > 0 ? item.mrp : item.unitPrice;
    final unitPrice = item.unitPrice;
    final commissionRate = item.commissionRate ?? (mrp > 0 ? ((mrp - unitPrice) / mrp * 100) : 0.0);

    setState(() {
      _returnedItems.add(ReturnItem(
        productId: item.productId,
        productName: item.productName,
        quantity: 1,
        unitPrice: unitPrice,
        mrp: mrp,
        commissionRate: commissionRate,
        unitDiscount: mrp - unitPrice,
        originalSoldQty: item.quantity,
      ));
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${item.productName} ফেরত তালিকায় যুক্ত হয়েছে'),
        backgroundColor: AppTheme.success,
        duration: const Duration(seconds: 1),
      ),
    );
  }

  // --- Pick Product from Catalog ---
  void _pickCatalogItem({required bool isReplacement}) {
    final store = Provider.of<StoreProvider>(context, listen: false);
    final searchController = TextEditingController();
    double defaultComm = _getDefaultCommissionRate();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final query = searchController.text.trim().toLowerCase();
          final filtered = store.products.where((p) {
            if (query.isEmpty) return true;
            return p.name.toLowerCase().contains(query) ||
                (p.bengaliName?.toLowerCase().contains(query) == true) ||
                p.barcode.toLowerCase().contains(query) ||
                (p.publisher?.toLowerCase().contains(query) == true);
          }).toList();

          return Container(
            height: MediaQuery.of(context).size.height * 0.8,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          isReplacement ? 'পরিবর্তিত বই নির্বাচন করুন' : 'ফেরতযোগ্য বই নির্বাচন করুন',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primary),
                        onPressed: () async {
                          final barcode = await Navigator.push<String>(
                            context,
                            MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
                          );
                          if (barcode != null && barcode.isNotEmpty) {
                            searchController.text = barcode;
                            setModalState(() {});
                          }
                        },
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: TextField(
                    controller: searchController,
                    decoration: InputDecoration(
                      hintText: 'বইয়ের নাম, বারকোড বা প্রকাশনী খুঁজুন...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                searchController.clear();
                                setModalState(() {});
                              },
                            )
                          : null,
                      isDense: true,
                    ),
                    onChanged: (_) => setModalState(() {}),
                  ),
                ),
                const Divider(),
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(child: Text('কোন পণ্য পাওয়া যায়নি', style: TextStyle(color: Colors.grey)))
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (ctx, index) {
                            final p = filtered[index];
                            final unitDiscount = (p.mrp * defaultComm) / 100.0;
                            final calculatedPrice = (p.mrp - unitDiscount).clamp(0.0, double.infinity);

                            return ListTile(
                              title: Text(p.displayName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              subtitle: Text(
                                'গায়ের মূল্য: ৳${currencyFormat.format(p.mrp)}  |  স্টক: ${p.stockQty} টি',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                              trailing: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  minimumSize: const Size(60, 32),
                                ),
                                child: const Text('যোগ করুন', style: TextStyle(fontSize: 12)),
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  _addItemDirect(
                                    product: p,
                                    isReplacement: isReplacement,
                                    commRate: defaultComm,
                                    unitPrice: calculatedPrice,
                                  );
                                },
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _addItemDirect({
    required Product product,
    required bool isReplacement,
    required double commRate,
    required double unitPrice,
  }) {
    final targetList = isReplacement ? _replacementItems : _returnedItems;
    final existingIdx = targetList.indexWhere((i) => i.productId == product.id);

    setState(() {
      if (existingIdx != -1) {
        final current = targetList[existingIdx];
        targetList[existingIdx] = ReturnItem(
          productId: current.productId,
          productName: current.productName,
          quantity: current.quantity + 1,
          unitPrice: current.unitPrice,
          mrp: current.mrp,
          commissionRate: current.commissionRate,
          unitDiscount: current.unitDiscount,
          originalSoldQty: current.originalSoldQty,
        );
      } else {
        targetList.add(ReturnItem(
          productId: product.id,
          productName: product.displayName,
          quantity: 1,
          unitPrice: unitPrice,
          mrp: product.mrp,
          commissionRate: commRate,
          unitDiscount: product.mrp - unitPrice,
        ));
      }
    });
  }

  void _updateItemQuantity(List<ReturnItem> list, int index, int delta) {
    setState(() {
      final item = list[index];
      final newQty = item.quantity + delta;
      if (newQty <= 0) {
        list.removeAt(index);
      } else {
        if (item.originalSoldQty != null && newQty > item.originalSoldQty!) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('চালানে বিক্রিত পরিমাণ সর্বোচ্চ ${item.originalSoldQty} টি'),
              backgroundColor: AppTheme.danger,
            ),
          );
          return;
        }
        list[index] = ReturnItem(
          productId: item.productId,
          productName: item.productName,
          quantity: newQty,
          unitPrice: item.unitPrice,
          mrp: item.mrp,
          commissionRate: item.commissionRate,
          unitDiscount: item.unitDiscount,
          originalSoldQty: item.originalSoldQty,
        );
      }
    });
  }

  void _showEditPriceDialog(List<ReturnItem> list, int index) {
    final item = list[index];
    final commCtrl = TextEditingController(text: (item.commissionRate ?? 0).toStringAsFixed(0));
    final priceCtrl = TextEditingController(text: item.unitPrice.toStringAsFixed(0));
    final mrp = item.mrp ?? item.unitPrice;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${item.productName} - রেট সম্পাদনা', style: const TextStyle(fontSize: 15)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('গায়ের মূল্য (MRP): ৳${mrp.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: commCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'কমিশন হার (%)', suffixText: '%'),
              onChanged: (val) {
                final rate = double.tryParse(val) ?? 0.0;
                final newPrice = (mrp - (mrp * rate / 100.0)).clamp(0.0, double.infinity);
                priceCtrl.text = newPrice.toStringAsFixed(0);
              },
            ),
            const SizedBox(height: 10),
            TextField(
              controller: priceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'একক দর (Unit Price)', prefixText: '৳ '),
              onChanged: (val) {
                final p = double.tryParse(val) ?? 0.0;
                if (mrp > 0) {
                  final rate = ((mrp - p) / mrp * 100.0).clamp(0.0, 100.0);
                  commCtrl.text = rate.toStringAsFixed(0);
                }
              },
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('বাতিল')),
          ElevatedButton(
            onPressed: () {
              final newRate = double.tryParse(commCtrl.text) ?? 0.0;
              final newPrice = double.tryParse(priceCtrl.text) ?? item.unitPrice;
              setState(() {
                list[index] = ReturnItem(
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  unitPrice: newPrice,
                  mrp: mrp,
                  commissionRate: newRate,
                  unitDiscount: mrp - newPrice,
                  originalSoldQty: item.originalSoldQty,
                );
              });
              Navigator.pop(ctx);
            },
            child: const Text('সংরক্ষণ'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (_returnedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('অন্তত একটি ফেরত পণ্য যোগ করুন'), backgroundColor: AppTheme.danger),
      );
      return;
    }

    if (_returnType == 'exchange' && _replacementItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('বিনিময়ে নেওয়ার জন্য অন্তত একটি পরিবর্তিত বই যোগ করুন'), backgroundColor: AppTheme.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final store = Provider.of<StoreProvider>(context, listen: false);

      List<ReturnItem> finalReplacement = [];
      if (_returnType == 'replacement') {
        finalReplacement = _returnedItems.map((r) => ReturnItem(
          productId: r.productId,
          productName: r.productName,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          mrp: r.mrp,
          commissionRate: r.commissionRate,
        )).toList();
      } else if (_returnType == 'exchange') {
        finalReplacement = _replacementItems;
      }

      double adjustedDifference = _priceDifference;
      if (_adjustmentType == 'cash' || _selectedCustomer == null) {
        adjustedDifference = 0.0;
      }

      final record = ReturnRecord(
        id: 'ret-${DateTime.now().millisecondsSinceEpoch}',
        invoiceId: _selectedInvoice?.id,
        invoiceNo: _selectedInvoice?.invoiceNo,
        customerId: _selectedCustomer?.id,
        customerName: _selectedCustomer?.name ?? 'Walk-in Retail Customer',
        customerPhone: _selectedCustomer?.phone,
        returnType: _returnType,
        returnedItems: _returnedItems,
        replacementItems: finalReplacement,
        adjustmentType: _adjustmentType,
        reason: _reasonController.text.trim().isEmpty ? 'General Return' : _reasonController.text.trim(),
        priceDifference: adjustedDifference,
        createdAt: DateTime.now().toIso8601String(),
      );

      final created = await store.submitReturn(record);

      if (!mounted) return;
      Navigator.pop(context);

      // Show confirmation dialog with 2 Print Options
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: AppTheme.success, size: 52),
          title: const Text('রিটার্ন সফলভাবে সংরক্ষিত হয়েছে'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('ভাউচার নং: #${created.id.substring(created.id.length > 8 ? created.id.length - 8 : 0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('ধরণ: ${_returnTypeLabel(created.returnType)}'),
              Text('মোট ফেরত মূল্য: ৳${currencyFormat.format(created.totalRefundCredit)}'),
              if (created.totalReplacementValue > 0)
                Text('পরিবর্তিত মূল্য: ৳${currencyFormat.format(created.totalReplacementValue)}'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('ঠিক আছে'),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.print, size: 18),
              label: const Text('১. প্রিন্ট'),
              onPressed: () {
                Navigator.pop(ctx);
                PdfInvoiceService.printReturn(context, created);
              },
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.picture_as_pdf, size: 18),
              label: const Text('২. PDF সেভ / শেয়ার'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
              onPressed: () {
                Navigator.pop(ctx);
                PdfInvoiceService.shareReturnPdf(context, created);
              },
            ),
          ],
        ),
      );
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

  String _returnTypeLabel(String type) {
    switch (type) {
      case 'exchange':
        return 'বিনিময় (Exchange)';
      case 'replacement':
        return 'একই বই পরিবর্তন (Replacement)';
      default:
        return 'মূল্য ফেরত (Refund)';
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final customerInvoices = _selectedCustomer == null
        ? <Sale>[]
        : store.sales.where((s) => s.customerId == _selectedCustomer!.id).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('নতুন রিটার্ন / এক্সচেঞ্জ'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'রিটার্ন ইতিহাস',
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      backgroundColor: AppTheme.backgroundLight,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Return Type Selector
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'exchange', label: Text('বিনিময় (Exchange)', style: TextStyle(fontSize: 12))),
                ButtonSegment(value: 'refund', label: Text('মূল্য ফেরত (Refund)', style: TextStyle(fontSize: 12))),
                ButtonSegment(value: 'replacement', label: Text('একই বই পরিবর্তন', style: TextStyle(fontSize: 12))),
              ],
              selected: {_returnType},
              onSelectionChanged: (val) => setState(() => _returnType = val.first),
            ),
          ),
          const SizedBox(height: 14),

          // 2. Customer & Original Invoice Selector
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.person_pin, size: 18, color: AppTheme.primary),
                    SizedBox(width: 6),
                    Text('গ্রাহক ও মূল চালান তথ্য', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<Customer?>(
                  initialValue: _selectedCustomer,
                  decoration: const InputDecoration(
                    labelText: 'কাস্টমার নির্বাচন করুন (ঐচ্ছিক)',
                    prefixIcon: Icon(Icons.person_outline),
                    isDense: true,
                  ),
                  hint: const Text('সাধারণ ওয়াক-ইন ক্রেতা (Walk-in)'),
                  items: [
                    const DropdownMenuItem<Customer?>(value: null, child: Text('সাধারণ ওয়াক-ইন ক্রেতা (Walk-in)')),
                    ...store.customers.map((c) => DropdownMenuItem<Customer?>(
                          value: c,
                          child: Text('${c.name} (${c.type == 'agent' ? 'এজেন্ট' : 'খুচরা'}) - বকেয়া: ৳${c.currentDue.toInt()}'),
                        )),
                  ],
                  onChanged: (c) {
                    setState(() {
                      _selectedCustomer = c;
                      _selectedInvoice = null;
                    });
                  },
                ),

                if (_selectedCustomer != null && customerInvoices.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  DropdownButtonFormField<Sale?>(
                    initialValue: _selectedInvoice,
                    decoration: const InputDecoration(
                      labelText: 'মূল চালান নং (ঐচ্ছিক - চালানের আইটেম সরাসরি যুক্ত করতে)',
                      prefixIcon: Icon(Icons.receipt_long_outlined),
                      isDense: true,
                    ),
                    hint: const Text('চালান নির্বাচন করুন'),
                    items: [
                      const DropdownMenuItem<Sale?>(value: null, child: Text('চালান ছাড়া সরাসরি রিটার্ন')),
                      ...customerInvoices.map((s) => DropdownMenuItem<Sale?>(
                            value: s,
                            child: Text('${s.invoiceNo} (তারিখ: ${s.createdAt.split('T').first} - ৳${s.payableAmount.toInt()})'),
                          )),
                    ],
                    onChanged: (s) => setState(() => _selectedInvoice = s),
                  ),
                ],

                // If invoice selected, show item picker from invoice
                if (_selectedInvoice != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'চালানের পণ্যসমূহ (${_selectedInvoice!.items.length} টি) - যোগ করতে ক্লিক করুন:',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blue.shade900),
                        ),
                        const SizedBox(height: 6),
                        ..._selectedInvoice!.items.map((item) {
                          final alreadyAdded = _returnedItems.any((i) => i.productId == item.productId);
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 3),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${item.productName} (${item.quantity}টি x ৳${item.unitPrice.toInt()})',
                                    style: const TextStyle(fontSize: 12),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: alreadyAdded ? Colors.grey : AppTheme.primary,
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    minimumSize: const Size(60, 28),
                                  ),
                                  onPressed: alreadyAdded ? null : () => _addFromInvoice(item),
                                  child: Text(alreadyAdded ? 'যুক্ত আছে' : '+ ফেরত নিন', style: const TextStyle(fontSize: 11)),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 3. Returned Items Section
          _buildItemSection(
            title: 'ফেরত পণ্যসমূহ (Returned Items)',
            list: _returnedItems,
            isReplacement: false,
            color: Colors.red.shade700,
          ),
          const SizedBox(height: 14),

          // 4. Replacement Items Section (Only for exchange)
          if (_returnType == 'exchange') ...[
            _buildItemSection(
              title: 'পরিবর্তিত নতুন পণ্যসমূহ (Replacement Items)',
              list: _replacementItems,
              isReplacement: true,
              color: Colors.green.shade700,
            ),
            const SizedBox(height: 14),
          ],

          // 5. Return Reason
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('রিটার্নের কারণ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  children: [
                    'ভুল শ্রেণী / বই',
                    'ছেঁড়া / ডিফেক্টিভ বই',
                    'গ্রাহকের পছন্দ পরিবর্তন',
                    'অন্যান্য',
                  ].map((r) {
                    final isSel = _reasonController.text == r;
                    return ChoiceChip(
                      label: Text(r, style: TextStyle(fontSize: 11, color: isSel ? Colors.white : Colors.black87)),
                      selected: isSel,
                      selectedColor: AppTheme.primary,
                      onSelected: (val) {
                        if (val) setState(() => _reasonController.text = r);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _reasonController,
                  decoration: const InputDecoration(
                    hintText: 'কারণ লিখুন...',
                    isDense: true,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 6. Financial Summary Box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Column(
              children: [
                _summaryRow('মোট ফেরত মূল্য (Credit):', _totalRefundCredit),
                if (_returnType == 'exchange')
                  _summaryRow('মোট পরিবর্তিত পণ্যের মূল্য:', _totalReplacementValue),
                const Divider(height: 16),
                _summaryRow(
                  _priceDifference > 0
                      ? 'গ্রাহক বাড়তি পরিশোধ করবে:'
                      : (_priceDifference < 0 ? 'দোকান ফেরত বা সমন্বয় করবে:' : 'হিসাব সমান সমান:'),
                  _priceDifference.abs(),
                  bold: true,
                  color: _priceDifference > 0 ? AppTheme.danger : AppTheme.success,
                ),
              ],
            ),
          ),

          // 7. Settlement Method (when difference != 0 and customer is selected)
          if (_priceDifference != 0 && _selectedCustomer != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('পার্থক্য সমন্বয় পদ্ধতি', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'due_deduct', label: Text('বাকির খাতায় সমন্বয়', style: TextStyle(fontSize: 12))),
                      ButtonSegment(value: 'cash', label: Text('নগদ লেনদেন / মিটমাট', style: TextStyle(fontSize: 12))),
                    ],
                    selected: {_adjustmentType},
                    onSelectionChanged: (val) => setState(() => _adjustmentType = val.first),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 20),

          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isSubmitting || _returnedItems.isEmpty ? null : _submit,
              child: _isSubmitting
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('রিটার্ন নিশ্চিত করুন (Confirm Return)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildItemSection({
    required String title,
    required List<ReturnItem> list,
    required bool isReplacement,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color)),
              TextButton.icon(
                icon: const Icon(Icons.add_circle_outline, size: 16),
                label: const Text('বই যোগ করুন'),
                onPressed: () => _pickCatalogItem(isReplacement: isReplacement),
              ),
            ],
          ),
          if (list.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: Text('কোন বই যোগ করা হয়নি', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: list.length,
              separatorBuilder: (_, __) => const Divider(height: 8),
              itemBuilder: (ctx, index) {
                final item = list[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.productName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            const SizedBox(height: 2),
                            InkWell(
                              onTap: () => _showEditPriceDialog(list, index),
                              child: Row(
                                children: [
                                  Text(
                                    'গায়ের দর: ৳${item.mrp?.toInt() ?? item.unitPrice.toInt()} | বিক্রয়/ফেরত: ৳${item.unitPrice.toInt()}${item.commissionRate != null ? ' (${item.commissionRate!.toInt()}%)' : ''}',
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.edit, size: 12, color: AppTheme.primary),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Qty
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline, size: 20, color: Colors.grey),
                            onPressed: () => _updateItemQuantity(list, index, -1),
                          ),
                          Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline, size: 20, color: AppTheme.primary),
                            onPressed: () => _updateItemQuantity(list, index, 1),
                          ),
                        ],
                      ),
                      SizedBox(
                        width: 75,
                        child: Text(
                          '৳${currencyFormat.format(item.total)}',
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
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
            style: TextStyle(
              fontSize: bold ? 16 : 13,
              fontWeight: bold ? FontWeight.bold : FontWeight.normal,
              color: color ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
