import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Consistent section title used above every grouped block (stat rows, list
/// sections) so heading style/weight/spacing stops varying screen to screen.
class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? action;

  const SectionHeader({super.key, required this.title, this.action});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: AppTheme.textDark),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}
