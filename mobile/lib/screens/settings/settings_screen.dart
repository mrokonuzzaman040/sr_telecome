import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/store_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/language_provider.dart';
import '../../services/biometric_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/section_header.dart';
import '../../l10n/app_localizations.dart';
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
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final loc = AppLocalizations.of(languageProvider.currentLocale);
    
    setState(() => _isTogglingBiometric = true);
    try {
      if (enable) {
        final confirmed = await BiometricService.authenticate(
          reason: loc.get('biometric_reason'),
        );
        if (!confirmed) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(loc.get('biometric_verify_failed')), backgroundColor: AppTheme.danger),
            );
          }
          return;
        }
      }
      await auth.setBiometricLockEnabled(enable);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(enable ? loc.get('biometric_lock_enabled') : loc.get('biometric_lock_disabled')),
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
    final languageProvider = Provider.of<LanguageProvider>(context);
    final loc = AppLocalizations.of(languageProvider.currentLocale);
    final user = auth.currentUser;

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text(loc.get('system_settings')),
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
                        user?.name ?? loc.get('username'),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15.5, color: Colors.white),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        auth.isAdmin ? loc.get('owner') : 'বিক্রয়কর্মী (Cashier / POS Only)',
                        style: const TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.logout, color: Colors.white),
                  tooltip: loc.get('logout'),
                  onPressed: () => auth.logout(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          SectionHeader(title: loc.get('security')),
          if (_biometricAvailable) ...[
            Card(
              child: SwitchListTile(
                secondary: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppTheme.secondary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.fingerprint, color: AppTheme.secondary, size: 20),
                ),
                title: Text(loc.get('biometric_lock'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Text(loc.get('biometric_lock_desc'), style: const TextStyle(fontSize: 11.5)),
                value: auth.biometricLockEnabled,
                onChanged: _isTogglingBiometric ? null : _toggleBiometricLock,
              ),
            ),
            const SizedBox(height: 10),
          ],

          // ── Language Switcher ─────────────────────────────────────────
          SectionHeader(title: 'ভাষা / Language'),
          const _LanguageSwitcher(),
          const SizedBox(height: 20),
          // ──────────────────────────────────────────────────────────────

          // ── Theme Color Picker ─────────────────────────────────────────
          SectionHeader(title: loc.get('appearance')),
          const _ThemeColorPicker(),
          const SizedBox(height: 20),
          // ──────────────────────────────────────────────────────────────
          SectionHeader(title: loc.get('hardware')),
          Card(
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppTheme.secondary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.print_outlined, color: AppTheme.secondary, size: 20),
              ),
              title: Text(loc.get('thermal_printer'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: Text(loc.get('thermal_printer_desc'), style: const TextStyle(fontSize: 11.5)),
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
                title: Text(loc.get('database_backup'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Text(loc.get('database_backup_desc'), style: const TextStyle(fontSize: 11.5)),
                trailing: const Icon(Icons.chevron_right, color: AppTheme.textFaint),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const BackupScreen()),
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),

          SectionHeader(title: loc.get('shop_info')),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoRow(Icons.storefront_outlined, loc.get('app_name')),
                  _infoRow(Icons.person_outline, loc.get('proprietor')),
                  _infoRow(Icons.category_outlined, loc.get('services')),
                  _infoRow(Icons.info_outline, loc.get('version'), isLast: true),
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

/// ─────────────────────────────────────────────────────────────────────────
/// Language Switcher widget — displayed inside SettingsScreen.
/// ─────────────────────────────────────────────────────────────────────────
class _LanguageSwitcher extends StatelessWidget {
  const _LanguageSwitcher();

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);

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
                  child: Icon(Icons.language_outlined,
                      color: Theme.of(context).colorScheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ভাষা পরিবর্তন করুন',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Change Language',
                        style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _LanguageOption(
                    label: 'বাংলা',
                    sublabel: 'Bangla',
                    isSelected: languageProvider.isBangla,
                    onTap: () => languageProvider.setLanguage('bn'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _LanguageOption(
                    label: 'English',
                    sublabel: 'ইংরেজি',
                    isSelected: languageProvider.isEnglish,
                    onTap: () => languageProvider.setLanguage('en'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  final String label;
  final String sublabel;
  final bool isSelected;
  final VoidCallback onTap;

  const _LanguageOption({
    required this.label,
    required this.sublabel,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected 
              ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected 
                ? Theme.of(context).colorScheme.primary
                : AppTheme.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 15,
                color: isSelected 
                    ? Theme.of(context).colorScheme.primary
                    : AppTheme.textDark,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              sublabel,
              style: TextStyle(
                fontSize: 11,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
