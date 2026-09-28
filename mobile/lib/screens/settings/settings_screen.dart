import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/store_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/biometric_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/section_header.dart';
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
    final store = Provider.of<StoreProvider>(context);
    final user = auth.currentUser;

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: const Text('সিস্টেম সেটিংস'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Active User Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Theme.of(context).colorScheme.primary,
                  Theme.of(context).colorScheme.primary.withValues(alpha: 0.7),
                ],
              ),
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  child: Icon(
                    auth.isAdmin ? Icons.admin_panel_settings : Icons.badge,
                    color: Colors.white,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? 'ব্যবহারকারী',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15.5, color: Colors.white),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        auth.isAdmin ? 'মালিক (Proprietor / Full Access)' : 'বিক্রয়কর্মী (Cashier / POS Only)',
                        style: const TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.logout, color: Colors.white),
                  tooltip: 'লগআউট',
                  onPressed: () => auth.logout(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          SectionHeader(title: 'সুরক্ষা'),
          if (_biometricAvailable) ...[
            Card(
              child: SwitchListTile(
                secondary: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppTheme.secondary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.fingerprint, color: AppTheme.secondary, size: 20),
                ),
                title: const Text('বায়োমেট্রিক লক', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: const Text('পিনের বদলে ফিঙ্গারপ্রিন্ট/ফেইস দিয়ে অ্যাপ আনলক করুন', style: TextStyle(fontSize: 11.5)),
                value: auth.biometricLockEnabled,
                onChanged: _isTogglingBiometric ? null : _toggleBiometricLock,
              ),
            ),
            const SizedBox(height: 10),
          ],

          // ── Theme Color Picker ─────────────────────────────────────────
          SectionHeader(title: 'থিম রঙ (Appearance)'),
          const _ThemeColorPicker(),
          const SizedBox(height: 20),
          // ──────────────────────────────────────────────────────────────
          SectionHeader(title: 'হার্ডওয়েয়ার'),
          Card(
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppTheme.secondary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.print_outlined, color: AppTheme.secondary, size: 20),
              ),
              title: const Text('থার্মাল প্রিন্টার (Bluetooth POS)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: const Text('৫৮মিমি / ৮০মিমি ব্লুটুথ থার্মাল রিসিট প্রিন্টার', style: TextStyle(fontSize: 11.5)),
              trailing: const Icon(Icons.chevron_right, color: AppTheme.textFaint),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PrinterSettingsScreen()),
              ),
            ),
          ),

          if (auth.isAdmin) ...[
            const SizedBox(height: 10),
            Card(
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppTheme.secondary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.backup_outlined, color: AppTheme.secondary, size: 20),
                ),
                title: const Text('ডাটাবেস ব্যাকআপ', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: const Text('সার্ভার স্ন্যাপশট ও লোকাল JSON এক্সপোর্ট', style: TextStyle(fontSize: 11.5)),
                trailing: const Icon(Icons.chevron_right, color: AppTheme.textFaint),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const BackupScreen()),
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),

          SectionHeader(title: 'দোকানের তথ্য'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoRow(Icons.storefront_outlined, 'এস.আর টেলিকম & লাইব্রেরী (SR Telecom & Library)'),
                  _infoRow(Icons.person_outline, 'প্রোপাইটর: মো: রোকনুজ্জামান'),
                  _infoRow(Icons.category_outlined, 'সার্ভিস: বই, স্টেশনারী ও টেলিকম এক্সেসরিজ'),
                  _infoRow(Icons.info_outline, 'ভার্সন: v1.0.0 (Flutter Mobile Edition)', isLast: true),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text, {bool isLast = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppTheme.textFaint),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppTheme.textDark))),
        ],
      ),
    );
  }
}


/// ─────────────────────────────────────────────────────────────────────────
/// Theme Color Picker widget — displayed inside SettingsScreen.
/// ─────────────────────────────────────────────────────────────────────────
class _ThemeColorPicker extends StatelessWidget {
  const _ThemeColorPicker();

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.palette_outlined,
                      color: Theme.of(context).colorScheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'অ্যাপের রঙ পরিবর্তন করুন',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Choose App Theme Color',
                        style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: kThemeColorOptions.map((opt) {
                final isSelected = themeProvider.selectedColorKey == opt.key;
                return GestureDetector(
                  onTap: () => themeProvider.setThemeColor(opt.key),
                  child: Tooltip(
                    message: opt.labelBn,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: opt.primary,
                        shape: BoxShape.circle,
                        border: isSelected
                            ? Border.all(color: Colors.white, width: 3)
                            : Border.all(color: Colors.transparent, width: 3),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: opt.primary.withValues(alpha: 0.55),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                ),
                              ]
                            : [],
                      ),
                      child: isSelected
                          ? const Icon(Icons.check, color: Colors.white, size: 20)
                          : null,
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 10),
            Text(
              'বর্তমান: ${themeProvider.selectedOption.labelBn} • থিম বাছাই সাথে সাথে সর্বত্র প্রয়োগ হবে',
              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
