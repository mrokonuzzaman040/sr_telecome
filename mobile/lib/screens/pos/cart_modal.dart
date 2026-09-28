import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../models/customer.dart';
import '../../models/sale.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/invoice_preview_sheet.dart';
import '../returns/return_form_screen.dart';

class CartModal extends StatefulWidget {
  const CartModal({super.key});

  @override
  State<CartModal> createState() => _CartModalState();
}

class _CartModalState extends State<CartModal> {
  final currencyFormat = NumberFormat('#,##0', 'en_US');
  final TextEditingController _paidController = TextEditingController();
  final TextEditingController _agentCommController = TextEditingController();
  final TextEditingController _retailDiscountController = TextEditingController();
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    final store = Provider.of<StoreProvider>(context, listen: false);
    _paidController.text = store.cartPayable.toStringAsFixed(0);
    _agentCommController.text = store.agentCommissionRate.toInt().toString();
    _retailDiscountController.text = store.retailDiscountValue.toInt().toString();
  }

  @override
  void dispose() {
    _paidController.dispose();
    _agentCommController.dispose();
    _retailDiscountController.dispose();
    super.dispose();
  }

  void _syncPaidController() {
    final store = Provider.of<StoreProvider>(context, listen: false);
    if (store.paymentMethod != 'due') {
      _paidController.text = store.cartPayable.toStringAsFixed(0);
    }
  }

  void _showItemPriceEditDialog(SaleItem item) {
    final store = Provider.of<StoreProvider>(context, listen: false);
    final commCtrl = TextEditingController(text: (item.commissionRate ?? 0).toInt().toString());
    final priceCtrl = TextEditingController(text: item.unitPrice.toInt().toString());
    final mrp = item.mrp;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${item.productName} - দর ও কমিশন', style: const TextStyle(fontSize: 15)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('গায়ের মূল্য (MRP): ৳${mrp.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: commCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'কমিশন (%)', suffixText: '%'),
              onChanged: (val) {
                final rate = double.tryParse(val) ?? 0.0;
                final newPrice = (mrp - (mrp * rate / 100.0)).clamp(0.0, double.infinity);
                priceCtrl.text = newPrice.toInt().toString();
              },
            ),
            const SizedBox(height: 10),
            TextField(
              controller: priceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'একক বিক্রয় দর (Unit Price)', prefixText: '৳ '),
              onChanged: (val) {
                final p = double.tryParse(val) ?? 0.0;
                if (mrp > 0) {
                  final rate = ((mrp - p) / mrp * 100.0).clamp(0.0, 100.0);
                  commCtrl.text = rate.toInt().toString();
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
              if (newRate > 0) {
                store.updateCartItemCommission(item.productId, newRate);
              } else {
                store.updateCartItemUnitPrice(item.productId, newPrice);
              }
              _syncPaidController();
              Navigator.pop(ctx);
            },
            child: const Text('সংরক্ষণ'),
          ),
        ],
      ),
    );
  }

  void _onCheckout() async {
    final store = Provider.of<StoreProvider>(context, listen: false);
    if (store.cart.isEmpty) return;

    if (store.cartDue > 0 && store.selectedCustomer == null) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.info_outline, color: AppTheme.secondary, size: 48),
          title: const Text('রেজিস্টার্ড কাস্টমার প্রয়োজন'),
          content: const Text(
            'বাকি (Due) শুধুমাত্র রেজিস্টার্ড কাস্টমার বা এজেন্টের জন্য অনুমোদিত। বাকি রাখতে একজন কাস্টমার নির্বাচন করুন অথবা নতুন প্রোফাইল তৈরি করুন।\n\n'
            'Due/Baki is only allowed for registered customers or agents. Please select or create a customer profile to record dues.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('ঠিক আছে'),
            ),
          ],
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final sale = await store.checkoutSale();
      if (!mounted) return;
      Navigator.pop(context); // Close cart

      // Auto-show invoice preview immediately after every sale
      final isAdmin = Provider.of<AuthProvider>(context, listen: false).isAdmin;
      showInvoicePreview(context, sale, isAdmin: isAdmin);
    } catch (e) {
      if (mounted) {
        final errorMessage = e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('বিক্রয় সংরক্ষণ ব্যর্থ: $errorMessage\nইন্টারনেট সংযোগ পরীক্ষা করুন'), 
            backgroundColor: AppTheme.danger,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);

    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header handle
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 4),
            width: 40,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(10),
            ),
          ),

          // Top bar with Take Return action
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.shopping_bag_outlined, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'কার্ট তালিকা (${store.cartTotalQuantity} টি)',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ReturnFormScreen()),
                        );
                      },
                      icon: const Icon(Icons.assignment_return_outlined, color: Colors.orange, size: 17),
                      label: const Text('রিটার্ন নিন', style: TextStyle(color: Colors.orange, fontSize: 13)),
                    ),
                    const SizedBox(width: 4),
                    TextButton.icon(
                      onPressed: store.cart.isEmpty ? null : store.clearCart,
                      icon: const Icon(Icons.delete_sweep, color: AppTheme.danger, size: 17),
                      label: const Text('খালি', style: TextStyle(color: AppTheme.danger, fontSize: 13)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Customer selection & type toggle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.grey.shade50,
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(value: 'single', label: Text('খুচরা (Single)')),
                          ButtonSegment(value: 'agent', label: Text('এজেন্ট (Agent)')),
                        ],
                        selected: {store.customerType},
                        onSelectionChanged: (val) {
                          store.setCustomerType(val.first);
                          if (val.first == 'agent') {
                            _agentCommController.text = store.agentCommissionRate.toInt().toString();
                          } else {
                            _retailDiscountController.text = store.retailDiscountValue.toInt().toString();
                          }
                          _syncPaidController();
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<Customer>(
                  value: store.selectedCustomer,
                  decoration: const InputDecoration(
                    labelText: 'কাস্টমার নির্বাচন করুন (ঐচ্ছিক)',
                    prefixIcon: Icon(Icons.person_outline),
                    isDense: true,
                  ),
                  hint: const Text('সাধারণ ক্রেতা (Walk-in)'),
                  items: store.customers.map((c) {
                    return DropdownMenuItem<Customer>(
                      value: c,
                      child: Text('${c.name} (${c.type == 'agent' ? 'এজেন্ট' : 'খুচরা'}) - বাকি: ৳${c.currentDue.toInt()}'),
                    );
                  }).toList(),
                  onChanged: (c) {
                    store.selectCustomer(c);
                    _agentCommController.text = store.agentCommissionRate.toInt().toString();
                    _syncPaidController();
                  },
                ),
              ],
            ),
          ),

          // --- DYNAMIC COMMISSION & DISCOUNT SECTION ---
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: store.customerType == 'agent' ? Colors.indigo.shade50 : Colors.teal.shade50,
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: store.customerType == 'agent'
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.storefront, size: 18, color: Colors.indigo.shade800),
                              const SizedBox(width: 6),
                              Text(
                                'পাইকারি এজেন্ট কমিশন (Wholesale Commission)',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.indigo.shade900),
                              ),
                            ],
                          ),
                          SizedBox(
                            width: 80,
                            height: 34,
                            child: TextField(
                              controller: _agentCommController,
                              keyboardType: TextInputType.number,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              decoration: InputDecoration(
                                suffixText: '%',
                                contentPadding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                isDense: true,
                              ),
                              onChanged: (val) {
                                final r = double.tryParse(val) ?? 0.0;
                                store.setAgentCommissionRate(r);
                                _syncPaidController();
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      // Quick commission preset chips
                      Row(
                        children: [
                          Text('কমিশন প্রিসেট: ', style: TextStyle(fontSize: 11, color: Colors.indigo.shade700)),
                          const SizedBox(width: 4),
                          ...[25, 30, 35, 40, 50].map((rate) {
                            final isSel = store.agentCommissionRate == rate.toDouble();
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: InkWell(
                                onTap: () {
                                  _agentCommController.text = rate.toString();
                                  store.setAgentCommissionRate(rate.toDouble());
                                  _syncPaidController();
                                },
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isSel ? Colors.indigo : Colors.white,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: Colors.indigo.shade300),
                                  ),
                                  child: Text(
                                    '$rate%',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: isSel ? Colors.white : Colors.indigo.shade900,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ],
                  )
                : Row(
                    children: [
                      Row(
                        children: [
                          Icon(Icons.percent, size: 18, color: Colors.teal.shade800),
                          const SizedBox(width: 6),
                          Text('খুচরা ছাড়:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.teal.shade900)),
                        ],
                      ),
                      const SizedBox(width: 8),
                      // Percent vs Fixed toggle
                      Container(
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6)),
                        child: Row(
                          children: [
                            InkWell(
                              onTap: () {
                                store.setRetailDiscountMode('percent');
                                _syncPaidController();
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: store.retailDiscountMode == 'percent' ? Colors.teal : Colors.transparent,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text('%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: store.retailDiscountMode == 'percent' ? Colors.white : Colors.black87)),
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                store.setRetailDiscountMode('fixed');
                                _syncPaidController();
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: store.retailDiscountMode == 'fixed' ? Colors.teal : Colors.transparent,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text('৳', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: store.retailDiscountMode == 'fixed' ? Colors.white : Colors.black87)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: SizedBox(
                          height: 34,
                          child: TextField(
                            controller: _retailDiscountController,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              isDense: true,
                            ),
                            onChanged: (val) {
                              final d = double.tryParse(val) ?? 0.0;
                              store.setRetailDiscountValue(d);
                              _syncPaidController();
                            },
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      // Round off button
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: const Size(60, 32),
                        ),
                        onPressed: () {
                          store.quickRoundOff();
                          _retailDiscountController.text = store.retailDiscountValue.toInt().toString();
                          _syncPaidController();
                        },
                        child: const Text('রাউন্ড অফ', style: TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
          ),

          // Cart Items List
          Expanded(
            child: store.cart.isEmpty
                ? const Center(
                    child: Text('কার্ট খালি। পণ্য যুক্ত করুন।', style: TextStyle(color: Colors.grey)),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: store.cart.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (ctx, index) {
                      final item = store.cart[index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () => _showItemPriceEditDialog(item),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.productName,
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Text(
                                          'MRP: ৳${item.mrp.toInt()} | বিক্রয়: ৳${item.unitPrice.toInt()}${item.unitDiscount > 0 ? ' (-৳${item.unitDiscount.toInt()})' : ''}',
                                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                        ),
                                        const SizedBox(width: 4),
                                        Icon(Icons.edit_note, size: 14, color: Theme.of(context).colorScheme.primary),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            // Qty controls
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 22, color: Colors.grey),
                                  onPressed: () {
                                    store.updateCartItemQty(item.productId, item.quantity - 1);
                                    _syncPaidController();
                                  },
                                ),
                                Text(
                                  '${item.quantity}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                IconButton(
                                  icon: Icon(Icons.add_circle_outline, size: 22, color: Theme.of(context).colorScheme.primary),
                                  onPressed: () {
                                    store.updateCartItemQty(item.productId, item.quantity + 1);
                                    _syncPaidController();
                                  },
                                ),
                              ],
                            ),
                            SizedBox(
                              width: 70,
                              child: Text(
                                '৳${item.total.toInt()}',
                                textAlign: TextAlign.right,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),

          // Payment & Total Calculation Sheet
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  offset: const Offset(0, -3),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Totals
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('মোট গায়ের মূল্য:'),
                    Text('৳${currencyFormat.format(store.cartSubtotal)}'),
                  ],
                ),
                if (store.cartTotalDiscount > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('মোট ছাড় / কমিশন:', style: TextStyle(color: AppTheme.success)),
                      Text('-৳${currencyFormat.format(store.cartTotalDiscount)}', style: const TextStyle(color: AppTheme.success)),
                    ],
                  ),
                ],
                const Divider(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('পরিশোধযোগ্য মূল্য:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text(
                      '৳${currencyFormat.format(store.cartPayable)}',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Payment Method Selector Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildPaymentChip('cash', 'ক্যাশ', Icons.money, store),
                      _buildPaymentChip('bkash', 'বিকাশ', Icons.phone_android, store),
                      _buildPaymentChip('nagad', 'নগদ', Icons.phone_android, store),
                      _buildPaymentChip('due', 'সম্পূর্ণ বাকি', Icons.receipt_long, store),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Paid amount & Due summary
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _paidController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'জমা টাকা (Paid Amount)',
                          prefixText: '৳ ',
                          isDense: true,
                        ),
                        onChanged: (val) {
                          final amount = double.tryParse(val) ?? 0.0;
                          store.setPaidAmount(amount);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: store.cartDue > 0 ? Colors.red.shade50 : Colors.green.shade50,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: store.cartDue > 0 ? Colors.red.shade200 : Colors.green.shade200,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              store.cartDue > 0 ? 'বাকি থাকবে' : 'পরিশোধ সম্পন্ন',
                              style: TextStyle(fontSize: 11, color: store.cartDue > 0 ? AppTheme.danger : AppTheme.success),
                            ),
                            Text(
                              '৳${currencyFormat.format(store.cartDue)}',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: store.cartDue > 0 ? AppTheme.danger : AppTheme.success,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Checkout Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: store.cart.isEmpty || _isProcessing ? null : _onCheckout,
                    child: _isProcessing
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('বিল সম্পন্ন করুন (Confirm Sale)', style: TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentChip(String method, String label, IconData icon, StoreProvider store) {
    final isSelected = store.paymentMethod == method;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: isSelected,
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : Theme.of(context).colorScheme.primary),
            const SizedBox(width: 4),
            Text(label),
          ],
        ),
        selectedColor: Theme.of(context).colorScheme.primary,
        labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black87),
        onSelected: (_) {
          store.setPaymentMethod(method);
          if (method == 'due') {
            _paidController.text = '0';
          } else {
            _paidController.text = store.cartPayable.toStringAsFixed(0);
          }
        },
      ),
    );
  }
}
