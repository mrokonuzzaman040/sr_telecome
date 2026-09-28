class ReturnItem {
  final String productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double? mrp;
  final double? commissionRate;
  final double? unitDiscount;
  final int? originalSoldQty;

  ReturnItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    this.mrp,
    this.commissionRate,
    this.unitDiscount,
    this.originalSoldQty,
  });

  double get total => quantity * unitPrice;

  factory ReturnItem.fromJson(Map<String, dynamic> json) {
    final qty = int.tryParse(json['quantity']?.toString() ?? '1') ?? 1;
    final price = double.tryParse(json['unitPrice']?.toString() ?? json['unit_price']?.toString() ?? '0') ?? 0.0;
    final mrpVal = json['mrp'] != null ? double.tryParse(json['mrp'].toString()) : price;

    return ReturnItem(
      productId: json['productId']?.toString() ?? json['product_id']?.toString() ?? '',
      productName: json['productName']?.toString() ?? json['product_name']?.toString() ?? '',
      quantity: qty,
      unitPrice: price,
      mrp: mrpVal,
      commissionRate: json['commissionRate'] != null ? double.tryParse(json['commissionRate'].toString()) : null,
      unitDiscount: json['unitDiscount'] != null ? double.tryParse(json['unitDiscount'].toString()) : null,
      originalSoldQty: json['originalSoldQty'] != null ? int.tryParse(json['originalSoldQty'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'mrp': mrp ?? unitPrice,
      'commissionRate': commissionRate,
      'unitDiscount': unitDiscount,
      'totalRefundValue': total,
      'totalValue': total,
      'originalSoldQty': originalSoldQty,
    };
  }
}

class ReturnRecord {
  final String id;
  final String? invoiceId;
  final String? invoiceNo;
  final String? customerId;
  final String customerName;
  final String? customerPhone;
  final String returnType; // 'exchange' | 'refund' | 'replacement'
  final List<ReturnItem> returnedItems;
  final List<ReturnItem> replacementItems;
  final String? adjustmentType; // 'cash' | 'due_deduct'
  final String reason;
  final double priceDifference;
  final String? createdAt;

  ReturnRecord({
    required this.id,
    this.invoiceId,
    this.invoiceNo,
    this.customerId,
    required this.customerName,
    this.customerPhone,
    this.returnType = 'refund',
    this.returnedItems = const [],
    this.replacementItems = const [],
    this.adjustmentType = 'cash',
    this.reason = '',
    this.priceDifference = 0.0,
    this.createdAt,
  });

  double get totalRefundCredit => returnedItems.fold(0.0, (sum, i) => sum + i.total);
  double get totalReplacementValue => replacementItems.fold(0.0, (sum, i) => sum + i.total);

  factory ReturnRecord.fromJson(Map<String, dynamic> json) {
    List<ReturnItem> parseItems(dynamic raw) {
      if (raw is List) {
        return raw
            .whereType<Map>()
            .map((e) => ReturnItem.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      return [];
    }

    return ReturnRecord(
      id: json['id']?.toString() ?? '',
      invoiceId: json['invoiceId']?.toString() ?? json['invoice_id']?.toString(),
      invoiceNo: json['invoiceNo']?.toString() ?? json['invoice_no']?.toString(),
      customerId: json['customerId']?.toString() ?? json['customer_id']?.toString(),
      customerName: json['customerName']?.toString() ?? json['customer_name']?.toString() ?? 'Walk-in Retail Customer',
      customerPhone: json['customerPhone']?.toString() ?? json['customer_phone']?.toString(),
      returnType: json['returnType']?.toString() ?? json['return_type']?.toString() ?? 'refund',
      returnedItems: parseItems(json['returnedItems'] ?? json['returned_items']),
      replacementItems: parseItems(json['replacementItems'] ?? json['replacement_items']),
      adjustmentType: json['adjustmentType']?.toString() ?? json['adjustment_type']?.toString() ?? 'cash',
      reason: json['reason']?.toString() ?? '',
      priceDifference: double.tryParse(json['priceDifference']?.toString() ?? json['price_difference']?.toString() ?? '0') ?? 0.0,
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toCreatePayload() {
    return {
      'id': id,
      'invoiceId': invoiceId ?? 'DIRECT-COUNTER',
      'invoiceNo': invoiceNo ?? 'COUNTER-RETURN',
      'customerId': customerId ?? 'walkin',
      'customerName': customerName,
      'customerPhone': customerPhone,
      'returnType': returnType,
      'returnedItems': returnedItems.map((i) => i.toJson()).toList(),
      'returnedItem': returnedItems.isNotEmpty ? returnedItems.first.toJson() : null,
      'replacementItems': replacementItems.map((i) => i.toJson()).toList(),
      'replacementItem': replacementItems.isNotEmpty ? replacementItems.first.toJson() : null,
      'totalRefundCredit': totalRefundCredit,
      'totalReplacementValue': totalReplacementValue,
      'adjustmentType': adjustmentType ?? 'cash',
      'reason': reason,
      'priceDifference': priceDifference,
    };
  }
}
