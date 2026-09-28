import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('SR Telecom App loads smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SRTelecomApp());
    expect(find.byType(SRTelecomApp), findsOneWidget);
  });
}
