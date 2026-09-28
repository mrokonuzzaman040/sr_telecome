import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/sale.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';
import '../screens/invoices/invoices_list_screen.dart' show kPaymentMethodLabels;

final _currencyFormat = NumberFormat('#,##0', 'en_US');

/// Full invoice preview as a draggable bottom sheet - shared by the Dashboard
/// (tap a recent sale), the POS checkout success flow, and the Invoices list,
/// so all three show the exact same invoice layout instead of three
/// different summaries.
void showInvoicePreview(BuildContext context, Sale sale, {required bool isAdmin}) {
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
                      child: Text('${item.quantity} x ৳${_currencyFormat.format(item.unitPrice)}',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    ),
                    Text('৳${_currencyFormat.format(item.total)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  messenger.showSnackBar(
                    const SnackBar(content: Text('প্রিন্টারে রিসিপ্ট পাঠানো হচ্ছে...')),
                  );
                  final ok = await PrinterService.printSaleReceipt(sale);
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text(ok ? 'রিসিপ্ট প্রিন্ট হয়েছে' : 'প্রিন্টার সংযুক্ত নেই। সেটিংস থেকে প্রিন্টার সংযুক্ত করুন।'),
                      backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                    ),
                  );
                },
                icon: const Icon(Icons.print_outlined),
                label: const Text('রিসিপ্ট প্রিন্ট করুন'),
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
          '৳${_currencyFormat.format(amount)}',
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
