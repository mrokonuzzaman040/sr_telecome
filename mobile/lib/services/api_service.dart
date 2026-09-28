import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/customer.dart';
import '../models/sale.dart';
import '../models/expense.dart';
import '../models/publisher.dart';
import '../models/user.dart';

class ApiService {
  static const String _tokenKey = 'sr_auth_token';

  // Production API (Vercel deployment). Fixed - not user-configurable.
  static const String baseUrl = 'https://srtelecom.vercel.app';

  // --- SESSION TOKEN (Bearer auth for the Flutter client) ---
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
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static String _extractError(http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded['error'] != null) return decoded['error'].toString();
    } catch (_) {}
    if (res.statusCode == 401) return 'সেশনের মেয়াদ শেষ হয়ে গেছে, আবার লগইন করুন';
    return 'HTTP ${res.statusCode}';
  }

  // --- AUTH ---
  static Future<Map<String, dynamic>> _rawLogin(String username, String pin) async {
    final url = Uri.parse('$baseUrl/api/auth/login');
    final res = await http
        .post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'username': username, 'pin': pin}),
        )
        .timeout(const Duration(seconds: 10));
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Logs in and persists the session token for subsequent authenticated requests.
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

  /// Verifies credentials only (e.g. to unlock an admin-only section) without
  /// touching the currently persisted session token.
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
    final url = Uri.parse('$baseUrl/api/products');
    final res = await http.get(url, headers: await _authHeaders()).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Product.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load products: ${_extractError(res)}');
    }
  }

  static Future<Product> createProduct(Product product) async {
    final url = Uri.parse('$baseUrl/api/products');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(product.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Product.fromJson(decoded['product'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to save product: ${_extractError(res)}');
    }
  }

  static Future<Product> updateProduct(Product product) async {
    final url = Uri.parse('$baseUrl/api/products');
    final res = await http.put(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(product.toJson()),
    );

    if (res.statusCode == 200) {
      final decoded = jsonDecode(res.body);
      return Product.fromJson(decoded['product'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to update product: ${_extractError(res)}');
    }
  }

  // --- CUSTOMERS ---
  static Future<List<Customer>> fetchCustomers() async {
    final url = Uri.parse('$baseUrl/api/customers');
    final res = await http.get(url, headers: await _authHeaders()).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Customer.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load customers: ${_extractError(res)}');
    }
  }

  static Future<Customer> createCustomer(Customer customer) async {
    final url = Uri.parse('$baseUrl/api/customers');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(customer.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Customer.fromJson(decoded['customer'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create customer: ${_extractError(res)}');
    }
  }

  static Future<Customer> updateCustomer(Customer customer) async {
    final url = Uri.parse('$baseUrl/api/customers');
    final res = await http.put(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(customer.toJson()),
    );

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
    final url = Uri.parse('$baseUrl/api/due-payments');
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
    );

    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to collect due: ${_extractError(res)}');
    }
  }

  // --- SALES / POS CHECKOUT ---
  static Future<List<Sale>> fetchSales() async {
    final url = Uri.parse('$baseUrl/api/sales');
    final res = await http.get(url, headers: await _authHeaders()).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Sale.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load sales: ${_extractError(res)}');
    }
  }

  static Future<Sale> createSale(Sale sale) async {
    final url = Uri.parse('$baseUrl/api/sales');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(sale.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Sale.fromJson(decoded['sale'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to process sale: ${_extractError(res)}');
    }
  }

  // --- EXPENSES ---
  static Future<List<Expense>> fetchExpenses() async {
    final url = Uri.parse('$baseUrl/api/expenses');
    final res = await http.get(url, headers: await _authHeaders()).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Expense.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load expenses: ${_extractError(res)}');
    }
  }

  static Future<Expense> createExpense(Expense expense) async {
    final url = Uri.parse('$baseUrl/api/expenses');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(expense.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Expense.fromJson(decoded['expense'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create expense: ${_extractError(res)}');
    }
  }

  // --- PUBLISHERS ---
  static Future<List<Publisher>> fetchPublishers() async {
    final url = Uri.parse('$baseUrl/api/publishers');
    final res = await http.get(url, headers: await _authHeaders()).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Publisher.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load publishers: ${_extractError(res)}');
    }
  }

  // Server upserts by publisher name (ON CONFLICT), so this same call both
  // creates a new publisher and saves edits to an existing one.
  static Future<Publisher> savePublisher(Publisher publisher) async {
    final url = Uri.parse('$baseUrl/api/publishers');
    final res = await http.post(
      url,
      headers: await _authHeaders(),
      body: jsonEncode(publisher.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = jsonDecode(res.body);
      return Publisher.fromJson(decoded['publisher'] as Map<String, dynamic>);
    } else {
      throw Exception('Failed to save publisher: ${_extractError(res)}');
    }
  }
}
