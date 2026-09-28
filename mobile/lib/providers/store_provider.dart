import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/customer.dart';
import '../models/sale.dart';
import '../models/expense.dart';
import '../models/publisher.dart';
import '../models/return_record.dart';
import '../services/api_service.dart';

class StoreProvider extends ChangeNotifier {
  List<Product> _products = [];
  List<Customer> _customers = [];
  List<Sale> _sales = [];
  List<Expense> _expenses = [];
  List<Publisher> _publishers = [];
  List<ReturnRecord> _returns = [];

  bool _isLoading = false;
  String? _errorMessage;
  bool _isOffline = false;
  bool _isSessionExpired = false;

  // Bumped only when the matching list actually changes (load / create /
  // update / stock or due adjustment) - lets screens use context.select on a
  // single int to rebuild only when their own data changes, instead of on
  // every notifyListeners() call from unrelated state (e.g. the POS cart).
  int _productsVersion = 0;
  int _customersVersion = 0;
  int _salesVersion = 0;
  int _expensesVersion = 0;
  int _publishersVersion = 0;
  int _returnsVersion = 0;

  int get productsVersion => _productsVersion;
  int get customersVersion => _customersVersion;
  int get salesVersion => _salesVersion;
  int get expensesVersion => _expensesVersion;
  int get publishersVersion => _publishersVersion;
  int get returnsVersion => _returnsVersion;

  // Cart State for POS
  final List<SaleItem> _cart = [];
  Customer? _selectedCustomer;
  String _customerType = 'single'; // 'single' | 'agent'
  double _agentCommissionRate = 30.0;
  String _retailDiscountMode = 'percent'; // 'percent' | 'fixed'
  double _retailDiscountValue = 0.0;
  double _customDiscount = 0.0;
  String _paymentMethod = 'cash'; // 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'due'
  double _paidAmount = 0.0;
  String? _notes;

  List<Product> get products => _products;
  List<Customer> get customers => _customers;
  List<Sale> get sales => _sales;
  List<Expense> get expenses => _expenses;
  List<Publisher> get publishers => _publishers;
  List<ReturnRecord> get returns => _returns;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isOffline => _isOffline;
  bool get isSessionExpired => _isSessionExpired;

  List<SaleItem> get cart => _cart;
  Customer? get selectedCustomer => _selectedCustomer;
  String get customerType => _customerType;
  double get agentCommissionRate => _agentCommissionRate;
  String get retailDiscountMode => _retailDiscountMode;
  double get retailDiscountValue => _retailDiscountValue;
  double get customDiscount => _customDiscount;
  String get paymentMethod => _paymentMethod;
  double get paidAmount => _paidAmount;
  String? get notes => _notes;

  // Cart calculations
  double get cartSubtotal => _cart.fold(0.0, (sum, item) => sum + (item.mrp * item.quantity));
  double get cartItemDiscount => _cart.fold(0.0, (sum, item) => sum + (item.unitDiscount * item.quantity));
  double get cartTotalDiscount => cartItemDiscount + _customDiscount;
  double get cartPayable => (cartSubtotal - cartTotalDiscount).clamp(0.0, double.infinity);
  double get cartDue => (cartPayable - _paidAmount).clamp(0.0, double.infinity);
  int get cartTotalQuantity => _cart.fold(0, (sum, item) => sum + item.quantity);

  // --- OFFLINE CACHE KEYS ---
  static const String _cacheProductsKey = 'sr_cache_products';
  static const String _cacheCustomersKey = 'sr_cache_customers';
  static const String _cacheSalesKey = 'sr_cache_sales';
  static const String _cacheExpensesKey = 'sr_cache_expenses';
  static const String _cachePublishersKey = 'sr_cache_publishers';
  static const String _cacheReturnsKey = 'sr_cache_returns';

