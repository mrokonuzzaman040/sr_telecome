import 'dart:async';
import 'package:flutter/material.dart';
import 'api_service.dart';

class AppNotification {
  final String id;
  final String type;
  final String title;
  final String message;
  final Map<String, dynamic>? metadata;
  final bool isRead;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.metadata,
    required this.isRead,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'system',
      title: json['title']?.toString() ?? 'নতুন নোটিফিকেশন',
      message: json['message']?.toString() ?? '',
      metadata: json['metadata'] is Map ? json['metadata'] as Map<String, dynamic> : null,
      isRead: json['read'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class NotificationService extends ChangeNotifier {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  Timer? _pollingTimer;

  List<AppNotification> get notifications => _notifications;
  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  bool get isLoading => _isLoading;

  /// Start periodic sync for sale notifications when user is logged in
  void startListening() {
    refreshNotifications();
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      refreshNotifications();
    });
  }

  void stopListening() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> refreshNotifications() async {
    try {
      final rawList = await ApiService.fetchNotifications();
      _notifications = rawList.map((j) => AppNotification.fromJson(j)).toList();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> markAsRead(String id) async {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      final old = _notifications[index];
      _notifications[index] = AppNotification(
        id: old.id,
        type: old.type,
        title: old.title,
        message: old.message,
        metadata: old.metadata,
        isRead: true,
        createdAt: old.createdAt,
      );
      notifyListeners();
      await ApiService.markNotificationsRead(id: id);
    }
  }

  Future<void> markAllAsRead() async {
    _notifications = _notifications
        .map((n) => AppNotification(
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              metadata: n.metadata,
              isRead: true,
              createdAt: n.createdAt,
            ))
        .toList();
    notifyListeners();
    await ApiService.markNotificationsRead(all: true);
  }

  /// Show an in-app banner for a newly arrived sale
  static void showSaleAlert(BuildContext context, {required String invoiceNo, required double amount, String? customer}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF047857), // emerald 700
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 4),
        content: Row(
          children: [
            const Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '💰 নতুন বিক্রয়: #$invoiceNo',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                  ),
                  Text(
                    '${customer != null ? '$customer | ' : ''}পরিমাণ: ৳${amount.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 12, color: Color(0xFFD1FAE5)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
