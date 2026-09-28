import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  static const String _userJsonKey = 'sr_auth_user_json';

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
    final userJson = prefs.getString(_userJsonKey);

    if (userJson != null) {
      try {
        _currentUser = AppUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
      } catch (_) {
        _currentUser = null;
      }
    }
    _isLoading = false;
    notifyListeners();
  }

  /// Authenticates against the real backend (`/api/auth/login`).
  /// Throws an [Exception] with a user-facing message on failure.
  Future<void> login(String username, String pin) async {
    final user = await ApiService.login(username, pin);
    _currentUser = user;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userJsonKey, jsonEncode(user.toJson()));
    notifyListeners();
  }

  /// Re-verifies the admin PIN against the backend without changing the
  /// active session. Used to unlock admin-only sections (e.g. Reports).
  Future<bool> verifyAdminPin(String pin) async {
    return ApiService.verifyPinOnly('admin', pin);
  }

  Future<void> logout() async {
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userJsonKey);
    await ApiService.clearToken();
    notifyListeners();
  }
}
