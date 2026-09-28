import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Redesigned metric tile: colored icon badge + big value + label, with a
/// soft shadow instead of a hairline border. Used across Dashboard, Inventory,
/// Customers, Reports for a single consistent "stat card" look.
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? sublabel;
  final VoidCallback? onTap;
  final bool selected;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.sublabel,
    this.onTap,
    this.selected = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            border: Border.all(
              color: selected ? color : AppTheme.border,
              width: selected ? 1.5 : 1,
            ),
            boxShadow: AppTheme.softShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: color, size: 18),
                  ),
                  if (selected)
                    Icon(Icons.check_circle, color: color, size: 16),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                value,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textDark),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: const TextStyle(fontSize: 11.5, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (sublabel != null) ...[
                const SizedBox(height: 2),
                Text(
                  sublabel!,
                  style: const TextStyle(fontSize: 10.5, color: AppTheme.textFaint),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
