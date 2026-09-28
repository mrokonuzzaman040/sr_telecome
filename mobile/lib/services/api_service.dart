import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/customer.dart';
import '../models/sale.dart';
import '../models/expense.dart';
import '../models/publisher.dart';
import '../models/return_record.dart';
import '../models/user.dart';

class AuthRequiredException implements Exception {
  final String message;
  const AuthRequiredException([this.message = 'সেশনের মেয়াদ শেষ হয়ে গেছে। পুনরায় লগইন করুন।']);
  @override
  String toString() => message;
}

class ApiService {
  static const String _tokenKey = 'sr_auth_token';
  static const String _baseUrlKey = 'sr_api_base_url';

  // Default production API (Vercel deployment)
  static const String defaultBaseUrl = 'https://srtelecom.vercel.app';
  static String _cachedBaseUrl = defaultBaseUrl;

  // Mobile networks need a generous timeout for Vercel serverless cold starts
  static const Duration defaultTimeout = Duration(seconds: 25);

  // --- BASE URL MANAGEMENT ---
  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    _cachedBaseUrl = prefs.getString(_baseUrlKey) ?? defaultBaseUrl;
    return _cachedBaseUrl;
  }

  static Future<void> setBaseUrl(String newUrl) async {
    final clean = newUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, clean);
    _cachedBaseUrl = clean;
  }

  static String get baseUrl => _cachedBaseUrl;

  /// Pings the API server and measures latency
  static Future<Map<String, dynamic>> testConnection([String? testUrl]) async {
    final target = testUrl != null
        ? testUrl.trim().replaceAll(RegExp(r'/+$'), '')
        : await getBaseUrl();
    final sw = Stopwatch()..start();
    try {
      final res = await http
          .get(Uri.parse('$target/api/auth/login'))
          .timeout(const Duration(seconds: 10));
      sw.stop();
      final ok = res.statusCode < 500;
      return {
        'success': ok,
        'latencyMs': sw.elapsedMilliseconds,
        'statusCode': res.statusCode,
        'message': ok
            ? 'সার্ভার সংযুক্ত (${sw.elapsedMilliseconds}ms)'
            : 'সার্ভার সমস্যা (HTTP ${res.statusCode})',
      };
    } catch (e) {
      sw.stop();
      return {
        'success': false,
        'latencyMs': sw.elapsedMilliseconds,
        'message': 'সংযোগ ব্যর্থ: ${e.toString().replaceFirst("Exception: ", "")}',
      };
    }
  }

  // --- SESSION TOKEN ---
  static Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  static String _extractError(http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded['error'] != null) return decoded['error'].toString();
    } catch (_) {}
    if (res.statusCode == 401) return 'সেশনের মেয়াদ শেষ হয়ে গেছে, আবার লগইন করুন';
    if (res.statusCode == 403) return 'অনুমোদন নেই (Forbidden)';
    if (res.statusCode == 404) return 'রিসোর্স পাওয়া যায়নি (Not Found)';
    if (res.statusCode >= 500) return 'সার্ভার ত্রুটি (HTTP ${res.statusCode})';
    return 'HTTP ${res.statusCode}';
  }

  static void _check401(http.Response res) {
    if (res.statusCode == 401) {
      throw AuthRequiredException(_extractError(res));
    }
  }

  // --- AUTH ---
  static Future<Map<String, dynamic>> _rawLogin(String username, String pin) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/auth/login');
    final res = await http
        .post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'username': username, 'pin': pin}),
        )
        .timeout(defaultTimeout);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  static Future<AppUser> login(String username, String pin) async {
    final decoded = await _rawLogin(username, pin);
    if (decoded['user'] != null) {
      if (decoded['token'] != null) {
        await _saveToken(decoded['token'].toString());
      }
      return AppUser.fromJson(decoded['user'] as Map<String, dynamic>);
    }
    throw Exception(decoded['error']?.toString() ?? 'লগইন ব্যর্থ হয়েছে');
  }

  static Future<bool> verifyPinOnly(String username, String pin) async {
    try {
      final decoded = await _rawLogin(username, pin);
      return decoded['user'] != null;
    } catch (_) {
      return false;
    }
  }

  // --- PRODUCTS ---
  static Future<List<Product>> fetchProducts() async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/products');
    final res = await http.get(url, headers: await _authHeaders()).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Product.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load products: ${_extractError(res)}');
    }
  }

  static Future<Product> createProduct(Product product) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/products');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(product.toJson()),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Product.fromJson(decoded['product'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to save product: ${_extractError(res)}');
    }
  }

  static Future<Product> updateProduct(Product product) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/products');
    final res = await http.put(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(product.toJson()),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final decoded = jsonDecode(res.body);
      return Product.fromJson(decoded['product'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to update product: ${_extractError(res)}');
    }
  }

  // --- CUSTOMERS ---
  static Future<List<Customer>> fetchCustomers() async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/customers');
    final res = await http.get(url, headers: await _authHeaders()).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Customer.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load customers: ${_extractError(res)}');
    }
  }

  static Future<Customer> createCustomer(Customer customer) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/customers');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(customer.toJson()),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Customer.fromJson(decoded['customer'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create customer: ${_extractError(res)}');
    }
  }

  static Future<Customer> updateCustomer(Customer customer) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/customers');
    final res = await http.put(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(customer.toJson()),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final decoded = jsonDecode(res.body);
      return Customer.fromJson(decoded['customer'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to update customer: ${_extractError(res)}');
    }
  }

  // --- DUE PAYMENT COLLECTION ---
  static Future<void> collectDuePayment({
    required String customerId,
    required String customerName,
    required double amount,
    required String paymentMethod,
    String? trxId,
    String? notes,
  }) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/due-payments');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode({
        'customerId': customerId,
        'customerName': customerName,
        'amount': amount,
        'paymentMethod': paymentMethod,
        'trxId': trxId,
        'notes': notes,
      }),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to collect due: ${_extractError(res)}');
    }
  }

  // --- SALES / POS CHECKOUT ---
  static Future<List<Sale>> fetchSales() async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/sales');
    final res = await http.get(url, headers: await _authHeaders()).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Sale.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load sales: ${_extractError(res)}');
    }
  }

  static Future<Sale> createSale(Sale sale) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/sales');
    
    debugPrint('📡 POST request to: $url');
    debugPrint('📦 Request body: ${sale.toJson()}');
    
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(sale.toJson()),
    ).timeout(defaultTimeout);

    debugPrint('📡 Response status: ${res.statusCode}');
    debugPrint('📡 Response body: ${res.body}');

    _check401(res);
    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      debugPrint('✅ Sale created successfully: ${decoded['sale']}');
      return Sale.fromJson(decoded['sale'] as Map<String, dynamic>);
    } else {
      debugPrint('❌ Failed to create sale. Status: ${res.statusCode}, Body: ${res.body}');
      throw Exception('Failed to process sale: ${_extractError(res)}');
    }
  }

  // --- EXPENSES ---
  static Future<List<Expense>> fetchExpenses() async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/expenses');
    final res = await http.get(url, headers: await _authHeaders()).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Expense.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load expenses: ${_extractError(res)}');
    }
  }

  static Future<Expense> createExpense(Expense expense) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/expenses');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(expense.toJson()),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Expense.fromJson(decoded['expense'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create expense: ${_extractError(res)}');
    }
  }

  // --- PUBLISHERS ---
  static Future<List<Publisher>> fetchPublishers() async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/publishers');
    final res = await http.get(url, headers: await _authHeaders()).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Publisher.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load publishers: ${_extractError(res)}');
    }
  }

  static Future<Publisher> savePublisher(Publisher publisher) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/publishers');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(publisher.toJson()),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Publisher.fromJson(decoded['publisher'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to save publisher: ${_extractError(res)}');
    }
  }

  // --- RETURNS / EXCHANGE ---
  static Future<List<ReturnRecord>> fetchReturns() async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/returns');
    final res = await http.get(url, headers: await _authHeaders()).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => ReturnRecord.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load returns: ${_extractError(res)}');
    }
  }

  static Future<ReturnRecord> createReturn(Map<String, dynamic> payload) async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/returns');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(payload),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return ReturnRecord.fromJson(decoded['returnRecord'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to save return: ${_extractError(res)}');
    }
  }

  // --- BACKUPS (admin only) ---
  static Future<List<Map<String, dynamic>>> fetchBackups() async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/backups');
    final res = await http.get(url, headers: await _authHeaders()).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load backups: ${_extractError(res)}');
    }
  }

  static Future<Map<String, dynamic>> triggerBackup() async {
    final base = await getBaseUrl();
    final url = Uri.parse('$base/api/backups');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode({'backupType': 'manual'}),
    ).timeout(defaultTimeout);

    _check401(res);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to create backup: ${_extractError(res)}');
    }
  }

  // --- NOTIFICATIONS & FCM DEVICE TOKENS ---
  static Future<bool> registerDeviceToken({
    required String token,
    String? deviceName,
    String platform = 'android',
  }) async {
    try {
      final base = await getBaseUrl();
      final url = Uri.parse('$base/api/notifications/register-token');
      final res = await http.post(
        url,
        headers: await _authHeaders(),
        body: jsonEncode({
          'token': token,
          'deviceName': deviceName ?? 'Android Device',
          'platform': platform,
        }),
      ).timeout(const Duration(seconds: 10));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<List<Map<String, dynamic>>> fetchNotifications() async {
    try {
      final base = await getBaseUrl();
      final url = Uri.parse('$base/api/notifications');
      final res = await http.get(url, headers: await _authHeaders()).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.cast<Map<String, dynamic>>();
      }
    } catch (_) {}
    return [];
  }

  static Future<bool> markNotificationsRead({String? id, bool all = false}) async {
    try {
      final base = await getBaseUrl();
      final url = Uri.parse('$base/api/notifications');
      final res = await http.patch(
        url,
        headers: await _authHeaders(),
        body: jsonEncode({'id': id, 'all': all}),
      ).timeout(const Duration(seconds: 10));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
