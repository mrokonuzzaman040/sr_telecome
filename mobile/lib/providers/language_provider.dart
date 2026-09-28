import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageProvider extends ChangeNotifier {
  static const String _languageKey = 'sr_app_language';
  
  String _currentLanguage = 'bn'; // Default to Bangla
  
  String get currentLanguage => _currentLanguage;
  
  Locale get currentLocale {
    if (_currentLanguage == 'bn') {
      return const Locale('bn', 'BD');
    }
    return const Locale('en', 'US');
  }
  
  bool get isBangla => _currentLanguage == 'bn';
  bool get isEnglish => _currentLanguage == 'en';
  
  LanguageProvider() {
    _loadLanguage();
  }
  
  Future<void> _loadLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_languageKey);
    if (saved != null && (saved == 'bn' || saved == 'en')) {
      _currentLanguage = saved;
    }
    notifyListeners();
  }
  
  Future<void> setLanguage(String language) async {
    if (_currentLanguage == language) return;
    if (language != 'bn' && language != 'en') return;
    
    _currentLanguage = language;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_languageKey, language);
    notifyListeners();
  }
}