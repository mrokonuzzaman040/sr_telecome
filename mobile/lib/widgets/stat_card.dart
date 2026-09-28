import 'dart:math' as math;

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
            mainAxisSize: MainAxisSize.min,
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
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textDark, height: 1.2),
                    maxLines: 1,
                    softWrap: false,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: const TextStyle(fontSize: 11.5, color: AppTheme.textMuted, fontWeight: FontWeight.w500, height: 1.2),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (sublabel != null) ...[
                const SizedBox(height: 2),
                Text(
                  sublabel!,
                  style: const TextStyle(fontSize: 10.5, color: AppTheme.textFaint, height: 1.2),
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

/// Lays out [StatCard]s in a responsive grid.
///
/// Uses intrinsic card heights instead of a fixed `childAspectRatio`, so the
/// cards never clip or overflow on narrow phones or at large system font
/// scales. Every card in a row is stretched to a common height for alignment.
class StatCardGrid extends StatelessWidget {
  final List<Widget> cards;
  final double spacing;
  final int minCardWidth;

  const StatCardGrid({
    super.key,
    required this.cards,
    this.spacing = 10,
    this.minCardWidth = 150,
  });

  @override
  Widget build(BuildContext context) {
    if (cards.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite ? constraints.maxWidth : minCardWidth;
        // Cap the grid width so cards do not stretch into sparse, hard-to-scan
        // rows on tablets.
        final usable = math.min(width, 760.0);
        var columns = (usable / minCardWidth).floor();
        if (columns < 1) columns = 1;
        if (columns > cards.length) columns = cards.length;
        if (columns > 4) columns = 4;

        final cardWidth = (usable - (spacing * (columns - 1))) / columns;
        final rows = <Widget>[];

        for (var i = 0; i < cards.length; i += columns) {
          final chunk = cards.skip(i).take(columns).toList();
          rows.add(
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var c = 0; c < columns; c++) ...[
                    if (c > 0) SizedBox(width: spacing),
                    SizedBox(
                      width: cardWidth,
                      child: c < chunk.length ? chunk[c] : const SizedBox.shrink(),
                    ),
                  ],
                ],
              ),
            ),
          );
          if (i + columns < cards.length) rows.add(SizedBox(height: spacing));
        }

        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: rows);
      },
    );
  }
}
