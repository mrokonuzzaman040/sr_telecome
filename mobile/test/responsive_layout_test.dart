import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';

import 'package:mobile/models/expense.dart';
import 'package:mobile/models/sale.dart';
import 'package:mobile/screens/reports/reports_screen.dart';
import 'package:mobile/screens/home_screen.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/store_provider.dart';
import 'package:mobile/theme/app_theme.dart';
import 'package:provider/provider.dart';

class _FakeAuth extends AuthProvider {
  @override
  bool get isAdmin => true;
}

class _FakeStore extends StoreProvider {
  final List<Expense> _expenses;

  _FakeStore(this._expenses);

  @override
  List<Expense> get expenses => _expenses;

  @override
  List<Sale> get sales => const <Sale>[];

  @override
  Future<void> loadAllData() async {}
}

Widget _wrap(List<Expense> expenses) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>(create: (_) => _FakeAuth()),
      ChangeNotifierProvider<StoreProvider>(create: (_) => _FakeStore(expenses)),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: const ReportsScreen(),
    ),
  );
}

void main() {
  // A long, deliberately wrapping Bengali title plus a large amount — the two
  // inputs that used to produce misaligned double-line report cards.
  final expenses = [
    Expense(
      id: 'e1',
      title: 'মাসিক ভাড়া ও বিদ্যুৎ বিল এবং অন্যান্য পরিচালনা ব্যয়',
      category: 'rent',
      amount: 1250000,
      date: '2026-09-28',
    ),
    Expense(
      id: 'e2',
      title: 'স্টাফ বেতন',
      category: 'staff',
      amount: 45000,
      date: '2026-09-27',
    ),
  ];

  final sizes = <String, Size>{
    'small phone (320x568)': const Size(320, 568),
    'phone (390x844)': const Size(390, 844),
    'large phone (430x932)': const Size(430, 932),
    'tablet (834x1112)': const Size(834, 1112),
  };

  sizes.forEach((name, size) {
    testWidgets('ReportsScreen renders without overflow on $name', (tester) async {
      tester.view
        ..physicalSize = size * 3
        ..devicePixelRatio = 3.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(expenses));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text('হিসাব-নিকাশ ও রিপোর্ট'), findsOneWidget);
    });
  });

  testWidgets('report card titles stay within two lines', (tester) async {
    tester.view
      ..physicalSize = const Size(320 * 3, 568 * 3)
      ..devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_wrap(expenses));
    await tester.pumpAndSettle();

    final title = find.text('মোট বিক্রয় (বিক্রিত মূল্য)');
    expect(title, findsOneWidget);

    final size = tester.getSize(title);
    expect(size.height, lessThan(40), reason: 'title should not render as a tall double line');
  });

  testWidgets('large amounts stay on one line via FittedBox', (tester) async {
    tester.view
      ..physicalSize = const Size(320 * 3, 568 * 3)
      ..devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_wrap(expenses));
    await tester.pumpAndSettle();

    final amount = find.text('৳${NumberFormat('#,##0', 'en_US').format(1250000)}');
    expect(amount, findsWidgets);
    expect(tester.takeException(), isNull);
  });

  group('bottom navigation bar', () {
    Future<void> pumpHome(WidgetTester tester, Size size, {double textScale = 1.0}) async {
      tester.view
        ..physicalSize = size * 3
        ..devicePixelRatio = 3.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>(create: (_) => _FakeAuth()),
            ChangeNotifierProvider<StoreProvider>(create: (_) => _FakeStore(expenses)),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
              child: child!,
            ),
            home: const HomeScreen(),
          ),
        ),
      );
      await tester.pump();
    }

    final phoneSizes = <String, Size>{
      'small phone (320x568)': const Size(320, 568),
      'phone (390x844)': const Size(390, 844),
      'large phone (430x932)': const Size(430, 932),
    };

    phoneSizes.forEach((name, size) {
      testWidgets('all six tabs render on $name', (tester) async {
        await pumpHome(tester, size);

        for (final label in ['ড্যাশবোর্ড', 'পিওএস', 'স্টক', 'বাকি', 'হিসাব', 'সেটিংস']) {
          expect(find.text(label), findsOneWidget, reason: 'tab "$label" should be visible');
        }
        expect(tester.takeException(), isNull);
      });
    });

    testWidgets('tabs survive a 1.6x system font scale', (tester) async {
      await pumpHome(tester, const Size(320, 568), textScale: 1.6);
      expect(find.text('ড্যাশবোর্ড'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('wide screen shows a navigation rail instead of the bottom bar', (tester) async {
      await pumpHome(tester, const Size(834, 1112));
      expect(find.byType(NavigationRail), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
