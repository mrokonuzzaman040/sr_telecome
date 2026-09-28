import 'dart:convert';

class SaleItem {
  final String productId;
  final String productName;
  final String category;
  int quantity;
  final double buyPrice;
  final double mrp;
  double unitDiscount;
  double unitPrice;
  double total;
  double? commissionRate;

  SaleItem({
    required this.productId,
    required this.productName,
    required this.category,
    required this.quantity,
    required this.buyPrice,
    required this.mrp,
    this.unitDiscount = 0.0,
    required this.unitPrice,
    required this.total,
    this.commissionRate,
  });

  void updateQuantity(int newQty) {
    quantity = newQty;
    total = quantity * unitPrice;
  }

  void updateCommission(double rate) {
    commissionRate = rate;
    unitDiscount = (mrp * rate) / 100.0;
    unitPrice = (mrp - unitDiscount).clamp(0.0, double.infinity);
    total = quantity * unitPrice;
  }

  void updateDiscount(double discount) {
    unitDiscount = discount.clamp(0.0, mrp);
    unitPrice = (mrp - unitDiscount).clamp(0.0, double.infinity);
    commissionRate = mrp > 0 ? ((unitDiscount / mrp) * 100.0) : 0.0;
    total = quantity * unitPrice;
  }

  void updateUnitPrice(double newPrice) {
    unitPrice = newPrice.clamp(0.0, double.infinity);
    unitDiscount = (mrp - unitPrice).clamp(0.0, double.infinity);
    commissionRate = mrp > 0 ? ((unitDiscount / mrp) * 100.0) : 0.0;
    total = quantity * unitPrice;
  }

  factory SaleItem.fromJson(Map<String, dynamic> json) {
    final qty = int.tryParse(json['quantity']?.toString() ?? '1') ?? 1;
    final mrpVal = double.tryParse(json['mrp']?.toString() ?? '0') ?? 0.0;
    final unitPriceVal = double.tryParse(json['unitPrice']?.toString() ?? json['unit_price']?.toString() ?? mrpVal.toString()) ?? mrpVal;
    final totalVal = double.tryParse(json['total']?.toString() ?? (qty * unitPriceVal).toString()) ?? (qty * unitPriceVal);

    return SaleItem(
      productId: json['productId']?.toString() ?? json['product_id']?.toString() ?? '',
      productName: json['productName']?.toString() ?? json['product_name']?.toString() ?? '',
      category: json['category']?.toString() ?? 'book',
      quantity: qty,
      buyPrice: double.tryParse(json['buyPrice']?.toString() ?? json['buy_price']?.toString() ?? '0') ?? 0.0,
      mrp: mrpVal,
      unitDiscount: double.tryParse(json['unitDiscount']?.toString() ?? json['unit_discount']?.toString() ?? '0') ?? 0.0,
      unitPrice: unitPriceVal,
      total: totalVal,
      commissionRate: json['commissionRate'] != null
          ? double.tryParse(json['commissionRate'].toString())
          : (json['commission_rate'] != null ? double.tryParse(json['commission_rate'].toString()) : null),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'productName': productName,
      'category': category,
      'quantity': quantity,
      'buyPrice': buyPrice,
      'mrp': mrp,
      'unitDiscount': unitDiscount,
      'unitPrice': unitPrice,
      'total': total,
      'commissionRate': commissionRate,
    };
  }
}

class Sale {
  final String id;
  final String invoiceNo;
  final String? customerId;
  final String customerName;
  final String? customerPhone;
  final String customerType; // 'agent' | 'single'
  final List<SaleItem> items;
  final double subtotal;
  final double totalDiscount;
  final double payableAmount;
  final double paidAmount;
  final double dueAmount;
  final String paymentMethod; // 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'due'
  final Map<String, dynamic>? paymentDetails;
  final double totalCost;
  final double grossProfit;
  final String status;
  final String? notes;
  final String createdAt;

  Sale({
    required this.id,
    required this.invoiceNo,
    this.customerId,
    required this.customerName,
    this.customerPhone,
    this.customerType = 'single',
    required this.items,
    required this.subtotal,
    required this.totalDiscount,
    required this.payableAmount,
    required this.paidAmount,
    required this.dueAmount,
    required this.paymentMethod,
    this.paymentDetails,
    required this.totalCost,
    required this.grossProfit,
    this.status = 'completed',
    this.notes,
    required this.createdAt,
  });

  factory Sale.fromJson(Map<String, dynamic> json) {
    List<SaleItem> parsedItems = [];
    if (json['items'] != null) {
      if (json['items'] is String) {
        try {
          final decoded = jsonDecode(json['items']) as List;
          parsedItems = decoded.map((i) => SaleItem.fromJson(i as Map<String, dynamic>)).toList();
        } catch (_) {}
      } else if (json['items'] is List) {
        parsedItems = (json['items'] as List).map((i) => SaleItem.fromJson(i as Map<String, dynamic>)).toList();
      }
    }

    return Sale(
      id: json['id']?.toString() ?? '',
      invoiceNo: json['invoiceNo']?.toString() ?? json['invoice_no']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? json['customer_id']?.toString(),
      customerName: json['customerName']?.toString() ?? json['customer_name']?.toString() ?? 'Walk-in Customer',
      customerPhone: json['customerPhone']?.toString() ?? json['customer_phone']?.toString(),
      customerType: json['customerType']?.toString() ?? json['customer_type']?.toString() ?? 'single',
      items: parsedItems,
      subtotal: double.tryParse(json['subtotal']?.toString() ?? '0') ?? 0.0,
      totalDiscount: double.tryParse(json['totalDiscount']?.toString() ?? json['total_discount']?.toString() ?? '0') ?? 0.0,
      payableAmount: double.tryParse(json['payableAmount']?.toString() ?? json['payable_amount']?.toString() ?? '0') ?? 0.0,
      paidAmount: double.tryParse(json['paidAmount']?.toString() ?? json['paid_amount']?.toString() ?? '0') ?? 0.0,
      dueAmount: double.tryParse(json['dueAmount']?.toString() ?? json['due_amount']?.toString() ?? '0') ?? 0.0,
      paymentMethod: json['paymentMethod']?.toString() ?? json['payment_method']?.toString() ?? 'cash',
      paymentDetails: json['paymentDetails'] is Map ? Map<String, dynamic>.from(json['paymentDetails']) : null,
      totalCost: double.tryParse(json['totalCost']?.toString() ?? json['total_cost']?.toString() ?? '0') ?? 0.0,
      grossProfit: double.tryParse(json['grossProfit']?.toString() ?? json['gross_profit']?.toString() ?? '0') ?? 0.0,
      status: json['status']?.toString() ?? 'completed',
      notes: json['notes']?.toString(),
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'invoiceNo': invoiceNo,
      'customerId': customerId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'customerType': customerType,
      'items': items.map((i) => i.toJson()).toList(),
      'subtotal': subtotal,
      'totalDiscount': totalDiscount,
      'payableAmount': payableAmount,
      'paidAmount': paidAmount,
      'dueAmount': dueAmount,
      'paymentMethod': paymentMethod,
      'paymentDetails': paymentDetails,
      'totalCost': totalCost,
      'grossProfit': grossProfit,
      'status': status,
      'notes': notes,
      'createdAt': createdAt,
    };
  }
}
