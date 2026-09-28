import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/store_provider.dart';
import '../../theme/app_theme.dart';
import 'publisher_form_screen.dart';

class PublishersScreen extends StatefulWidget {
  const PublishersScreen({super.key});

  @override
  State<PublishersScreen> createState() => _PublishersScreenState();
}

class _PublishersScreenState extends State<PublishersScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);

    final query = _searchController.text.trim().toLowerCase();
    final filtered = store.publishers.where((p) {
      if (query.isEmpty) return true;
      return p.name.toLowerCase().contains(query) || (p.bengaliName?.toLowerCase().contains(query) == true);
    }).toList();

    final bookCountByPublisher = <String, int>{};
    for (final product in store.products) {
      if (product.publisher != null && product.publisher!.isNotEmpty) {
        bookCountByPublisher[product.publisher!] = (bookCountByPublisher[product.publisher!] ?? 0) + 1;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('প্রকাশনী তালিকা'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => store.loadAllData(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const PublisherFormScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('নতুন প্রকাশনী'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'প্রকাশনীর নাম খুঁজুন...',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Expanded(
            child: store.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(child: Text('কোন প্রকাশনী পাওয়া যায়নি', style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        itemCount: filtered.length,
                        itemBuilder: (ctx, index) {
                          final publisher = filtered[index];
                          final bookCount = bookCountByPublisher[publisher.name] ?? 0;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => PublisherFormScreen(publisher: publisher)),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                                      child: Text(
                                        publisher.name.isNotEmpty ? publisher.name[0].toUpperCase() : '?',
                                        style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            publisher.bengaliName?.isNotEmpty == true
                                                ? '${publisher.bengaliName} (${publisher.name})'
                                                : publisher.name,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          if (publisher.phone != null)
                                            Text(publisher.phone!, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                                          Text('বই: $bookCount টি', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.amber.shade50,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        'কমিশন: ${publisher.defaultCommissionRate.toStringAsFixed(0)}%',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade900),
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
        ],
      ),
    );
  }
}
