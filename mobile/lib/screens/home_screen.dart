import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/store_provider.dart';
import 'dashboard/dashboard_screen.dart';
import 'pos/pos_screen.dart';
import 'inventory/inventory_screen.dart';
import 'customers/customer_screen.dart';
import 'reports/reports_screen.dart';
import 'settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  // Lazily built & cached per tab: an unvisited tab costs nothing (no
  // Provider subscription, no list filtering, no widget tree) until the user
  // actually opens it, instead of all 6 screens building eagerly on startup.
  // Index 0 (Dashboard) is built separately since it needs the tab-switch
  // callback bound to this state; indices 1-5 come from the static builders.
  final List<Widget?> _screenCache = List<Widget?>.filled(6, null);

  static const List<Widget Function()> _screenBuilders = [
    PosScreen.new,
    InventoryScreen.new,
    CustomerScreen.new,
    ReportsScreen.new,
    SettingsScreen.new,
  ];

  Widget _screenAt(int index) {
    if (index == 0) {
      return _screenCache[0] ??= DashboardScreen(
        onNavigate: (tab) => setState(() => _currentIndex = tab),
      );
    }
    return _screenCache[index] ??= _screenBuilders[index - 1]();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<StoreProvider>(context, listen: false).loadAllData();
    });
  }

  @override
  Widget build(BuildContext context) {
    // Scoped to just the cart fields so cart edits don't rebuild this whole
    // shell (and by extension force-mount every tab) more than necessary.
    final cartQty = context.select<StoreProvider, int>((s) => s.cartTotalQuantity);

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: List.generate(6, (i) => _currentIndex == i || _screenCache[i] != null
            ? _screenAt(i)
            : const SizedBox.shrink()),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'ড্যাশবোর্ড',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: cartQty > 0,
              label: Text('$cartQty'),
              child: const Icon(Icons.point_of_sale_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: cartQty > 0,
              label: Text('$cartQty'),
              child: const Icon(Icons.point_of_sale),
            ),
            label: 'পিওএস (POS)',
          ),
          const NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'স্টক (Stock)',
          ),
          const NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'বাকি (Due)',
          ),
          const NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics),
            label: 'হিসাব (Reports)',
          ),
          const NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'সেটিংস',
          ),
        ],
      ),
    );
  }
}
