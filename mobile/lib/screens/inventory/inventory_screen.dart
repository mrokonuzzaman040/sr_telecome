import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import 'product_form_screen.dart';
import '../publishers/publishers_screen.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _showOnlyLowStock = false;
  String _categoryFilter = 'all'; // 'all' | 'book' | 'stationery'
  String _publisherFilter = 'all';
  String _classFilter = 'all';
  final currencyFormat = NumberFormat('#,##0', 'en_US');

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool get _hasActiveFilters =>
      _showOnlyLowStock || _categoryFilter != 'all' || _publisherFilter != 'all' || _classFilter != 'all';

  void _clearFilters() {
    setState(() {
      _showOnlyLowStock = false;
      _categoryFilter = 'all';
      _publisherFilter = 'all';
      _classFilter = 'all';
    });
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild only when the products list or loading flag actually changes,
    // not on every StoreProvider notify (e.g. cart edits on the POS tab).
    context.select<StoreProvider, int>((s) => s.productsVersion);
    final isLoading = context.select<StoreProvider, bool>((s) => s.isLoading);
    final store = context.read<StoreProvider>();
    final products = store.products;
    final auth = Provider.of<AuthProvider>(context);
    final isAdmin = auth.isAdmin;

    final publishers = <String>{
      for (final p in products)
        if (p.publisher != null && p.publisher!.trim().isNotEmpty) p.publisher!.trim(),
    }.toList()
      ..sort();
    final classes = <String>{
      for (final p in products)
        if (p.bookClass != null && p.bookClass!.trim().isNotEmpty) p.bookClass!.trim(),
    }.toList()
      ..sort();

    final query = _searchController.text.trim().toLowerCase();
    final filtered = products.where((p) {
      if (_showOnlyLowStock && !p.isLowStock) return false;
      if (_categoryFilter != 'all' && p.category != _categoryFilter) return false;
      if (_publisherFilter != 'all' && p.publisher != _publisherFilter) return false;
      if (_classFilter != 'all' && p.bookClass != _classFilter) return false;
      if (query.isEmpty) return true;
      return p.name.toLowerCase().contains(query) ||
          (p.bengaliName?.toLowerCase().contains(query) == true) ||
          p.barcode.toLowerCase().contains(query) ||
          (p.publisher?.toLowerCase().contains(query) == true) ||
          (p.bookClass?.toLowerCase().contains(query) == true);
    }).toList();

    final lowStockCount = products.where((p) => p.isLowStock).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('স্টক ও ইনভেন্টরি'),
        actions: [
          IconButton(
            icon: const Icon(Icons.business_outlined),
            tooltip: 'প্রকাশনী তালিকা',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PublishersScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => store.loadAllData(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ProductFormScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('নতুন পণ্য'),
      ),
      body: Column(
        children: [
          // Stock Metric Overview Cards
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.teal.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.teal.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('মোট পণ্য', style: TextStyle(fontSize: 12, color: AppTheme.primary)),
                        Text(
                          '${store.products.length} টি',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: InkWell(
                    onTap: () {
                      setState(() => _showOnlyLowStock = !_showOnlyLowStock);
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: _showOnlyLowStock ? Colors.red.shade100 : Colors.red.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.red.shade300, width: _showOnlyLowStock ? 2 : 1),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('কম স্টক এলার্ট', style: TextStyle(fontSize: 12, color: AppTheme.danger)),
                              if (_showOnlyLowStock)
                                const Icon(Icons.check_circle, size: 14, color: AppTheme.danger),
                            ],
                          ),
                          Text(
                            '$lowStockCount টি',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.danger),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'পণ্য, বারকোড বা পাবলিশার খুঁজুন...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {});
                        },
                      )
                    : null,
                isDense: true,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),

          // Filters: category chips + publisher/class dropdowns
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                _buildCategoryChip('all', 'সকল পণ্য'),
                _buildCategoryChip('book', 'বই'),
                _buildCategoryChip('stationery', 'স্টেশনারী'),
                const SizedBox(width: 4),
                _buildDropdownFilter(
                  value: _publisherFilter,
                  hint: 'প্রকাশনী',
                  options: publishers,
                  onChanged: (v) => setState(() => _publisherFilter = v),
                ),
                const SizedBox(width: 8),
                _buildDropdownFilter(
                  value: _classFilter,
                  hint: 'শ্রেণী',
                  options: classes,
                  onChanged: (v) => setState(() => _classFilter = v),
                ),
                if (_hasActiveFilters) ...[
                  const SizedBox(width: 8),
                  ActionChip(
                    avatar: const Icon(Icons.filter_alt_off, size: 16, color: AppTheme.danger),
                    label: const Text('ফিল্টার মুছুন', style: TextStyle(color: AppTheme.danger)),
                    onPressed: _clearFilters,
                  ),
                ],
                const SizedBox(width: 4),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Product List
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.search_off, size: 48, color: Colors.grey),
                            const SizedBox(height: 8),
                            const Text('কোন পণ্য মেলেনি', style: TextStyle(color: Colors.grey)),
                            if (_hasActiveFilters)
                              TextButton(onPressed: _clearFilters, child: const Text('ফিল্টার মুছুন')),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                      onRefresh: store.loadAllData,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        itemCount: filtered.length,
                        itemBuilder: (ctx, index) {
                          final product = filtered[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => ProductFormScreen(product: product)),
                              ),
                              child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          product.displayName,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: product.isLowStock ? Colors.red.shade100 : Colors.green.shade100,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          'স্টক: ${product.stockQty} ${product.unit}',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: product.isLowStock ? AppTheme.danger : AppTheme.success,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 8,
                                    children: [
                                      if (product.bookClass != null)
                                        Text('শ্রেণী: ${product.bookClass}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                      if (product.publisher != null)
                                        Text('প্রকাশনী: ${product.publisher}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                      Text('বারকোড: ${product.barcode}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                    ],
                                  ),
                                  const Divider(height: 16),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'গায়ের মূল্য (MRP): ৳${currencyFormat.format(product.mrp)}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primary),
                                      ),
                                      if (isAdmin)
                                        Text(
                                          'ক্রয়মূল্য: ৳${currencyFormat.format(product.buyPrice)}',
                                          style: const TextStyle(fontSize: 13, color: Colors.grey),
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
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String key, String label) {
    final isSelected = _categoryFilter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: isSelected,
        label: Text(label),
        selectedColor: AppTheme.primary.withValues(alpha: 0.15),
        checkmarkColor: AppTheme.primary,
        labelStyle: TextStyle(
          color: isSelected ? AppTheme.primary : Colors.black87,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
        onSelected: (_) => setState(() => _categoryFilter = key),
      ),
    );
  }

  Widget _buildDropdownFilter({
    required String value,
    required String hint,
    required List<String> options,
    required ValueChanged<String> onChanged,
  }) {
    final isActive = value != 'all';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: isActive ? AppTheme.primary.withValues(alpha: 0.1) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isActive ? AppTheme.primary : Colors.grey.shade300),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isDense: true,
          icon: const Icon(Icons.arrow_drop_down, size: 18),
          style: TextStyle(
            fontSize: 13,
            color: isActive ? AppTheme.primary : Colors.black87,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
          items: [
            DropdownMenuItem(value: 'all', child: Text('সকল $hint')),
            ...options.map((o) => DropdownMenuItem(value: o, child: Text(o))),
          ],
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }
}
