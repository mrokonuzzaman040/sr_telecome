import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  // `SRTelecomApp` wraps its MaterialApp in an `UpgradeAlert`, which schedules a
  // version-check Timer in initState. A test that pumps once and exits fails
  // with "A Timer is still pending", so settle past the timer to let it fire.
  testWidgets('SR Telecom App loads smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SRTelecomApp());
    await tester.pump(const Duration(seconds: 1));

    expect(find.byType(SRTelecomApp), findsOneWidget);
  });
}