  Future<void> _saveOfflineCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheProductsKey, jsonEncode(_products.map((p) => p.toJson()).toList()));
      await prefs.setString(_cacheCustomersKey, jsonEncode(_customers.map((c) => c.toJson()).toList()));
      await prefs.setString(_cacheSalesKey, jsonEncode(_sales.map((s) => s.toJson()).toList()));
      await prefs.setString(_cacheExpensesKey, jsonEncode(_expenses.map((e) => e.toJson()).toList()));
      await prefs.setString(_cachePublishersKey, jsonEncode(_publishers.map((p) => p.toJson()).toList()));
      await prefs.setString(_cacheReturnsKey, jsonEncode(_returns.map((r) => r.toCreatePayload()).toList()));
    } catch (e) {
      debugPrint('Failed to save offline cache: $e');
    }
  }

  Future<bool> _loadOfflineCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pStr = prefs.getString(_cacheProductsKey);
      final cStr = prefs.getString(_cacheCustomersKey);
      final sStr = prefs.getString(_cacheSalesKey);
      final eStr = prefs.getString(_cacheExpensesKey);
      final pubStr = prefs.getString(_cachePublishersKey);
      final rStr = prefs.getString(_cacheReturnsKey);

      bool loadedAny = false;
      if (pStr != null && _products.isEmpty) {
        final List pList = jsonDecode(pStr);
        _products = pList.map((j) => Product.fromJson(j as Map<String, dynamic>)).toList();
        _productsVersion++;
        loadedAny = true;
      }
      if (cStr != null && _customers.isEmpty) {
        final List cList = jsonDecode(cStr);
        _customers = cList.map((j) => Customer.fromJson(j as Map<String, dynamic>)).toList();
        _customersVersion++;
        loadedAny = true;
      }
      if (sStr != null && _sales.isEmpty) {
        final List sList = jsonDecode(sStr);
        _sales = sList.map((j) => Sale.fromJson(j as Map<String, dynamic>)).toList();
        _salesVersion++;
        loadedAny = true;
      }
      if (eStr != null && _expenses.isEmpty) {
        final List eList = jsonDecode(eStr);
        _expenses = eList.map((j) => Expense.fromJson(j as Map<String, dynamic>)).toList();
        _expensesVersion++;
        loadedAny = true;
      }
      if (pubStr != null && _publishers.isEmpty) {
        final List pubList = jsonDecode(pubStr);
        _publishers = pubList.map((j) => Publisher.fromJson(j as Map<String, dynamic>)).toList();
        _publishersVersion++;
        loadedAny = true;
      }
      if (rStr != null && _returns.isEmpty) {
        final List rList = jsonDecode(rStr);
        _returns = rList.map((j) => ReturnRecord.fromJson(j as Map<String, dynamic>)).toList();
        _returnsVersion++;
        loadedAny = true;
      }

      if (loadedAny) {
        _isOffline = true;
      }
      return loadedAny;
    } catch (e) {
      debugPrint('Failed to load offline cache: $e');
      return false;
    }
  }

  Future<void> loadAllData() async {
    _isLoading = true;
    _errorMessage = null;
    _isSessionExpired = false;
    notifyListeners();

    try {
      final token = await ApiService.getToken();
      if (token == null || token.isEmpty) {
        _isSessionExpired = true;
        _errorMessage = 'লগইন মেয়াদ শেষ হয়ে গেছে। পুনরায় লগইন করুন।';
        await _loadOfflineCache();
        return;
      }

      final errors = <String>[];

      // Fetch all core resources with domain-specific error capturing
      final results = await Future.wait([
        ApiService.fetchProducts().catchError((e) {
          if (e is AuthRequiredException) _isSessionExpired = true;
          errors.add('পণ্য (${e.toString().replaceFirst("Exception: ", "")})');
          return <Product>[];
        }),
        ApiService.fetchCustomers().catchError((e) {
          if (e is AuthRequiredException) _isSessionExpired = true;
          errors.add('গ্রাহক');
          return <Customer>[];
        }),
        ApiService.fetchSales().catchError((e) {
          if (e is AuthRequiredException) _isSessionExpired = true;
          errors.add('বিক্রয়');
          return <Sale>[];
        }),
        ApiService.fetchExpenses().catchError((e) {
          if (e is AuthRequiredException) _isSessionExpired = true;
          errors.add('খরচ');
          return <Expense>[];
        }),
        ApiService.fetchPublishers().catchError((e) {
          if (e is AuthRequiredException) _isSessionExpired = true;
          errors.add('প্রকাশনী');
          return <Publisher>[];
        }),
        ApiService.fetchReturns().catchError((e) {
          if (e is AuthRequiredException) _isSessionExpired = true;
          errors.add('ফেরত');
          return <ReturnRecord>[];
        }),
      ]);

      final fetchedProducts = results[0] as List<Product>;
      final fetchedCustomers = results[1] as List<Customer>;
      final fetchedSales = results[2] as List<Sale>;
      final fetchedExpenses = results[3] as List<Expense>;
      final fetchedPublishers = results[4] as List<Publisher>;
      final fetchedReturns = results[5] as List<ReturnRecord>;

      if (fetchedProducts.isNotEmpty || _products.isEmpty) {
        _products = fetchedProducts;
        _productsVersion++;
      }
      if (fetchedCustomers.isNotEmpty || _customers.isEmpty) {
        _customers = fetchedCustomers;
        _customersVersion++;
      }
      if (fetchedSales.isNotEmpty || _sales.isEmpty) {
        _sales = fetchedSales;
        _salesVersion++;
      }
      _expenses = fetchedExpenses;
      _expensesVersion++;
      if (fetchedPublishers.isNotEmpty || _publishers.isEmpty) {
        _publishers = fetchedPublishers;
        _publishersVersion++;
      }
      _returns = fetchedReturns;
      _returnsVersion++;

      if (_isSessionExpired) {
        _errorMessage = 'লগইন সেশনের মেয়াদ শেষ। অনুগ্রহ করে আবার লগইন করুন।';
      } else if (errors.length >= 5) {
        _errorMessage = 'সার্ভার থেকে তথ্য লোড করা যায়নি। ইন্টারনেট সংযোগ বা সার্ভার পরীক্ষা করুন।';
        await _loadOfflineCache();
      } else if (errors.isNotEmpty) {
        _errorMessage = 'কিছু তথ্য সিঙ্ক হয়নি (${errors.join(", ")})';
        _isOffline = false;
        await _saveOfflineCache();
      } else {
        _isOffline = false;
        _errorMessage = null;
        await _saveOfflineCache();
      }
    } catch (e) {
      if (e is AuthRequiredException) {
        _isSessionExpired = true;
        _errorMessage = 'লগইন সেশনের মেয়াদ শেষ। পুনরায় লগইন করুন।';
      } else {
        _errorMessage = 'তথ্য লোড ব্যর্থ: ${e.toString().replaceFirst("Exception: ", "")}';
      }
      await _loadOfflineCache();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- CART MANAGEMENT ---
  void _recalculateCartDiscounts() {
    for (var item in _cart) {
      if (_customerType == 'agent') {
        final rate = item.commissionRate ?? _agentCommissionRate;
        item.updateCommission(rate);
      } else {
        if (_retailDiscountMode == 'percent') {
          final rate = _retailDiscountValue;
          if (rate > 0) {
            item.updateCommission(rate);
          } else {
            item.updateCommission(0.0);
            item.commissionRate = null;
          }
        } else {
          // Fixed mode: items sell at MRP, overall flat discount applied via customDiscount
          item.unitDiscount = 0.0;
          item.unitPrice = item.mrp;
          item.commissionRate = null;
          item.total = item.quantity * item.unitPrice;
        }
      }
    }
    if (_retailDiscountMode == 'fixed' && _customerType == 'single') {
      _customDiscount = _retailDiscountValue;
    } else {
      _customDiscount = 0.0;
    }
    _autoUpdatePaidAmount();
  }

  void addToCart(Product product, {int qty = 1}) {
    final existingIndex = _cart.indexWhere((item) => item.productId == product.id);

    if (existingIndex != -1) {
      _cart[existingIndex].quantity += qty;
      _cart[existingIndex].total = _cart[existingIndex].quantity * _cart[existingIndex].unitPrice;
    } else {
      double unitDiscount = 0.0;
      double? rate;

      if (_customerType == 'agent') {
        rate = product.customCommissionRate ?? _agentCommissionRate;
        unitDiscount = (product.mrp * rate) / 100.0;
      } else {
        if (_retailDiscountMode == 'percent' && _retailDiscountValue > 0) {
          rate = _retailDiscountValue;
          unitDiscount = (product.mrp * rate) / 100.0;
        }
      }

      final unitPrice = (product.mrp - unitDiscount).clamp(0.0, double.infinity);
      _cart.add(SaleItem(
        productId: product.id,
        productName: product.displayName,
        category: product.category,
        quantity: qty,
        buyPrice: product.buyPrice,
        mrp: product.mrp,
        unitDiscount: unitDiscount,
        unitPrice: unitPrice,
        total: qty * unitPrice,
        commissionRate: rate,
      ));
    }

    if (_retailDiscountMode == 'fixed' && _customerType == 'single') {
      _customDiscount = _retailDiscountValue;
    }

    _autoUpdatePaidAmount();
    notifyListeners();
  }

  void updateCartItemQty(String productId, int newQty) {
    if (newQty <= 0) {
      _cart.removeWhere((item) => item.productId == productId);
    } else {
      final index = _cart.indexWhere((item) => item.productId == productId);
      if (index != -1) {
        _cart[index].updateQuantity(newQty);
      }
    }
    _autoUpdatePaidAmount();
    notifyListeners();
  }

  void updateCartItemCommission(String productId, double rate) {
    final index = _cart.indexWhere((item) => item.productId == productId);
    if (index != -1) {
      _cart[index].updateCommission(rate);
      _autoUpdatePaidAmount();
      notifyListeners();
    }
  }

  void updateCartItemDiscount(String productId, double discount) {
    final index = _cart.indexWhere((item) => item.productId == productId);
    if (index != -1) {
      _cart[index].updateDiscount(discount);
      _autoUpdatePaidAmount();
      notifyListeners();
    }
  }

  void updateCartItemUnitPrice(String productId, double unitPrice) {
    final index = _cart.indexWhere((item) => item.productId == productId);
    if (index != -1) {
      _cart[index].updateUnitPrice(unitPrice);
      _autoUpdatePaidAmount();
      notifyListeners();
    }
  }

  void setAgentCommissionRate(double rate) {
    _agentCommissionRate = rate.clamp(0.0, 100.0);
    if (_customerType == 'agent') {
      for (var item in _cart) {
        item.updateCommission(_agentCommissionRate);
      }
      _autoUpdatePaidAmount();
      notifyListeners();
    }
  }

  void setRetailDiscountMode(String mode) {
    _retailDiscountMode = mode;
    _recalculateCartDiscounts();
    notifyListeners();
  }

  void setRetailDiscountValue(double value) {
    _retailDiscountValue = value.clamp(0.0, double.infinity);
    _recalculateCartDiscounts();
    notifyListeners();
  }

  void quickRoundOff() {
    final payable = cartPayable;
    final rounded = (payable / 10).floor() * 10.0;
    final diff = payable - rounded;
    if (diff > 0) {
      _retailDiscountMode = 'fixed';
      _retailDiscountValue += diff;
      _recalculateCartDiscounts();
      notifyListeners();
    }
  }

  void setCustomerType(String type) {
    _customerType = type;
    _recalculateCartDiscounts();
    notifyListeners();
  }

  void selectCustomer(Customer? customer) {
    _selectedCustomer = customer;
    if (customer != null) {
      _customerType = customer.type;
      if (customer.type == 'agent') {
        _agentCommissionRate = customer.defaultCommissionRate ?? 30.0;
      }
    } else {
      _customerType = 'single';
    }
    _recalculateCartDiscounts();
    notifyListeners();
  }

  void setPaymentMethod(String method) {
    _paymentMethod = method;
    if (method == 'due') {
      _paidAmount = 0.0;
    } else {
      _autoUpdatePaidAmount();
    }
    notifyListeners();
  }

  void setPaidAmount(double amount) {
    _paidAmount = amount;
    notifyListeners();
  }

  void setCustomDiscount(double discount) {
    _customDiscount = discount;
    _autoUpdatePaidAmount();
    notifyListeners();
  }

  void _autoUpdatePaidAmount() {
    if (_paymentMethod != 'due') {
      _paidAmount = cartPayable;
    }
  }

  void clearCart() {
    _cart.clear();
    _selectedCustomer = null;
    _customerType = 'single';
    _agentCommissionRate = 30.0;
    _retailDiscountMode = 'percent';
    _retailDiscountValue = 0.0;
    _customDiscount = 0.0;
    _paymentMethod = 'cash';
    _paidAmount = 0.0;
    _notes = null;
    notifyListeners();
  }

  // --- CHECKOUT SALE ---
  Future<Sale> checkoutSale() async {
    if (_cart.isEmpty) throw Exception('Cart is empty');

    final invoiceNum = 'INV-${DateTime.now().year}-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
    final totalCost = _cart.fold(0.0, (sum, i) => sum + (i.buyPrice * i.quantity));
    final grossProfit = cartPayable - totalCost;

    final sale = Sale(
      id: 'sale-${DateTime.now().millisecondsSinceEpoch}',
      invoiceNo: invoiceNum,
      customerId: _selectedCustomer?.id,
      customerName: _selectedCustomer?.name ?? 'Walk-in Customer',
      customerPhone: _selectedCustomer?.phone,
      customerType: _customerType,
      items: List.from(_cart),
      subtotal: cartSubtotal,
      totalDiscount: cartTotalDiscount,
      payableAmount: cartPayable,
      paidAmount: _paidAmount,
      dueAmount: cartDue,
      paymentMethod: _paymentMethod,
      totalCost: totalCost,
      grossProfit: grossProfit,
      createdAt: DateTime.now().toIso8601String(),
    );

    final createdSale = await ApiService.createSale(sale);
    _sales.insert(0, createdSale);
    _salesVersion++;

    // Update local stock quantities
    for (var cartItem in _cart) {
      final pIndex = _products.indexWhere((p) => p.id == cartItem.productId);
      if (pIndex != -1) {
        final p = _products[pIndex];
        _products[pIndex] = Product(
          id: p.id,
          name: p.name,
          bengaliName: p.bengaliName,
          category: p.category,
          barcode: p.barcode,
          sku: p.sku,
          publisher: p.publisher,
          bookClass: p.bookClass,
          subject: p.subject,
          itemType: p.itemType,
          customCommissionRate: p.customCommissionRate,
          editionYear: p.editionYear,
          imageUrl: p.imageUrl,
          buyPrice: p.buyPrice,
          mrp: p.mrp,
          stockQty: (p.stockQty - cartItem.quantity).clamp(0, 999999),
          minStockAlert: p.minStockAlert,
          unit: p.unit,
        );
      }
    }

    _productsVersion++;
    clearCart();
    notifyListeners();
    return createdSale;
  }

  // --- DUE COLLECTION ---
  Future<void> collectDue({
    required Customer customer,
    required double amount,
    required String paymentMethod,
    String? trxId,
  }) async {
    await ApiService.collectDuePayment(
      customerId: customer.id,
      customerName: customer.name,
      amount: amount,
      paymentMethod: paymentMethod,
      trxId: trxId,
    );

    // Update customer locally
    final index = _customers.indexWhere((c) => c.id == customer.id);
    if (index != -1) {
      final c = _customers[index];
      _customers[index] = Customer(
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        type: c.type,
        defaultCommissionRate: c.defaultCommissionRate,
        totalPurchased: c.totalPurchased,
        totalPaid: c.totalPaid + amount,
        currentDue: (c.currentDue - amount).clamp(0.0, double.infinity),
      );
      _customersVersion++;
      notifyListeners();
    }
  }

  // --- ADD EXPENSE ---
  Future<void> addExpense(Expense expense) async {
    final created = await ApiService.createExpense(expense);
    _expenses.insert(0, created);
    _expensesVersion++;
    notifyListeners();
  }

  // --- PRODUCT CRUD ---
  Future<void> addProduct(Product product) async {
    final created = await ApiService.createProduct(product);
    _products.insert(0, created);
    _productsVersion++;
    notifyListeners();
  }

  Future<void> updateProduct(Product product) async {
    final updated = await ApiService.updateProduct(product);
    final index = _products.indexWhere((p) => p.id == updated.id);
    if (index != -1) {
      _products[index] = updated;
    }
    _productsVersion++;
    notifyListeners();
  }

  /// Adds [quantity] units to a product that is already in the catalog.
  ///
  /// Re-uses the create endpoint, whose barcode conflict clause increments
  /// stock server-side, so no extra API call or duplicate row is needed.
  Future<void> addStockToProduct(String productId, int quantity) async {
    if (quantity <= 0) return;
    final index = _products.indexWhere((p) => p.id == productId);
    if (index == -1) return;

    final current = _products[index];
    final updated = await ApiService.createProduct(Product(
      id: current.id,
      name: current.name,
      bengaliName: current.bengaliName,
      category: current.category,
      barcode: current.barcode,
      sku: current.sku,
      publisher: current.publisher,
      bookClass: current.bookClass,
      subject: current.subject,
      itemType: current.itemType,
      customCommissionRate: current.customCommissionRate,
      editionYear: current.editionYear,
      imageUrl: current.imageUrl,
      buyPrice: current.buyPrice,
      mrp: current.mrp,
      stockQty: quantity,
      minStockAlert: current.minStockAlert,
      unit: current.unit,
    ));

    _products[index] = updated;
    _productsVersion++;
    notifyListeners();
  }

  // --- CUSTOMER CRUD ---
  Future<void> addCustomer(Customer customer) async {
    final created = await ApiService.createCustomer(customer);
    _customers.insert(0, created);
    _customersVersion++;
    notifyListeners();
  }

  Future<void> updateCustomer(Customer customer) async {
    final updated = await ApiService.updateCustomer(customer);
    final index = _customers.indexWhere((c) => c.id == updated.id);
    if (index != -1) {
      _customers[index] = updated;
    }
    _customersVersion++;
    notifyListeners();
  }

  // --- PUBLISHER CRUD (server upserts by name) ---
  Future<void> savePublisher(Publisher publisher) async {
    final saved = await ApiService.savePublisher(publisher);
    final index = _publishers.indexWhere((p) => p.id == saved.id || p.name == saved.name);
    if (index != -1) {
      _publishers[index] = saved;
    } else {
      _publishers.insert(0, saved);
    }
    _publishersVersion++;
    notifyListeners();
  }

  // --- RETURNS / EXCHANGE ---
  Future<ReturnRecord> submitReturn(ReturnRecord returnRecord) async {
    final created = await ApiService.createReturn(returnRecord.toCreatePayload());
    _returns.insert(0, created);
    _returnsVersion++;

    // Restock returned items
    for (final item in returnRecord.returnedItems) {
      final index = _products.indexWhere((p) => p.id == item.productId);
      if (index != -1) {
        final p = _products[index];
        _products[index] = Product(
          id: p.id,
          name: p.name,
          bengaliName: p.bengaliName,
          category: p.category,
          barcode: p.barcode,
          sku: p.sku,
          publisher: p.publisher,
          bookClass: p.bookClass,
          subject: p.subject,
          itemType: p.itemType,
          customCommissionRate: p.customCommissionRate,
          editionYear: p.editionYear,
          imageUrl: p.imageUrl,
          buyPrice: p.buyPrice,
          mrp: p.mrp,
          stockQty: p.stockQty + item.quantity,
          minStockAlert: p.minStockAlert,
          unit: p.unit,
        );
      }
    }

    // Decrement stock for replacement items
    for (final item in returnRecord.replacementItems) {
      final index = _products.indexWhere((p) => p.id == item.productId);
      if (index != -1) {
        final p = _products[index];
        _products[index] = Product(
          id: p.id,
          name: p.name,
          bengaliName: p.bengaliName,
          category: p.category,
          barcode: p.barcode,
          sku: p.sku,
          publisher: p.publisher,
          bookClass: p.bookClass,
          subject: p.subject,
          itemType: p.itemType,
          customCommissionRate: p.customCommissionRate,
          editionYear: p.editionYear,
          imageUrl: p.imageUrl,
          buyPrice: p.buyPrice,
          mrp: p.mrp,
          stockQty: (p.stockQty - item.quantity).clamp(0, 999999),
          minStockAlert: p.minStockAlert,
          unit: p.unit,
        );
      }
    }
    _productsVersion++;

    // Reflect due adjustment locally if this return was tied to a real customer
    if (returnRecord.customerId != null && returnRecord.customerId != 'walkin' && returnRecord.priceDifference != 0) {
      final cIndex = _customers.indexWhere((c) => c.id == returnRecord.customerId);
      if (cIndex != -1) {
        final c = _customers[cIndex];
        _customers[cIndex] = Customer(
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          type: c.type,
          defaultCommissionRate: c.defaultCommissionRate,
          totalPurchased: c.totalPurchased,
          totalPaid: c.totalPaid,
          currentDue: (c.currentDue + returnRecord.priceDifference).clamp(0.0, double.infinity),
        );
        _customersVersion++;
      }
    }

    notifyListeners();
    return created;
  }

  // Find product by barcode
  Product? findByBarcode(String barcode) {
    try {
      return _products.firstWhere(
        (p) => p.barcode.trim().toLowerCase() == barcode.trim().toLowerCase(),
      );
    } catch (_) {
      return null;
    }
  }
}
