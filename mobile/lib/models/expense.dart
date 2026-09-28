class Expense {
  final String id;
  final String title;
  final String category; // 'rent' | 'electricity' | 'staff' | 'transport' | 'entertainment' | 'stationery_use' | 'other'
  final double amount;
  final String date; // YYYY-MM-DD
  final String? notes;
  final String? createdAt;

  Expense({
    required this.id,
    required this.title,
    required this.category,
    required this.amount,
    required this.date,
    this.notes,
    this.createdAt,
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      category: json['category']?.toString() ?? 'other',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      date: json['date']?.toString() ?? DateTime.now().toIso8601String().split('T')[0],
      notes: json['notes']?.toString(),
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'category': category,
      'amount': amount,
      'date': date,
      'notes': notes,
      'createdAt': createdAt,
    };
  }
}
