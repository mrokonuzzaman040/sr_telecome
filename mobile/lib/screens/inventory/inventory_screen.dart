import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/status_badge.dart';
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
      backgroundColor: AppTheme.backgroundLight,
      body: Column(
        children: [
          // Stock Metric Overview Cards
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Row(
              children: [
                Expanded(
                  child: StatCard(
                    label: 'মোট পণ্য',
                    value: '${products.length} টি',
                    icon: Icons.inventory_2_outlined,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatCard(
                    label: 'কম স্টক এলার্ট',
                    value: '$lowStockCount টি',
                    icon: Icons.warning_amber_rounded,
                    color: AppTheme.danger,
                    selected: _showOnlyLowStock,
                    onTap: () => setState(() => _showOnlyLowStock = !_showOnlyLowStock),
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
                    ? EmptyState(
                        icon: Icons.search_off,
                        message: 'কোন পণ্য মেলেনি',
                        actionLabel: _hasActiveFilters ? 'ফিল্টার মুছুন' : null,
                        onAction: _hasActiveFilters ? _clearFilters : null,
                      )
                    : RefreshIndicator(
                      onRefresh: store.loadAllData,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        itemCount: filtered.length,
                        itemBuilder: (ctx, index) {
                          final product = filtered[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => ProductFormScreen(product: product)),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: (product.category == 'book' ? AppTheme.secondary : Colors.orange)
                                            .withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        product.category == 'book' ? Icons.menu_book_rounded : Icons.inventory_2_rounded,
                                        color: product.category == 'book' ? AppTheme.secondary : Colors.orange.shade800,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  product.displayName,
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5),
                                                ),
                                              ),
                                              StatusBadge(
                                                label: '${product.stockQty} ${product.unit}',
                                                color: product.isLowStock ? AppTheme.danger : AppTheme.success,
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Wrap(
                                            spacing: 6,
                                            runSpacing: 6,
                                            children: [
                                              if (product.bookClass != null)
                                                StatusBadge(label: product.bookClass!, color: AppTheme.secondary, bold: false),
                                              if (product.publisher != null)
                                                StatusBadge(label: product.publisher!, color: Colors.teal, bold: false),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          Text('\u09ac\u09be\u09b0\u0995\u09cb\u09a1: ${product.barcode}', style: const TextStyle(fontSize: 11, color: AppTheme.textFaint)),
                                          const Divider(height: 18),
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                '\u09f3${currencyFormat.format(product.mrp)}',
                                                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Theme.of(context).colorScheme.primary),
                                              ),
                                              if (isAdmin)
                                                Text(
                                                  '\u0995\u09cd\u09b0\u09df\u09ae\u09c2\u09b2\u09cd\u09af: \u09f3${currencyFormat.format(product.buyPrice)}',
                                                  style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                                                ),
                                            ],
                                          ),
                                        ],
                                      ),
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
        selectedColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
        checkmarkColor: Theme.of(context).colorScheme.primary,
        labelStyle: TextStyle(
          color: isSelected ? Theme.of(context).colorScheme.primary : Colors.black87,
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
        color: isActive ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isActive ? Theme.of(context).colorScheme.primary : Colors.grey.shade300),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isDense: true,
          icon: const Icon(Icons.arrow_drop_down, size: 18),
          style: TextStyle(
            fontSize: 13,
            color: isActive ? Theme.of(context).colorScheme.primary : Colors.black87,
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
