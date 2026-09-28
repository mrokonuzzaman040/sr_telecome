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
  final currencyFormat = NumberFormat('#,##0', 'en_US');

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final isAdmin = auth.isAdmin;

    final query = _searchController.text.trim().toLowerCase();
    final filtered = store.products.where((p) {
      if (_showOnlyLowStock && !p.isLowStock) return false;
      if (query.isEmpty) return true;
      return p.name.toLowerCase().contains(query) ||
          (p.bengaliName?.toLowerCase().contains(query) == true) ||
          p.barcode.toLowerCase().contains(query) ||
          (p.publisher?.toLowerCase().contains(query) == true) ||
          (p.bookClass?.toLowerCase().contains(query) == true);
    }).toList();

    final lowStockCount = store.products.where((p) => p.isLowStock).length;

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

          // Product List
          Expanded(
            child: store.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(child: Text('কোন পণ্য মেলেনি', style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
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
        ],
      ),
    );
  }
}
