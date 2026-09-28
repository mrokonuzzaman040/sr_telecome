import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/store_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadUrl();
  }

  void _loadUrl() async {
    final url = await ApiService.getBaseUrl();
    setState(() => _urlController.text = url);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  void _saveServerUrl() async {
    setState(() => _isSaving = true);
    await ApiService.setBaseUrl(_urlController.text);
    if (!mounted) return;
    final store = Provider.of<StoreProvider>(context, listen: false);
    await store.loadAllData();
    setState(() => _isSaving = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('সার্ভার URL সংরক্ষিত ও ডেটা রিফ্রেশ সম্পন্ন!'), backgroundColor: AppTheme.success),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('সিস্টেম সেটিংস'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Active User Card
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: auth.isAdmin ? Colors.indigo.shade100 : Colors.teal.shade100,
                child: Icon(
                  auth.isAdmin ? Icons.admin_panel_settings : Icons.badge,
                  color: auth.isAdmin ? Colors.indigo : AppTheme.primary,
                ),
              ),
              title: Text(user?.name ?? 'ব্যবহারকারী', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(
                'রোল: ${auth.isAdmin ? "মালিক (Proprietor / Full Access)" : "বিক্রয়কর্মী (Cashier / POS Only)"}',
              ),
              trailing: IconButton(
                icon: const Icon(Icons.logout, color: AppTheme.danger),
                tooltip: 'লগআউট',
                onPressed: () => auth.logout(),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Server Connection Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.dns_outlined, color: AppTheme.primary),
                      SizedBox(width: 8),
                      Text('সার্ভার কানেকশন (API Base URL)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'মোবাইল অ্যাপকে Next.js ব্যাকএন্ডের সাথে যুক্ত করতে সার্ভার অ্যাড্রেস দিন:',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _urlController,
                    decoration: const InputDecoration(
                      hintText: 'http://192.168.0.105:3000',
                      prefixIcon: Icon(Icons.link),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSaving ? null : _saveServerUrl,
                      child: _isSaving
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('সংরক্ষণ ও সংযোগ পরীক্ষা করুন'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Printer & Hardware Configuration
          Card(
            child: ListTile(
              leading: const Icon(Icons.print_outlined, color: AppTheme.secondary),
              title: const Text('থার্মাল প্রিন্টার (Bluetooth POS)'),
              subtitle: const Text('৫৮মিমি / ৮০মিমি ব্লুটুথ থার্মাল রিসিট প্রিন্টার'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('ব্লুটুথ স্ক্যানিং শীঘ্রই সংযুক্ত হচ্ছে')),
                );
              },
            ),
          ),
          const SizedBox(height: 10),

          // Shop Details Card
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('দোকানের তথ্য', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  SizedBox(height: 8),
                  Text('প্রতিষ্ঠান: এস.আর টেলিকম & লাইব্রেরী (SR Telecom & Library)'),
                  Text('প্রোপাইটার: মো: রোকনুজ্জামান'),
                  Text('সার্ভিস: বই, স্টেশনারী ও টেলিকম এক্সেসরিজ'),
                  Text('ভার্সন: v1.0.0 (Flutter Mobile Edition)'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
