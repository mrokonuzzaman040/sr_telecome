import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../models/customer.dart';
import '../../theme/app_theme.dart';

class CartModal extends StatefulWidget {
  const CartModal({super.key});

  @override
  State<CartModal> createState() => _CartModalState();
}

class _CartModalState extends State<CartModal> {
  final currencyFormat = NumberFormat('#,##0', 'en_US');
  final TextEditingController _paidController = TextEditingController();
  final TextEditingController _discountController = TextEditingController();
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    final store = Provider.of<StoreProvider>(context, listen: false);
    _paidController.text = store.cartPayable.toStringAsFixed(0);
    _discountController.text = store.customDiscount.toStringAsFixed(0);
  }

  @override
  void dispose() {
    _paidController.dispose();
    _discountController.dispose();
    super.dispose();
  }

  void _onCheckout() async {
    final store = Provider.of<StoreProvider>(context, listen: false);
    if (store.cart.isEmpty) return;

    setState(() => _isProcessing = true);
    try {
      final sale = await store.checkoutSale();
      if (!mounted) return;
      Navigator.pop(context); // Close cart

      // Show Invoice confirmation
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: AppTheme.success, size: 54),
          title: const Text('বিক্রয় সফল হয়েছে!'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('ইনভয়েস নম্বর: ${sale.invoiceNo}', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text('ক্রেতা: ${sale.customerName}'),
              Text('মোট পরিশোধিত: ৳${currencyFormat.format(sale.paidAmount)}'),
              if (sale.dueAmount > 0)
                Text(
                  'মোট বাকি: ৳${currencyFormat.format(sale.dueAmount)}',
                  style: const TextStyle(color: AppTheme.danger, fontWeight: FontWeight.bold),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('ঠিক আছে'),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.print, size: 18),
              label: const Text('রিসিপ্ট প্রিন্ট'),
              onPressed: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('ব্লুটুথ প্রিন্টারে রিসিপ্ট পাঠানো হচ্ছে...')),
                );
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
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
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
          // Top bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.shopping_bag_outlined, color: AppTheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'কার্ট তালিকা (${store.cartTotalQuantity} টি)',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: store.cart.isEmpty ? null : store.clearCart,
                  icon: const Icon(Icons.delete_sweep, color: AppTheme.danger, size: 18),
                  label: const Text('খালি করুন', style: TextStyle(color: AppTheme.danger)),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Customer selection & type toggle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                          _paidController.text = store.cartPayable.toStringAsFixed(0);
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
                    _paidController.text = store.cartPayable.toStringAsFixed(0);
                  },
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
                                  Text(
                                    'গায়ের মূল্য: ৳${item.mrp.toInt()}  |  বিক্রয়: ৳${item.unitPrice.toInt()}${item.commissionRate != null ? ' (${item.commissionRate!.toInt()}% ছাড়)' : ''}',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                  ),
                                ],
                              ),
                            ),
                            // Qty controls
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 22, color: Colors.grey),
                                  onPressed: () {
                                    store.updateCartItemQty(item.productId, item.quantity - 1);
                                    _paidController.text = store.cartPayable.toStringAsFixed(0);
                                  },
                                ),
                                Text(
                                  '${item.quantity}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, size: 22, color: AppTheme.primary),
                                  onPressed: () {
                                    store.updateCartItemQty(item.productId, item.quantity + 1);
                                    _paidController.text = store.cartPayable.toStringAsFixed(0);
                                  },
                                ),
                              ],
                            ),
                            Text(
                              '৳${item.total.toInt()}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
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
                  color: Colors.black.withOpacity(0.06),
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
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primary),
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
            Icon(icon, size: 16, color: isSelected ? Colors.white : AppTheme.primary),
            const SizedBox(width: 4),
            Text(label),
          ],
        ),
        selectedColor: AppTheme.primary,
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
