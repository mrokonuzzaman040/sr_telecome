import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';

/// Preset theme color options — each has a name, a primary color,
/// and an optional dark variant for gradients.
class ThemeColorOption {
  final String key;
  final String label;
  final String labelBn; // Bengali label
  final Color primary;
  final Color primaryDark;
  final Color primaryLight;

  const ThemeColorOption({
    required this.key,
    required this.label,
    required this.labelBn,
    required this.primary,
    required this.primaryDark,
    required this.primaryLight,
  });
}

const List<ThemeColorOption> kThemeColorOptions = [
  ThemeColorOption(
    key: 'teal',
    label: 'Teal (Default)',
    labelBn: 'টিল (ডিফল্ট)',
    primary: Color(0xFF0F766E),
    primaryDark: Color(0xFF115E59),
    primaryLight: Color(0xFF14B8A6),
  ),
  ThemeColorOption(
    key: 'indigo',
    label: 'Indigo',
    labelBn: 'ইন্ডিগো',
    primary: Color(0xFF4338CA),
    primaryDark: Color(0xFF3730A3),
    primaryLight: Color(0xFF6366F1),
  ),
  ThemeColorOption(
    key: 'blue',
    label: 'Blue',
    labelBn: 'নীল',
    primary: Color(0xFF1D4ED8),
    primaryDark: Color(0xFF1E40AF),
    primaryLight: Color(0xFF3B82F6),
  ),
  ThemeColorOption(
    key: 'violet',
    label: 'Violet',
    labelBn: 'বেগুনি',
    primary: Color(0xFF7C3AED),
    primaryDark: Color(0xFF6D28D9),
    primaryLight: Color(0xFF8B5CF6),
  ),
  ThemeColorOption(
    key: 'rose',
    label: 'Rose',
    labelBn: 'গোলাপি',
    primary: Color(0xFFE11D48),
    primaryDark: Color(0xFFBE123C),
    primaryLight: Color(0xFFF43F5E),
  ),
  ThemeColorOption(
    key: 'orange',
    label: 'Orange',
    labelBn: 'কমলা',
    primary: Color(0xFFEA580C),
    primaryDark: Color(0xFFC2410C),
    primaryLight: Color(0xFFF97316),
  ),
  ThemeColorOption(
    key: 'green',
    label: 'Green',
    labelBn: 'সবুজ',
    primary: Color(0xFF16A34A),
    primaryDark: Color(0xFF15803D),
    primaryLight: Color(0xFF22C55E),
  ),
  ThemeColorOption(
    key: 'slate',
    label: 'Slate',
    labelBn: 'ধূসর',
    primary: Color(0xFF334155),
    primaryDark: Color(0xFF1E293B),
    primaryLight: Color(0xFF475569),
  ),
];

class ThemeProvider extends ChangeNotifier {
  static const String _themeColorKey = 'sr_theme_color_key';

  String _selectedColorKey = 'teal';

  String get selectedColorKey => _selectedColorKey;

  ThemeColorOption get selectedOption =>
      kThemeColorOptions.firstWhere((o) => o.key == _selectedColorKey,
          orElse: () => kThemeColorOptions.first);

  ThemeProvider() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_themeColorKey);
    if (saved != null && kThemeColorOptions.any((o) => o.key == saved)) {
      _selectedColorKey = saved;
      notifyListeners();
    }
  }

  Future<void> setThemeColor(String key) async {
    if (_selectedColorKey == key) return;
    _selectedColorKey = key;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeColorKey, key);
    notifyListeners();
  }

  /// Build a full [ThemeData] for the selected color.
  ThemeData buildTheme() {
    final opt = selectedOption;
    return AppTheme.buildThemeWithColor(opt.primary, opt.primaryDark, opt.primaryLight);
  }
}
