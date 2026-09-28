import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/customer.dart';
import '../models/sale.dart';
import '../models/expense.dart';
import '../services/api_service.dart';

class StoreProvider extends ChangeNotifier {
  List<Product> _products = [];
  List<Customer> _customers = [];
  List<Sale> _sales = [];
  List<Expense> _expenses = [];

  bool _isLoading = false;
  String? _errorMessage;

  // Cart State for POS
  final List<SaleItem> _cart = [];
  Customer? _selectedCustomer;
  String _customerType = 'single'; // 'single' | 'agent'
  double _customDiscount = 0.0;
  String _paymentMethod = 'cash'; // 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'due'
  double _paidAmount = 0.0;
  String? _notes;

  List<Product> get products => _products;
  List<Customer> get customers => _customers;
  List<Sale> get sales => _sales;
  List<Expense> get expenses => _expenses;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<SaleItem> get cart => _cart;
  Customer? get selectedCustomer => _selectedCustomer;
  String get customerType => _customerType;
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

  Future<void> loadAllData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        ApiService.fetchProducts().catchError((_) => <Product>[]),
        ApiService.fetchCustomers().catchError((_) => <Customer>[]),
        ApiService.fetchSales().catchError((_) => <Sale>[]),
        ApiService.fetchExpenses().catchError((_) => <Expense>[]),
      ]);

      _products = results[0] as List<Product>;
      _customers = results[1] as List<Customer>;
      _sales = results[2] as List<Sale>;
      _expenses = results[3] as List<Expense>;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- CART MANAGEMENT ---
  void addToCart(Product product, {int qty = 1}) {
    final existingIndex = _cart.indexWhere((item) => item.productId == product.id);

    if (existingIndex != -1) {
      _cart[existingIndex].quantity += qty;
      _cart[existingIndex].total = _cart[existingIndex].quantity * _cart[existingIndex].unitPrice;
    } else {
      double unitDiscount = 0.0;
      double? rate;

      if (_customerType == 'agent') {
        rate = product.customCommissionRate ?? 30.0; // Default agent commission 30%
        unitDiscount = (product.mrp * rate) / 100.0;
      }

      final unitPrice = product.mrp - unitDiscount;
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

  void setCustomerType(String type) {
    _customerType = type;
    // Re-apply discounts across cart
    for (var item in _cart) {
      if (type == 'agent') {
        item.updateCommission(item.commissionRate ?? 30.0);
      } else {
        item.unitDiscount = 0.0;
        item.unitPrice = item.mrp;
        item.commissionRate = null;
        item.total = item.quantity * item.unitPrice;
      }
    }
    _autoUpdatePaidAmount();
    notifyListeners();
  }

  void selectCustomer(Customer? customer) {
    _selectedCustomer = customer;
    if (customer != null) {
      setCustomerType(customer.type);
    }
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
      notifyListeners();
    }
  }

  // --- ADD EXPENSE ---
  Future<void> addExpense(Expense expense) async {
    final created = await ApiService.createExpense(expense);
    _expenses.insert(0, created);
    notifyListeners();
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
