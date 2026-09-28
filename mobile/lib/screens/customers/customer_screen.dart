import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/store_provider.dart';
import '../../models/customer.dart';
import '../../theme/app_theme.dart';
import 'customer_form_screen.dart';

class CustomerScreen extends StatefulWidget {
  const CustomerScreen({super.key});

  @override
  State<CustomerScreen> createState() => _CustomerScreenState();
}

class _CustomerScreenState extends State<CustomerScreen> {
  final TextEditingController _searchController = TextEditingController();
  final currencyFormat = NumberFormat('#,##0', 'en_US');
  String _typeFilter = 'all'; // 'all' | 'agent' | 'single'
  bool _hasDueOnly = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _callPhone(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _openWhatsApp(String phone, double due) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final msg = Uri.encodeComponent(
      'আসসালামু আলাইকুম। এস.আর টেলিকম & লাইব্রেরী থেকে জানানো যাচ্ছে যে আপনার বর্তমান বকেয়া ৳${due.toInt()}। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ।',
    );
    final uri = Uri.parse('https://wa.me/88$cleanPhone?text=$msg');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showDueCollectionModal(Customer customer) {
    final amountController = TextEditingController(text: customer.currentDue.toInt().toString());
    String selectedMethod = 'cash';
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          title: Text('${customer.name} - বাকি আদায়'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('বর্তমান বাকি: ৳${currencyFormat.format(customer.currentDue)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.danger)),
              const SizedBox(height: 14),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'জমা টাকার পরিমাণ (৳)',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                value: selectedMethod,
                decoration: const InputDecoration(labelText: 'পেমেন্ট মাধ্যম', prefixIcon: Icon(Icons.account_balance_wallet_outlined)),
                items: const [
                  DropdownMenuItem(value: 'cash', child: Text('ক্যাশ (Cash)')),
                  DropdownMenuItem(value: 'bkash', child: Text('বিকাশ (bKash)')),
                  DropdownMenuItem(value: 'nagad', child: Text('নগদ (Nagad)')),
                  DropdownMenuItem(value: 'bank', child: Text('ব্যাংক একাউন্ট')),
                ],
                onChanged: (val) => setModalState(() => selectedMethod = val ?? 'cash'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('বাতিল'),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final amount = double.tryParse(amountController.text) ?? 0.0;
                      if (amount <= 0) return;
                      setModalState(() => isSubmitting = true);

                      try {
                        final store = Provider.of<StoreProvider>(context, listen: false);
                        await store.collectDue(
                          customer: customer,
                          amount: amount,
                          paymentMethod: selectedMethod,
                        );
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('বাকি সফলভাবে আদায় হয়েছে'), backgroundColor: AppTheme.success),
                          );
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('ত্রুটি: $e'), backgroundColor: AppTheme.danger),
                          );
                        }
                      }
                    },
              child: isSubmitting ? const CircularProgressIndicator(color: Colors.white) : const Text('জমা নিশ্চিত করুন'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild only when customers actually change or loading flag flips, not
    // on every StoreProvider notify (e.g. cart edits on the POS tab).
    context.select<StoreProvider, int>((s) => s.customersVersion);
    final isLoading = context.select<StoreProvider, bool>((s) => s.isLoading);
    final store = context.read<StoreProvider>();
    final totalDue = store.customers.fold(0.0, (sum, c) => sum + c.currentDue);

    final query = _searchController.text.trim().toLowerCase();
    final filtered = store.customers.where((c) {
      if (_typeFilter != 'all' && c.type != _typeFilter) return false;
      if (_hasDueOnly && c.currentDue <= 0) return false;
      if (query.isEmpty) return true;
      return c.name.toLowerCase().contains(query) || c.phone.contains(query);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('কাস্টমার ও বাকির খাতা'),
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
          MaterialPageRoute(builder: (_) => const CustomerFormScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('নতুন কাস্টমার'),
      ),
      body: Column(
        children: [
          // Total Due Summary Banner
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('মোট বকেয়া (বাকি)', style: TextStyle(fontSize: 12, color: AppTheme.danger)),
                        const SizedBox(height: 2),
                        Text(
                          '৳${currencyFormat.format(totalDue)}',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.danger),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.indigo.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.indigo.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('মোট খতিয়ান', style: TextStyle(fontSize: 12, color: AppTheme.secondary)),
                        const SizedBox(height: 2),
                        Text(
                          '${store.customers.length} জন',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.secondary),
                        ),
                      ],
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
              decoration: const InputDecoration(
                hintText: 'কাস্টমারের নাম বা ফোন নম্বর খুঁজুন...',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),

          // Filters: account type chips + has-due-only toggle
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                _buildTypeChip('all', 'সকল একাউন্ট'),
                _buildTypeChip('agent', 'এজেন্ট'),
                _buildTypeChip('single', 'খুচরা'),
                const SizedBox(width: 4),
                FilterChip(
                  selected: _hasDueOnly,
                  avatar: _hasDueOnly ? null : const Icon(Icons.filter_alt_outlined, size: 16),
                  label: const Text('শুধু বাকি আছে'),
                  selectedColor: AppTheme.danger.withValues(alpha: 0.12),
                  checkmarkColor: AppTheme.danger,
                  labelStyle: TextStyle(
                    color: _hasDueOnly ? AppTheme.danger : Colors.black87,
                    fontWeight: _hasDueOnly ? FontWeight.bold : FontWeight.normal,
                  ),
                  onSelected: (v) => setState(() => _hasDueOnly = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Customer List
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(child: Text('কোন কাস্টমার মেলেনি', style: TextStyle(color: Colors.grey)))
                    : RefreshIndicator(
                      onRefresh: store.loadAllData,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        itemCount: filtered.length,
                        itemBuilder: (ctx, index) {
                          final customer = filtered[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: customer.isAgent ? Colors.amber.shade100 : Colors.teal.shade100,
                                        child: Icon(
                                          customer.isAgent ? Icons.storefront : Icons.person,
                                          color: customer.isAgent ? Colors.amber.shade900 : AppTheme.primary,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Text(
                                                  customer.name,
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                                ),
                                                const SizedBox(width: 6),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                                  decoration: BoxDecoration(
                                                    color: customer.isAgent ? Colors.amber.shade50 : Colors.blue.shade50,
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    customer.isAgent ? 'এজেন্ট' : 'খুচরা',
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                      color: customer.isAgent ? Colors.amber.shade900 : Colors.blue.shade900,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Text(customer.phone, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                            if (customer.address != null)
                                              Text(customer.address!, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          const Text('বর্তমান বাকি', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                          Text(
                                            '৳${currencyFormat.format(customer.currentDue)}',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: customer.currentDue > 0 ? AppTheme.danger : AppTheme.success,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 16),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          IconButton.outlined(
                                            icon: const Icon(Icons.call, size: 18, color: AppTheme.primary),
                                            onPressed: () => _callPhone(customer.phone),
                                          ),
                                          const SizedBox(width: 8),
                                          IconButton.outlined(
                                            icon: const Icon(Icons.chat, size: 18, color: Colors.green),
                                            onPressed: () => _openWhatsApp(customer.phone, customer.currentDue),
                                          ),
                                          const SizedBox(width: 8),
                                          IconButton.outlined(
                                            icon: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.secondary),
                                            onPressed: () => Navigator.push(
                                              context,
                                              MaterialPageRoute(builder: (_) => CustomerFormScreen(customer: customer)),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (customer.currentDue > 0)
                                        ElevatedButton.icon(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppTheme.success,
                                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                          ),
                                          icon: const Icon(Icons.attach_money, size: 16),
                                          label: const Text('বাকি আদায়'),
                                          onPressed: () => _showDueCollectionModal(customer),
                                        ),
                                    ],
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
    );
  }

  Widget _buildTypeChip(String key, String label) {
    final isSelected = _typeFilter == key;
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
        onSelected: (_) => setState(() => _typeFilter = key),
      ),
    );
  }
}
