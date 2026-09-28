import 'dart:async';
import 'package:flutter/material.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static AppLocalizations of(Locale locale) {
    return AppLocalizations(locale);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const Map<String, Map<String, String>> _localizedValues = {
    'en': {
      // Common
      'app_name': 'SR Telecom & Library',
      'app_subtitle': 'Mobile POS',
      'loading': 'Loading...',
      'error': 'Error',
      'success': 'Success',
      'cancel': 'Cancel',
      'save': 'Save',
      'delete': 'Delete',
      'edit': 'Edit',
      'search': 'Search',
      'add': 'Add',
      'update': 'Update',
      'close': 'Close',
      'yes': 'Yes',
      'no': 'No',
      'ok': 'OK',
      'back': 'Back',
      'next': 'Next',
      'done': 'Done',
      'retry': 'Retry',
      
      // Auth
      'login': 'Login',
      'logout': 'Logout',
      'username': 'Username',
      'pin': 'PIN',
      'enter_pin': 'Enter PIN',
      'wrong_pin': 'Wrong PIN!',
      'login_failed': 'Login failed',
      'biometric_login': 'Login with Fingerprint',
      'biometric_authenticating': 'Authenticating...',
      'biometric_reason': 'Authenticate to login to SR Telecom & Library',
      'biometric_unlock_reason': 'Authenticate to unlock SR Telecom & Library',
      'biometric_verify_failed': 'Verification failed, login not enabled',
      'biometric_login_first': 'Please login with PIN first, then you can use biometric login',
      'biometric_login_error': 'Biometric verification successful but login failed. Try with PIN.',
      'owner': 'Owner (Admin)',
      'cashier': 'Cashier (POS Only)',
      'app_locked': 'App is locked',
      'unlock': 'Unlock',
      'unlock_with_pin': 'Unlock with PIN',
      'try_biometric': 'Try with Biometric',
      'try_again': 'Try Again',
      'logout_confirm': 'Logout',
      
      // Settings
      'settings': 'Settings',
      'system_settings': 'System Settings',
      'security': 'Security',
      'biometric_lock': 'Biometric Lock',
      'biometric_lock_desc': 'Unlock app with fingerprint/face instead of PIN',
      'biometric_lock_enabled': 'Biometric lock enabled',
      'biometric_lock_disabled': 'Biometric lock disabled',
      'appearance': 'Appearance',
      'theme_color': 'Theme Color',
      'change_app_color': 'Change App Color',
      'current_theme': 'Current: {color} • Theme applies everywhere immediately',
      'hardware': 'Hardware',
      'thermal_printer': 'Thermal Printer (Bluetooth POS)',
      'thermal_printer_desc': '58mm / 80mm Bluetooth thermal receipt printer',
      'database_backup': 'Database Backup',
      'database_backup_desc': 'Server snapshot and local JSON export',
      'shop_info': 'Shop Information',
      'proprietor': 'Proprietor: Md. Rokonuzzaman',
      'services': 'Services: Books, Stationery & Telecom Accessories',
      'version': 'Version: v1.0.0 (Flutter Mobile Edition)',
      
      // Server
      'server_settings': 'Server Settings',
      'api_server_address': 'API Server Address (Vercel or local IP)',
      'test': 'Test',
      'pinging': 'Pinging...',
      'default': 'Default',
      'save_server': 'Save',
      
      // Role
      'admin_role': 'Owner (Admin)',
      'cashier_role': 'Cashier (Cashier)',
      
      // Home
      'dashboard': 'Dashboard',
      'pos': 'POS',
      'customers': 'Customers',
      'inventory': 'Inventory',
      'invoices': 'Invoices',
      'returns': 'Returns',
      'reports': 'Reports',
      'publishers': 'Publishers',
      
      // Stats
      'today_sales': 'Today\'s Sales',
      'today_orders': 'Today\'s Orders',
      'total_customers': 'Total Customers',
      'low_stock': 'Low Stock',
      
      // Common actions
      'view_details': 'View Details',
      'print_invoice': 'Print Invoice',
      'share_invoice': 'Share Invoice',
      'delete_invoice': 'Delete Invoice',
      'add_customer': 'Add Customer',
      'add_product': 'Add Product',
      'add_publisher': 'Add Publisher',
      
      // Validation
      'required_field': 'This field is required',
      'invalid_format': 'Invalid format',
      'must_be_number': 'Must be a number',
      'must_be_positive': 'Must be positive',
      
      // Messages
      'no_data': 'No data available',
      'loading_data': 'Loading data...',
      'delete_confirm': 'Are you sure you want to delete this?',
      'save_success': 'Saved successfully',
      'delete_success': 'Deleted successfully',
      'update_success': 'Updated successfully',
      'operation_failed': 'Operation failed',
      'network_error': 'Network error. Please check your connection.',
      'server_error': 'Server error. Please try again later.',
    },
    'bn': {
      // Common
      'app_name': 'এস.আর টেলিকম & লাইব্রেরী',
      'app_subtitle': 'মোবাইল পিওএস',
      'loading': 'লোড হচ্ছে...',
      'error': 'ত্রুটি',
      'success': 'সফল',
      'cancel': 'বাতিল',
      'save': 'সংরক্ষণ',
      'delete': 'মুছে ফেলুন',
      'edit': 'সম্পাদনা',
      'search': 'অনুসন্ধান',
      'add': 'যোগ করুন',
      'update': 'আপডেট',
      'close': 'বন্ধ',
      'yes': 'হ্যাঁ',
      'no': 'না',
      'ok': 'ঠিক আছে',
      'back': 'পিছনে',
      'next': 'পরবর্তী',
      'done': 'সম্পন্ন',
      'retry': 'আবার চেষ্টা করুন',
      
      // Auth
      'login': 'লগইন',
      'logout': 'লগআউট',
      'username': 'ব্যবহারকারী নাম',
      'pin': 'পিন',
      'enter_pin': 'পিন প্রবেশ করুন',
      'wrong_pin': 'ভুল পিন কোড!',
      'login_failed': 'লগইন ব্যর্থ হয়েছে',
      'biometric_login': 'ফিঙ্গারপ্রিন্ট দিয়ে লগইন',
      'biometric_authenticating': 'যাচাই হচ্ছে...',
      'biometric_reason': 'এস.আর টেলিকম & লাইব্রেরীতে লগইন করতে যাচাই করুন',
      'biometric_unlock_reason': 'এস.আর টেলিকম & লাইব্রেরী আনলক করতে যাচাই করুন',
      'biometric_verify_failed': 'যাচাই ব্যর্থ হয়েছে, লক চালু হয়নি',
      'biometric_login_first': 'প্রথমে পিন দিয়ে লগইন করুন, তারপর বায়োমেট্রিক লগইন ব্যবহার করতে পারবেন',
      'biometric_login_error': 'বায়োমেট্রিক যাচাই সফল হয়েছে, কিন্তু লগইন ব্যর্থ হয়েছে। পিন দিয়ে চেষ্টা করুন।',
      'owner': 'মালিক (অ্যাডমিন)',
      'cashier': 'বিক্রয়কর্মী (পিওএস শুধু)',
      'app_locked': 'অ্যাপ লক করা আছে',
      'unlock': 'আনলক',
      'unlock_with_pin': 'পিন দিয়ে আনলক করুন',
      'try_biometric': 'বায়োমেট্রিক দিয়ে চেষ্টা করুন',
      'try_again': 'আবার চেষ্টা করুন',
      'logout_confirm': 'লগআউট করুন',
      
      // Settings
      'settings': 'সেটিংস',
      'system_settings': 'সিস্টেম সেটিংস',
      'security': 'সুরক্ষা',
      'biometric_lock': 'বায়োমেট্রিক লক',
      'biometric_lock_desc': 'পিনের বদলে ফিঙ্গারপ্রিন্ট/ফেইস দিয়ে অ্যাপ আনলক করুন',
      'biometric_lock_enabled': 'বায়োমেট্রিক লক চালু হয়েছে',
      'biometric_lock_disabled': 'বায়োমেট্রিক লক বন্ধ হয়েছে',
      'appearance': 'উপস্থিতি',
      'theme_color': 'থিম রঙ',
      'change_app_color': 'অ্যাপের রঙ পরিবর্তন করুন',
      'current_theme': 'বর্তমান: {color} • থিম বাছাই সাথে সাথে সর্বত্র প্রয়োগ হবে',
      'hardware': 'হার্ডওয়েয়ার',
      'thermal_printer': 'থার্মাল প্রিন্টার (ব্লুটুথ পিওএস)',
      'thermal_printer_desc': '৫৮মিমি / ৮০মিমি ব্লুটুথ থার্মাল রিসিট প্রিন্টার',
      'database_backup': 'ডাটাবেস ব্যাকআপ',
      'database_backup_desc': 'সার্ভার স্ন্যাপশট ও লোকাল JSON এক্সপোর্ট',
      'shop_info': 'দোকানের তথ্য',
      'proprietor': 'প্রোপাইটর: মো: রোকনুজ্জামান',
      'services': 'সার্ভিস: বই, স্টেশনারী ও টেলিকম এক্সেসরিজ',
      'version': 'ভার্সন: v1.0.0 (ফ্লাটার মোবাইল এডিশন)',
      
      // Server
      'server_settings': 'সার্ভার সেটিংস',
      'api_server_address': 'API সার্ভার ঠিকানা (Vercel বা লোকাল IP)',
      'test': 'টেস্ট',
      'pinging': 'পিং হচ্ছে...',
      'default': 'ডিফল্ট',
      'save_server': 'সংরক্ষণ',
      
      // Role
      'admin_role': 'মালিক (অ্যাডমিন)',
      'cashier_role': 'বিক্রয়কর্মী (ক্যাশিয়ার)',
      
      // Home
      'dashboard': 'ড্যাশবোর্ড',
      'pos': 'পিওএস',
      'customers': 'গ্রাহক',
      'inventory': 'ইনভেন্টরি',
      'invoices': 'চালান',
      'returns': 'রিটার্ন',
      'reports': 'রিপোর্ট',
      'publishers': 'প্রকাশক',
      
      // Stats
      'today_sales': 'আজকের বিক্রয়',
      'today_orders': 'আজকের অর্ডার',
      'total_customers': 'মোট গ্রাহক',
      'low_stock': 'কম স্টক',
      
      // Common actions
      'view_details': 'বিস্তারিত দেখুন',
      'print_invoice': 'চালান প্রিন্ট করুন',
      'share_invoice': 'চালান শেয়ার করুন',
      'delete_invoice': 'চালান মুছুন',
      'add_customer': 'গ্রাহক যোগ করুন',
      'add_product': 'পণ্য যোগ করুন',
      'add_publisher': 'প্রকাশক যোগ করুন',
      
      // Validation
      'required_field': 'এই ক্ষেত্রটি প্রয়োজনীয়',
      'invalid_format': 'অবৈধ ফরম্যাট',
      'must_be_number': 'সংখ্যা হতে হবে',
      'must_be_positive': 'ধনাত্মক হতে হবে',
      
      // Messages
      'no_data': 'কোন তথ্য নেই',
      'loading_data': 'তথ্য লোড হচ্ছে...',
      'delete_confirm': 'আপনি কি নিশ্চিত এটি মুছে ফেলতে চান?',
      'save_success': 'সফলভাবে সংরক্ষিত হয়েছে',
      'delete_success': 'সফলভাবে মুছে ফেলা হয়েছে',
      'update_success': 'সফলভাবে আপডেট হয়েছে',
      'operation_failed': 'অপারেশন ব্যর্থ হয়েছে',
      'network_error': 'নেটওয়ার্ক ত্রুটি। আপনার সংযোগ পরীক্ষা করুন।',
      'server_error': 'সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন।',
    },
  };

  String get(String key, {Map<String, String>? args}) {
    String? value = _localizedValues[locale.languageCode]?[key];
    if (value == null) {
      // Fallback to English if translation not found
      value = _localizedValues['en']?[key];
    }
    if (value == null) {
      // If still not found, return the key itself
      return key;
    }
    
    // Replace placeholders if args provided
    String result = value;
    if (args != null) {
      args.forEach((argKey, argValue) {
        result = result.replaceFirst('{$argKey}', argValue);
      });
    }
    
    return result;
  }
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return locale.languageCode == 'en' || locale.languageCode == 'bn';
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}