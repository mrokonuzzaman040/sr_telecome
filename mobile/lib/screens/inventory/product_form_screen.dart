import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/book_lookup_result.dart';
import '../../models/product.dart';
import '../../providers/auth_provider.dart';
import '../../providers/store_provider.dart';
import '../../services/book_metadata_service.dart';
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
  late final TextEditingController _itemTypeController;
  late final TextEditingController _buyPriceController;
  late final TextEditingController _mrpController;
  late final TextEditingController _stockQtyController;
  late final TextEditingController _minStockAlertController;
  late final TextEditingController _unitController;
  late final TextEditingController _editionYearController;

  String _category = 'book';
  bool _isSubmitting = false;
  bool _isLookingUp = false;

  final _lookupService = BookMetadataService();

  /// What the last auto-scan filled in, so the form can show a summary banner
  /// and highlight which fields came from the lookup.
  BookLookupResult? _lastLookup;
  final Set<String> _autoFilledFields = {};

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
    _itemTypeController = TextEditingController(text: p?.itemType ?? '');
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
    _itemTypeController.dispose();
    _buyPriceController.dispose();
    _mrpController.dispose();
    _stockQtyController.dispose();
    _minStockAlertController.dispose();
    _unitController.dispose();
    _editionYearController.dispose();
    _lookupService.dispose();
    super.dispose();
  }

  /// Copies a controller's value only when the user has not already typed one.
  /// Never overwrites manual input — an auto-fill must not destroy work.
  void _fill(String field, TextEditingController controller, String? value) {
    if (value == null || value.trim().isEmpty) return;
    if (controller.text.trim().isNotEmpty) return;
    controller.text = value.trim();
    _autoFilledFields.add(field);
  }

  /// Scans a barcode, resolves metadata for it, and offers the result to the
  /// user through a confirmation sheet before touching any field.
  Future<void> _scanBarcode() async {
    final scanned = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
    );
    if (scanned == null || scanned.trim().isEmpty || !mounted) return;

    final barcode = scanned.trim();
    _barcodeController.text = barcode;
    await _runLookup(barcode);
  }

  /// Runs the free metadata lookup and shows the result sheet. Shared by the
  /// scan button and the "look up" action in the summary banner.
  Future<void> _runLookup(String barcode) async {
    if (_isLookingUp) return;
    setState(() => _isLookingUp = true);

    final store = Provider.of<StoreProvider>(context, listen: false);
    final catalog = store.products;

    BookLookupResult result;
    try {
      result = await _lookupService.lookup(
        barcode: barcode,
        catalog: catalog,
        titleHint: _nameController.text.trim().isEmpty ? null : _nameController.text.trim(),
      );
    } catch (_) {
      // Lookup must never block manual entry.
      if (mounted) setState(() => _isLookingUp = false);
      return;
    }
    if (!mounted) return;
    setState(() => _isLookingUp = false);

    // An exact barcode match means the book is already in the catalog. Offer a
    // stock top-up instead of creating a duplicate entry.
    if (result.sourceOf('name') == LookupSource.localCatalog &&
        result.matchedProductId != null) {
      await _offerExistingProduct(result, catalog);
      return;
    }

    if (result.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('এই বারকোডের তথ্য পাওয়া যায়নি — নিজে পূরণ করুন'),
          backgroundColor: AppTheme.textMuted,
        ),
      );
      return;
    }

    final applied = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LookupResultSheet(result: result, barcode: barcode),
    );

    if (applied == true && mounted) _applyLookup(result);
  }

  void _applyLookup(BookLookupResult result) {
    setState(() {
      _autoFilledFields.clear();
      _fill('name', _nameController, result.name);
      _fill('bengaliName', _bengaliNameController, result.bengaliName);
      _fill('publisher', _publisherController, result.publisher);
      _fill('bookClass', _bookClassController, result.bookClass);
      _fill('subject', _subjectController, result.subject);
      if (result.itemType != null && result.itemType!.trim().isNotEmpty) {
        _itemTypeController.text = result.itemType!.trim();
        _autoFilledFields.add('itemType');
      }
      _fill('editionYear', _editionYearController, result.editionYear);
      if (result.category == 'stationery' || result.category == 'book') {
        _category = result.category!;
      }
      // Prices are only suggested, never silently applied: an identical book's
      // price is a starting point the shop owner must confirm.
      if (_mrpController.text.trim().isEmpty && (result.suggestedMrp ?? 0) > 0) {
        _mrpController.text = result.suggestedMrp!.toStringAsFixed(0);
        _autoFilledFields.add('mrp');
      }
      if (_buyPriceController.text.trim().isEmpty && (result.suggestedBuyPrice ?? 0) > 0) {
        _buyPriceController.text = result.suggestedBuyPrice!.toStringAsFixed(0);
        _autoFilledFields.add('buyPrice');
      }
      _lastLookup = result;
    });
  }

  /// Offers to add stock to the existing product that owns this barcode.
  Future<void> _offerExistingProduct(BookLookupResult result, List<Product> catalog) async {
    Product? existing;
    for (final p in catalog) {
      if (p.id == result.matchedProductId) existing = p;
    }
    if (existing == null || !mounted) return;
    final match = existing;

    final qtyController = TextEditingController(text: '1');
    final action = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('বইটি ইতিমধ্যে স্টকে আছে'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              match.displayName,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'বর্তমান স্টক: ${match.stockQty} ${match.unit}  |  মূল্য: ৳${match.mrp.toStringAsFixed(0)}',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: qtyController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'কতটি যোগ করবেন',
                prefixIcon: Icon(Icons.add_box_outlined),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'edit'),
            child: const Text('তথ্য সম্পাদনা'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'cancel'),
            child: const Text('বাতিল'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, 'add'),
            child: const Text('স্টকে যোগ করুন'),
          ),
        ],
      ),
    );

    if (!mounted) return;
    if (action == 'add') {
      final qty = int.tryParse(qtyController.text.trim()) ?? 0;
      if (qty > 0) {
        await Provider.of<StoreProvider>(context, listen: false)
            .addStockToProduct(existing.id, qty);
        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$qty টি স্টকে যোগ হয়েছে'),
              backgroundColor: AppTheme.success,
            ),
          );
        }
      }
    } else if (action == 'edit') {
      Navigator.pop(context);
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductFormScreen(product: match),
        ),
      );
    }
  }

  /// Re-runs the title-based rules (class / subject / publisher) whenever the
  /// shop owner types a name. This is what fills Bangladeshi textbooks, which no
  /// public API knows about.
  void _onNameChanged(String value) {
    if (value.trim().length < 3) return;
    final store = Provider.of<StoreProvider>(context, listen: false);
    final rules = BookMetadataService.inferFromTitle(value);
    final publisherRules =
        BookMetadataService.inferPublisherFromTitle(value, store.products);

    final changed = <String>[];
    for (final entry in {
      'bookClass': (_bookClassController, rules.bookClass),
      'subject': (_subjectController, rules.subject),
      'publisher': (_publisherController, publisherRules.publisher),
    }.entries) {
      final (controller, suggested) = entry.value;
      if ((suggested?.trim().isEmpty ?? true) || !_autoFilledFields.contains(entry.key)) {
        continue;
      }
      if (controller.text.trim() != suggested!.trim()) {
        controller.text = suggested.trim();
        changed.add(entry.key);
      }
    }
    if (changed.isNotEmpty) setState(() {});
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
        itemType: _itemTypeController.text.trim().isEmpty ? null : _itemTypeController.text.trim(),
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
            if (_lastLookup != null) ...[
              _LookupSummaryBanner(
                result: _lastLookup!,
                filledFields: _autoFilledFields,
                onLookupAgain: () => _runLookup(_barcodeController.text.trim()),
              ),
              const SizedBox(height: 16),
            ],
            TextFormField(
              controller: _nameController,
              onChanged: _onNameChanged,
              decoration: InputDecoration(
                labelText: 'নাম (English) *',
                prefixIcon: const Icon(Icons.menu_book),
                suffixIcon: _isLookingUp
                    ? const Padding(
                        padding: EdgeInsets.all(14),
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : null,
              ),
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
                    decoration: InputDecoration(
                      labelText: 'বারকোড',
                      prefixIcon: const Icon(Icons.qr_code),
                      helperText: 'স্ক্যান করলে তথ্য অটো-ফিল হবে',
                      helperStyle: const TextStyle(fontSize: 10.5),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 52,
                  child: IconButton.filled(
                    onPressed: _isLookingUp ? null : _scanBarcode,
                    icon: const Icon(Icons.qr_code_scanner),
                    tooltip: 'স্ক্যান করে তথ্য আনুন',
                  ),
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
            TextFormField(
              controller: _itemTypeController,
              decoration: const InputDecoration(
                labelText: 'ধরন (Guide / Textbook / Model Test)',
                prefixIcon: Icon(Icons.category_outlined),
              ),
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

/// Bengali field labels used by the lookup result sheet and summary banner.
const Map<String, String> _kFieldLabels = {
  'name': 'নাম',
  'bengaliName': 'বাংলা নাম',
  'publisher': 'প্রকাশনী',
  'bookClass': 'শ্রেণী',
  'subject': 'বিষয়',
  'itemType': 'ধরন',
  'editionYear': 'সংস্করণ',
  'imageUrl': 'ছবি',
  'category': 'ক্যাটাগরি',
};

/// Colour hint per lookup source, so the shop owner can tell at a glance how
/// much to trust a value: own catalog data is green, public API is blue.
Color _sourceColor(LookupSource source, BuildContext context) {
  switch (source) {
    case LookupSource.localCatalog:
      return AppTheme.success;
    case LookupSource.localMemory:
      return Theme.of(context).colorScheme.primary;
    case LookupSource.similarProduct:
      return AppTheme.accent;
    case LookupSource.openLibrary:
      return Colors.blueGrey;
    case LookupSource.titleRule:
      return Colors.deepPurple;
  }
}

/// Bottom sheet showing what the barcode scan resolved, with per-field
/// provenance. Nothing is written to the form until the user confirms.
class _LookupResultSheet extends StatelessWidget {
  final BookLookupResult result;
  final String barcode;

  const _LookupResultSheet({required this.result, required this.barcode});

  @override
  Widget build(BuildContext context) {
    final fields = result.sources.entries.toList()
      ..sort((a, b) => a.value.source.index.compareTo(b.value.source.index));

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      // Keep the sheet usable on short screens and with large font settings.
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.8,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Icon(Icons.auto_awesome, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'স্বয়ংক্রিয় তথ্য পাওয়া গেছে',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                barcode,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              ...fields.map((entry) {
                final label = _kFieldLabels[entry.key] ?? entry.key;
                if (entry.key == 'imageUrl' || entry.key == 'category') {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 78,
                        child: Text(
                          label,
                          style: const TextStyle(fontSize: 12.5, color: Colors.grey),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          entry.value.value,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _sourceColor(entry.value.source, context).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          BookMetadataService.sourceLabels[entry.value.source] ?? '',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w600,
                            color: _sourceColor(entry.value.source, context),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
              if ((result.suggestedMrp ?? 0) > 0) ...[
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, size: 16, color: Colors.orange),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'মূল্য প্রস্তাবনা: ৳${result.suggestedMrp!.toStringAsFixed(0)}'
                          '${(result.suggestedBuyPrice ?? 0) > 0 ? '  (ক্রয় ৳${result.suggestedBuyPrice!.toStringAsFixed(0)})' : ''}'
                          ' — স্টকের আগের এন্ট্রি থেকে নেওয়া। যাচাই করে নিন।',
                          style: const TextStyle(fontSize: 11.5, height: 1.35),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('বাতিল'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pop(context, true),
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('ফর্মে বসান'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compact banner shown inside the form after a successful auto-fill, listing
/// which fields were filled and from where.
class _LookupSummaryBanner extends StatelessWidget {
  final BookLookupResult result;
  final Set<String> filledFields;
  final VoidCallback onLookupAgain;

  const _LookupSummaryBanner({
    required this.result,
    required this.filledFields,
    required this.onLookupAgain,
  });

  @override
  Widget build(BuildContext context) {
    if (filledFields.isEmpty) return const SizedBox.shrink();

    final labels = filledFields
        .where((f) => _kFieldLabels.containsKey(f))
        .map((f) => _kFieldLabels[f]!)
        .toList();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.success.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.success.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.auto_awesome, size: 18, color: AppTheme.success),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${filledFields.length}টি ফিল্ড স্বয়ংক্রিয়ভাবে পূরণ হয়েছে',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  labels.join(' · '),
                  style: const TextStyle(fontSize: 11.5, height: 1.3),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onLookupAgain,
            icon: const Icon(Icons.refresh, size: 18),
            tooltip: 'আবার খুঁজুন',
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}
