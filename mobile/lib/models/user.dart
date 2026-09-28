class AppUser {
  final String id;
  final String name;
  final String username;
  final String role; // 'admin' | 'staff'
  final String pin;

  AppUser({
    required this.id,
    required this.name,
    required this.username,
    required this.role,
    required this.pin,
  });

  bool get isAdmin => role == 'admin';

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      role: json['role']?.toString() ?? 'staff',
      pin: json['pin']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'username': username,
      'role': role,
      'pin': pin,
    };
  }
}
