import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  static const String _userJsonKey = 'sr_auth_user_json';
  static const String _biometricLockKey = 'sr_biometric_lock_enabled';

  AppUser? _currentUser;
  bool _isLoading = true;
  bool _biometricLockEnabled = false;

  // Whether the current app session has passed its lock screen (biometric or
  // fallback PIN). Irrelevant when biometricLockEnabled is false. A fresh
  // login always starts unlocked; only a later app resume/restart with an
  // existing cached session re-locks.
  bool _isUnlocked = true;

  AppUser? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isAdmin => _currentUser?.role == 'admin';
  bool get isLoading => _isLoading;
  bool get biometricLockEnabled => _biometricLockEnabled;
  bool get isUnlocked => _isUnlocked;
  bool get needsUnlock => isAuthenticated && _biometricLockEnabled && !_isUnlocked;

  AuthProvider() {
    _loadUserSession();
  }

  Future<void> _loadUserSession() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userJsonKey);
    _biometricLockEnabled = prefs.getBool(_biometricLockKey) ?? false;

    if (userJson != null) {
      try {
        _currentUser = AppUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
        // A restored (not freshly-logged-in) session starts locked if the
        // user has biometric lock turned on.
        _isUnlocked = !_biometricLockEnabled;
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
    _isUnlocked = true; // fresh credential entry counts as unlocked

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userJsonKey, jsonEncode(user.toJson()));
    notifyListeners();
  }

  /// Re-verifies the admin PIN against the backend without changing the
  /// active session. Used to unlock admin-only sections (e.g. Reports).
  Future<bool> verifyAdminPin(String pin) async {
    return ApiService.verifyPinOnly('admin', pin);
  }

  /// Enables/disables the biometric app-lock. The caller should already have
  /// confirmed a successful biometric prompt before enabling this.
  Future<void> setBiometricLockEnabled(bool enabled) async {
    _biometricLockEnabled = enabled;
    if (!enabled) _isUnlocked = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_biometricLockKey, enabled);
    notifyListeners();
  }

  /// Called after a successful biometric prompt on the lock screen.
  void markUnlocked() {
    _isUnlocked = true;
    notifyListeners();
  }

  /// Fallback for the lock screen when biometrics aren't used/available:
  /// re-verifies the current user's PIN against the server.
  Future<bool> unlockWithPin(String pin) async {
    final user = _currentUser;
    if (user == null) return false;
    final ok = await ApiService.verifyPinOnly(user.username, pin);
    if (ok) markUnlocked();
    return ok;
  }

  Future<void> logout() async {
    _currentUser = null;
    _isUnlocked = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userJsonKey);
    await ApiService.clearToken();
    notifyListeners();
  }
}
