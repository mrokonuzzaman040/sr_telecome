import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/product.dart';
import '../../providers/auth_provider.dart';
import '../../providers/store_provider.dart';
import '../../theme/app_theme.dart';
import '../pos/barcode_scanner_screen.dart';

class ProductFormScreen extends StatefulWidget {
  final Product? product; // null = create new

  const ProductFormScreen({super.key, this.product});

  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _bengaliNameController;
  late final TextEditingController _barcodeController;
  late final TextEditingController _skuController;
  late final TextEditingController _publisherController;
  late final TextEditingController _bookClassController;
  late final TextEditingController _subjectController;
  late final TextEditingController _buyPriceController;
  late final TextEditingController _mrpController;
  late final TextEditingController _stockQtyController;
  late final TextEditingController _minStockAlertController;
  late final TextEditingController _unitController;
  late final TextEditingController _editionYearController;

  String _category = 'book';
  bool _isSubmitting = false;

  bool get _isEditing => widget.product != null;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameController = TextEditingController(text: p?.name ?? '');
    _bengaliNameController = TextEditingController(text: p?.bengaliName ?? '');
    _barcodeController = TextEditingController(text: p?.barcode ?? '');
    _skuController = TextEditingController(text: p?.sku ?? '');
    _publisherController = TextEditingController(text: p?.publisher ?? '');
    _bookClassController = TextEditingController(text: p?.bookClass ?? '');
    _subjectController = TextEditingController(text: p?.subject ?? '');
    _buyPriceController = TextEditingController(text: p != null ? p.buyPrice.toStringAsFixed(0) : '');
    _mrpController = TextEditingController(text: p != null ? p.mrp.toStringAsFixed(0) : '');
    _stockQtyController = TextEditingController(text: p != null ? p.stockQty.toString() : '0');
    _minStockAlertController = TextEditingController(text: p != null ? p.minStockAlert.toString() : '5');
    _unitController = TextEditingController(text: p?.unit ?? 'Piece');
    _editionYearController = TextEditingController(text: p?.editionYear ?? '2026');
    _category = p?.category ?? 'book';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bengaliNameController.dispose();
    _barcodeController.dispose();
    _skuController.dispose();
    _publisherController.dispose();
    _bookClassController.dispose();
    _subjectController.dispose();
    _buyPriceController.dispose();
    _mrpController.dispose();
    _stockQtyController.dispose();
    _minStockAlertController.dispose();
    _unitController.dispose();
    _editionYearController.dispose();
    super.dispose();
  }

  Future<void> _scanBarcode() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
    );
    if (result != null && mounted) {
      setState(() => _barcodeController.text = result);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final store = Provider.of<StoreProvider>(context, listen: false);
      final product = Product(
        id: widget.product?.id ?? 'prod-${DateTime.now().millisecondsSinceEpoch}',
        name: _nameController.text.trim(),
        bengaliName: _bengaliNameController.text.trim().isEmpty ? null : _bengaliNameController.text.trim(),
        category: _category,
        barcode: _barcodeController.text.trim().isEmpty
            ? 'BC-${DateTime.now().millisecondsSinceEpoch}'
            : _barcodeController.text.trim(),
        sku: _skuController.text.trim().isEmpty ? 'SKU-${DateTime.now().millisecondsSinceEpoch}' : _skuController.text.trim(),
        publisher: _publisherController.text.trim().isEmpty ? null : _publisherController.text.trim(),
        bookClass: _bookClassController.text.trim().isEmpty ? null : _bookClassController.text.trim(),
        subject: _subjectController.text.trim().isEmpty ? null : _subjectController.text.trim(),
        editionYear: _editionYearController.text.trim().isEmpty ? '2026' : _editionYearController.text.trim(),
        buyPrice: double.tryParse(_buyPriceController.text) ?? widget.product?.buyPrice ?? 0,
        mrp: double.tryParse(_mrpController.text) ?? 0,
        stockQty: int.tryParse(_stockQtyController.text) ?? 0,
        minStockAlert: int.tryParse(_minStockAlertController.text) ?? 5,
        unit: _unitController.text.trim().isEmpty ? 'Piece' : _unitController.text.trim(),
      );

      if (_isEditing) {
        await store.updateProduct(product);
      } else {
        await store.addProduct(product);
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEditing ? 'পণ্য সফলভাবে আপডেট হয়েছে' : 'পণ্য সফলভাবে যোগ হয়েছে'),
            backgroundColor: AppTheme.success,
          ),
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

  @override
  Widget build(BuildContext context) {
    final isAdmin = Provider.of<AuthProvider>(context, listen: false).isAdmin;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'পণ্য সম্পাদনা করুন' : 'নতুন পণ্য যোগ করুন'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'নাম (English) *', prefixIcon: Icon(Icons.menu_book)),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'নাম আবশ্যক' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _bengaliNameController,
              decoration: const InputDecoration(labelText: 'নাম (বাংলা)', prefixIcon: Icon(Icons.translate)),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'ক্যাটাগরি *', prefixIcon: Icon(Icons.category_outlined)),
              items: const [
                DropdownMenuItem(value: 'book', child: Text('বই (Book)')),
                DropdownMenuItem(value: 'stationery', child: Text('স্টেশনারি (Stationery)')),
              ],
              onChanged: (val) => setState(() => _category = val ?? 'book'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _barcodeController,
                    decoration: const InputDecoration(labelText: 'বারকোড', prefixIcon: Icon(Icons.qr_code)),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _scanBarcode,
                  icon: const Icon(Icons.qr_code_scanner),
                  tooltip: 'স্ক্যান করুন',
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _skuController,
              decoration: const InputDecoration(labelText: 'SKU', prefixIcon: Icon(Icons.tag)),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _publisherController,
              decoration: const InputDecoration(labelText: 'প্রকাশনী', prefixIcon: Icon(Icons.business)),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _bookClassController,
                    decoration: const InputDecoration(labelText: 'শ্রেণী'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _subjectController,
                    decoration: const InputDecoration(labelText: 'বিষয়'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (isAdmin)
                  Expanded(
                    child: TextFormField(
                      controller: _buyPriceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'ক্রয়মূল্য (৳)', prefixIcon: Icon(Icons.shopping_cart_outlined)),
                    ),
                  ),
                if (isAdmin) const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _mrpController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'গায়ের মূল্য (MRP) *', prefixIcon: Icon(Icons.sell_outlined)),
                    validator: (v) => (double.tryParse(v ?? '') == null) ? 'সঠিক মূল্য দিন' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _stockQtyController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'স্টক পরিমাণ *', prefixIcon: Icon(Icons.inventory_2_outlined)),
                    validator: (v) => (int.tryParse(v ?? '') == null) ? 'সঠিক সংখ্যা দিন' : null,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _minStockAlertController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'লো-স্টক এলার্ট'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _unitController,
                    decoration: const InputDecoration(labelText: 'একক (Unit)'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _editionYearController,
                    decoration: const InputDecoration(labelText: 'সংস্করণ বছর'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                    )
                  : Text(_isEditing ? 'আপডেট করুন' : 'সংরক্ষণ করুন'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
