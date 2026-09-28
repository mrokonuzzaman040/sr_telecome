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
    final titleText = Text(
      title,
      style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: AppTheme.textDark, height: 1.3),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );

    if (action == null) {
      return Padding(padding: const EdgeInsets.only(bottom: 10), child: titleText);
    }

    // Below this width the title + action cannot share a line without squeezing
    // the Bengali heading into a clipped double line, so stack them instead.
    return LayoutBuilder(
      builder: (context, constraints) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: constraints.maxWidth < 340
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    titleText,
                    const SizedBox(height: 4),
                    Align(alignment: Alignment.centerLeft, child: action),
                  ],
                )
              : Row(
                  children: [
                    Expanded(child: titleText),
                    const SizedBox(width: 8),
                    Flexible(child: action!),
                  ],
                ),
        );
      },
    );
  }
}
