class Customer {
  final String id;
  final String name;
  final String phone;
  final String? address;
  final String type; // 'agent' | 'single'
  final double defaultCommissionRate;
  final double totalPurchased;
  final double totalPaid;
  final double currentDue;
  final String? createdAt;

  Customer({
    required this.id,
    required this.name,
    required this.phone,
    this.address,
    this.type = 'single',
    this.defaultCommissionRate = 0.0,
    this.totalPurchased = 0.0,
    this.totalPaid = 0.0,
    this.currentDue = 0.0,
    this.createdAt,
  });

  bool get isAgent => type == 'agent';

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      address: json['address']?.toString(),
      type: json['type']?.toString() ?? 'single',
      defaultCommissionRate: double.tryParse(json['defaultCommissionRate']?.toString() ?? json['default_commission_rate']?.toString() ?? '0') ?? 0.0,
      totalPurchased: double.tryParse(json['totalPurchased']?.toString() ?? json['total_purchased']?.toString() ?? '0') ?? 0.0,
      totalPaid: double.tryParse(json['totalPaid']?.toString() ?? json['total_paid']?.toString() ?? '0') ?? 0.0,
      currentDue: double.tryParse(json['currentDue']?.toString() ?? json['current_due']?.toString() ?? '0') ?? 0.0,
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'address': address,
      'type': type,
      'defaultCommissionRate': defaultCommissionRate,
      'totalPurchased': totalPurchased,
      'totalPaid': totalPaid,
      'currentDue': currentDue,
      'createdAt': createdAt,
    };
  }
}
