import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/store_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/status_badge.dart';
import 'cart_modal.dart';
import 'barcode_scanner_screen.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'all'; // 'all' | 'book' | 'stationery'
  final currencyFormat = NumberFormat('#,##0', 'en_US');

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openBarcodeScanner() async {
    final scannedBarcode = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
    );

    if (scannedBarcode != null && scannedBarcode.isNotEmpty && mounted) {
      final store = Provider.of<StoreProvider>(context, listen: false);
      final product = store.findByBarcode(scannedBarcode);

      if (product != null) {
        store.addToCart(product);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${product.displayName} কার্টে যুক্ত হয়েছে'),
            duration: const Duration(seconds: 1),
            backgroundColor: AppTheme.success,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('বারকোড: $scannedBarcode - পণ্যটি পাওয়া যায়নি'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    }
  }

  void _showCartSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CartModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    // This screen only renders the product catalog + cart summary, so it only
    // needs to rebuild when products/loading/cart actually change - not on
    // every StoreProvider notify from other tabs (e.g. a customer edit).
    context.select<StoreProvider, int>((s) => s.productsVersion);
    context.select<StoreProvider, int>((s) => s.cartTotalQuantity);
    final isLoading = context.select<StoreProvider, bool>((s) => s.isLoading);
    final store = context.read<StoreProvider>();

    // Filter products
    final query = _searchController.text.trim().toLowerCase();
    final filtered = store.products.where((p) {
      if (_selectedCategory != 'all' && p.category != _selectedCategory) {
        return false;
      }
      if (query.isEmpty) return true;
      return p.name.toLowerCase().contains(query) ||
          (p.bengaliName?.toLowerCase().contains(query) == true) ||
          p.barcode.toLowerCase().contains(query) ||
          (p.publisher?.toLowerCase().contains(query) == true) ||
          (p.bookClass?.toLowerCase().contains(query) == true);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('পয়েন্ট অফ সেল (POS)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => store.loadAllData(),
          ),
        ],
      ),
      backgroundColor: AppTheme.backgroundLight,
      body: Column(
        children: [
          // Search & Scanner Header
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'বইয়ের নাম, বারকোড বা শ্রেণী খুঁজুন...',
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
                const SizedBox(width: 8),
                IconButton.filled(
                  style: IconButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
                  onPressed: _openBarcodeScanner,
                ),
              ],
            ),
          ),

          // Category Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                _buildCategoryFilter('all', 'সকল পণ্য'),
                _buildCategoryFilter('book', 'বই সমূহ (Books)'),
                _buildCategoryFilter('stationery', 'স্টেশনারী ও টেলিকম'),
              ],
            ),
          ),

          // Products List / Grid
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? EmptyState(
                        icon: Icons.inventory_2_outlined,
                        message: '\u0995\u09cb\u09a8 \u09aa\u09a3\u09cd\u09af \u09aa\u09be\u0993\u09df\u09be \u09af\u09be\u09df\u09a8\u09bf',
                        actionLabel: store.products.isEmpty ? '\u09a4\u09a5\u09cd\u09af \u09b0\u09bf\u09ab\u09cd\u09b0\u09c7\u09b6 \u0995\u09b0\u09c1\u09a8' : null,
                        onAction: store.products.isEmpty ? store.loadAllData : null,
                      )
                    : RefreshIndicator(
                      onRefresh: store.loadAllData,
                      child: ListView.builder(
                        padding: const EdgeInsets.only(left: 12, right: 12, top: 4, bottom: 80),
                        itemCount: filtered.length,
                        itemBuilder: (ctx, index) {
                          final product = filtered[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            clipBehavior: Clip.antiAlias,
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: (product.category == 'book' ? AppTheme.secondary : Colors.orange).withValues(alpha: 0.1),
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
                                        Text(
                                          product.displayName,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
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
                                            StatusBadge(
                                              label: '\u09b8\u09cd\u099f\u0995: ${product.stockQty}',
                                              color: product.stockQty <= product.minStockAlert ? AppTheme.danger : AppTheme.success,
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          '\u09f3${currencyFormat.format(product.mrp)}',
                                          style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.primary, fontSize: 15.5),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  IconButton.filled(
                                    style: IconButton.styleFrom(backgroundColor: AppTheme.primary),
                                    icon: const Icon(Icons.add_shopping_cart, size: 20),
                                    onPressed: () {
                                      store.addToCart(product);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('${product.displayName} \u09af\u09cb\u0997 \u09b9\u09df\u09c7\u099b\u09c7'),
                                          duration: const Duration(milliseconds: 700),
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
          ),
        ],
      ),
      // Floating Cart Bar
      bottomSheet: store.cart.isNotEmpty
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${store.cartTotalQuantity} টি আইটেম',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        Text(
                          '৳${currencyFormat.format(store.cartPayable)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.success,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      ),
                      icon: const Icon(Icons.shopping_cart_checkout),
                      label: const Text('কার্ট ও বিলিং'),
                      onPressed: _showCartSheet,
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildCategoryFilter(String key, String label) {
    final isSelected = _selectedCategory == key;
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
        onSelected: (_) {
          setState(() => _selectedCategory = key);
        },
      ),
    );
  }
}
