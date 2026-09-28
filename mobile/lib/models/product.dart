class Product {
  final String id;
  final String name;
  final String? bengaliName;
  final String category; // 'book' | 'stationery'
  final String barcode;
  final String sku;
  final String? publisher;
  final String? bookClass;
  final String? subject;
  final String? itemType;
  final double? customCommissionRate;
  final String editionYear;
  final String? imageUrl;
  final double buyPrice;
  final double mrp;
  final int stockQty;
  final int minStockAlert;
  final String unit;
  final String? createdAt;
  final String? updatedAt;

  Product({
    required this.id,
    required this.name,
    this.bengaliName,
    required this.category,
    required this.barcode,
    required this.sku,
    this.publisher,
    this.bookClass,
    this.subject,
    this.itemType,
    this.customCommissionRate,
    this.editionYear = '2026',
    this.imageUrl,
    required this.buyPrice,
    required this.mrp,
    required this.stockQty,
    this.minStockAlert = 5,
    this.unit = 'Piece',
    this.createdAt,
    this.updatedAt,
  });

  bool get isLowStock => stockQty <= minStockAlert;
  String get displayName => bengaliName?.isNotEmpty == true ? '$bengaliName ($name)' : name;

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      bengaliName: json['bengaliName']?.toString() ?? json['bengali_name']?.toString(),
      category: json['category']?.toString() ?? 'book',
      barcode: json['barcode']?.toString() ?? '',
      sku: json['sku']?.toString() ?? '',
      publisher: json['publisher']?.toString(),
      bookClass: json['bookClass']?.toString() ?? json['book_class']?.toString(),
      subject: json['subject']?.toString(),
      itemType: json['itemType']?.toString() ?? json['item_type']?.toString(),
      customCommissionRate: json['customCommissionRate'] != null
          ? double.tryParse(json['customCommissionRate'].toString())
          : (json['custom_commission_rate'] != null ? double.tryParse(json['custom_commission_rate'].toString()) : null),
      editionYear: json['editionYear']?.toString() ?? json['edition_year']?.toString() ?? '2026',
      imageUrl: json['imageUrl']?.toString() ?? json['image_url']?.toString(),
      buyPrice: double.tryParse(json['buyPrice']?.toString() ?? json['buy_price']?.toString() ?? '0') ?? 0.0,
      mrp: double.tryParse(json['mrp']?.toString() ?? '0') ?? 0.0,
      stockQty: int.tryParse(json['stockQty']?.toString() ?? json['stock_qty']?.toString() ?? '0') ?? 0,
      minStockAlert: int.tryParse(json['minStockAlert']?.toString() ?? json['min_stock_alert']?.toString() ?? '5') ?? 5,
      unit: json['unit']?.toString() ?? 'Piece',
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString(),
      updatedAt: json['updatedAt']?.toString() ?? json['updated_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'bengaliName': bengaliName,
      'category': category,
      'barcode': barcode,
      'sku': sku,
      'publisher': publisher,
      'bookClass': bookClass,
      'subject': subject,
      'itemType': itemType,
      'customCommissionRate': customCommissionRate,
      'editionYear': editionYear,
      'imageUrl': imageUrl,
      'buyPrice': buyPrice,
      'mrp': mrp,
      'stockQty': stockQty,
      'minStockAlert': minStockAlert,
      'unit': unit,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}
