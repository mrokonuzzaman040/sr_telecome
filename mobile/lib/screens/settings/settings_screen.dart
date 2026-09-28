import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';
import '../../theme/app_theme.dart';
import 'printer_settings_screen.dart';
import 'backup_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _biometricAvailable = false;
  bool _isTogglingBiometric = false;

  @override
  void initState() {
    super.initState();
    BiometricService.isAvailable().then((available) {
      if (mounted) setState(() => _biometricAvailable = available);
    });
  }

  Future<void> _toggleBiometricLock(bool enable) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    setState(() => _isTogglingBiometric = true);
    try {
      if (enable) {
        final confirmed = await BiometricService.authenticate(
          reason: 'বায়োমেট্রিক লক চালু করতে যাচাই করুন',
        );
        if (!confirmed) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('যাচাই ব্যর্থ হয়েছে, লক চালু হয়নি'), backgroundColor: AppTheme.danger),
            );
          }
          return;
        }
      }
      await auth.setBiometricLockEnabled(enable);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(enable ? 'বায়োমেট্রিক লক চালু হয়েছে' : 'বায়োমেট্রিক লক বন্ধ হয়েছে'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isTogglingBiometric = false);
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

          // Biometric App Lock
          if (_biometricAvailable)
            Card(
              child: SwitchListTile(
                secondary: const Icon(Icons.fingerprint, color: AppTheme.secondary),
                title: const Text('বায়োমেট্রিক লক'),
                subtitle: const Text('পিনের বদলে ফিঙ্গারপ্রিন্ট/ফেস দিয়ে অ্যাপ আনলক করুন'),
                value: auth.biometricLockEnabled,
                onChanged: _isTogglingBiometric ? null : _toggleBiometricLock,
              ),
            ),
          if (_biometricAvailable) const SizedBox(height: 10),

          // Printer & Hardware Configuration
          Card(
            child: ListTile(
              leading: const Icon(Icons.print_outlined, color: AppTheme.secondary),
              title: const Text('থার্মাল প্রিন্টার (Bluetooth POS)'),
              subtitle: const Text('৫৮মিমি / ৮০মিমি ব্লুটুথ থার্মাল রিসিট প্রিন্টার'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PrinterSettingsScreen()),
              ),
            ),
          ),
          const SizedBox(height: 10),

          if (auth.isAdmin) ...[
            Card(
              child: ListTile(
                leading: const Icon(Icons.backup_outlined, color: AppTheme.secondary),
                title: const Text('ডাটাবেস ব্যাকআপ'),
                subtitle: const Text('সার্ভার স্ন্যাপশট ও লোকাল JSON এক্সপোর্ট'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const BackupScreen()),
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],

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
