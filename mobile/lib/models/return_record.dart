class ReturnItem {
  final String productId;
  final String productName;
  final int quantity;
  final double unitPrice;

  ReturnItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
  });

  double get total => quantity * unitPrice;

  factory ReturnItem.fromJson(Map<String, dynamic> json) {
    return ReturnItem(
      productId: json['productId']?.toString() ?? '',
      productName: json['productName']?.toString() ?? '',
      quantity: int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      unitPrice: double.tryParse(json['unitPrice']?.toString() ?? '0') ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'totalRefundValue': total,
      'totalValue': total,
    };
  }
}

class ReturnRecord {
  final String id;
  final String? invoiceId;
  final String? invoiceNo;
  final String? customerId;
  final String customerName;
  final String returnType; // 'exchange' | 'refund'
  final List<ReturnItem> returnedItems;
  final List<ReturnItem> replacementItems;
  final String reason;
  final double priceDifference;
  final String? createdAt;

  ReturnRecord({
    required this.id,
    this.invoiceId,
    this.invoiceNo,
    this.customerId,
    required this.customerName,
    this.returnType = 'refund',
    this.returnedItems = const [],
    this.replacementItems = const [],
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
      returnType: json['returnType']?.toString() ?? json['return_type']?.toString() ?? 'refund',
      returnedItems: parseItems(json['returnedItems']),
      replacementItems: parseItems(json['replacementItems']),
      reason: json['reason']?.toString() ?? '',
      priceDifference: double.tryParse(json['priceDifference']?.toString() ?? json['price_difference']?.toString() ?? '0') ?? 0.0,
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toCreatePayload() {
    return {
      'id': id,
      'invoiceId': invoiceId,
      'invoiceNo': invoiceNo,
      'customerId': customerId ?? 'walkin',
      'customerName': customerName,
      'returnType': returnType,
      'returnedItems': returnedItems.map((i) => i.toJson()).toList(),
      'replacementItems': replacementItems.map((i) => i.toJson()).toList(),
      'reason': reason,
      'priceDifference': priceDifference,
    };
  }
}
