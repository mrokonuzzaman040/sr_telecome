import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  static const String _userKey = 'sr_auth_user';
  static const String _roleKey = 'sr_auth_role';

  AppUser? _currentUser;
  bool _isLoading = true;

  AppUser? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isAdmin => _currentUser?.role == 'admin';
  bool get isLoading => _isLoading;

  AuthProvider() {
    _loadUserSession();
  }

  Future<void> _loadUserSession() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString(_userKey);
    final role = prefs.getString(_roleKey);

    if (username != null && role != null) {
      _currentUser = AppUser(
        id: role == 'admin' ? 'user-admin' : 'user-staff',
        name: role == 'admin' ? 'মালিক (Proprietor)' : 'বিক্রয়কর্মী (Cashier)',
        username: username,
        role: role,
        pin: role == 'admin' ? '1234' : '5678',
      );
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> loginWithPin(String pin) async {
    // Default credentials as defined in the system
    if (pin == '1234') {
      _currentUser = AppUser(
        id: 'user-admin',
        name: 'মালিক (Proprietor)',
        username: 'admin',
        role: 'admin',
        pin: '1234',
      );
    } else if (pin == '5678') {
      _currentUser = AppUser(
        id: 'user-staff',
        name: 'বিক্রয়কর্মী (Cashier)',
        username: 'cashier',
        role: 'staff',
        pin: '5678',
      );
    } else {
      return false;
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, _currentUser!.username);
    await prefs.setString(_roleKey, _currentUser!.role);
    notifyListeners();
    return true;
  }

  bool verifyAdminPin(String pin) {
    return pin == '1234';
  }

  Future<void> logout() async {
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    await prefs.remove(_roleKey);
    notifyListeners();
  }
}
