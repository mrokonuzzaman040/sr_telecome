import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Consistent "nothing here" placeholder for lists: icon in a soft circle,
/// message, and an optional action - used instead of a bare grey Text widget.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyState({
    super.key,
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppTheme.textFaint.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 40, color: AppTheme.textFaint),
          ),
          const SizedBox(height: 14),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 13.5, fontWeight: FontWeight.w500),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
