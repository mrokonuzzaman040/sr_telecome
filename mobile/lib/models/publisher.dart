class Publisher {
  final String id;
  final String name;
  final String? bengaliName;
  final String? code;
  final String? phone;
  final String? address;
  final String? logoUrl;
  final String? notes;
  final double defaultCommissionRate;
  final String? createdAt;

  Publisher({
    required this.id,
    required this.name,
    this.bengaliName,
    this.code,
    this.phone,
    this.address,
    this.logoUrl,
    this.notes,
    this.defaultCommissionRate = 35.0,
    this.createdAt,
  });

  factory Publisher.fromJson(Map<String, dynamic> json) {
    return Publisher(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      bengaliName: json['bengaliName']?.toString() ?? json['bengali_name']?.toString(),
      code: json['code']?.toString(),
      phone: json['phone']?.toString(),
      address: json['address']?.toString(),
      logoUrl: json['logoUrl']?.toString() ?? json['logo_url']?.toString(),
      notes: json['notes']?.toString(),
      defaultCommissionRate: double.tryParse(
            json['defaultCommissionRate']?.toString() ?? json['default_commission_rate']?.toString() ?? '35',
          ) ??
          35.0,
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'bengaliName': bengaliName,
      'code': code,
      'phone': phone,
      'address': address,
      'logoUrl': logoUrl,
      'notes': notes,
      'defaultCommissionRate': defaultCommissionRate,
      'createdAt': createdAt,
    };
  }
}
