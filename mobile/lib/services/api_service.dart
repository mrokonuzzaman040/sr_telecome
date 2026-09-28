import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/customer.dart';
import '../models/sale.dart';
import '../models/expense.dart';

class ApiService {
  static const String _defaultUrlKey = 'sr_api_base_url';
  // 10.0.2.2 is Android emulator localhost alias. On physical phones, users enter LAN IP like 192.168.0.x:3000
  static const String defaultBaseUrl = 'http://10.0.2.2:3000';

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_defaultUrlKey) ?? defaultBaseUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_defaultUrlKey, url.trim().replaceAll(RegExp(r'/+$'), ''));
  }

  // --- PRODUCTS ---
  static Future<List<Product>> fetchProducts() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/products');
    final res = await http.get(url).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Product.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load products: ${res.statusCode} ${res.body}');
    }
  }

  static Future<Product> saveProduct(Product product) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/products');
    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(product.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      return Product.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to save product: ${res.body}');
    }
  }

  // --- CUSTOMERS ---
  static Future<List<Customer>> fetchCustomers() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/customers');
    final res = await http.get(url).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Customer.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load customers: ${res.statusCode}');
    }
  }

  static Future<Customer> createCustomer(Customer customer) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/customers');
    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(customer.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      return Customer.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to create customer: ${res.body}');
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
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/due-payments');
    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
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
      throw Exception('Failed to collect due: ${res.body}');
    }
  }

  // --- SALES / POS CHECKOUT ---
  static Future<List<Sale>> fetchSales() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/sales');
    final res = await http.get(url).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Sale.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load sales: ${res.statusCode}');
    }
  }

  static Future<Sale> createSale(Sale sale) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/sales');
    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(sale.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      return Sale.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to process sale: ${res.body}');
    }
  }

  // --- EXPENSES ---
  static Future<List<Expense>> fetchExpenses() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/expenses');
    final res = await http.get(url).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((json) => Expense.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load expenses: ${res.statusCode}');
    }
  }

  static Future<Expense> createExpense(Expense expense) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/api/expenses');
    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(expense.toJson()),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      return Expense.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to create expense: ${res.body}');
    }
  }
}
