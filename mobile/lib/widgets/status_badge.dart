import 'package:flutter/material.dart';

/// Small rounded pill for status/category labels (stock level, account type,
/// payment method, etc.) - replaces the ad-hoc Container+BoxDecoration copies
/// that were duplicated across every list screen with slightly different
/// padding/radius each time.
class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;
  final bool bold;

  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.bold = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: bold ? FontWeight.bold : FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
