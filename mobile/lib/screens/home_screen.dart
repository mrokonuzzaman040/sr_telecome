import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/store_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
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

  // Lazily built & cached per tab to save resources while keeping state intact
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

  void _onTabSelected(int index) {
    if (_currentIndex != index) {
      HapticFeedback.lightImpact();
      setState(() => _currentIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartQty = context.select<StoreProvider, int>((s) => s.cartTotalQuantity);
    final store = context.watch<StoreProvider>();
    final auth = context.read<AuthProvider>();

    final destinations = [
      _NavDestinationData(
        icon: Icons.dashboard_outlined,
        selectedIcon: Icons.dashboard_rounded,
        label: 'ড্যাশবোর্ড',
      ),
      _NavDestinationData(
        icon: Icons.point_of_sale_outlined,
        selectedIcon: Icons.point_of_sale_rounded,
        label: 'পিওএস',
        badgeCount: cartQty,
      ),
      _NavDestinationData(
        icon: Icons.inventory_2_outlined,
        selectedIcon: Icons.inventory_2_rounded,
        label: 'স্টক',
      ),
      _NavDestinationData(
        icon: Icons.people_outline,
        selectedIcon: Icons.people_rounded,
        label: 'বাকি',
      ),
      _NavDestinationData(
        icon: Icons.analytics_outlined,
        selectedIcon: Icons.analytics_rounded,
        label: 'হিসাব',
      ),
      _NavDestinationData(
        icon: Icons.settings_outlined,
        selectedIcon: Icons.settings_rounded,
        label: 'সেটিংস',
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWideScreen = constraints.maxWidth >= 640;

        Widget content = Column(
          children: [
            // Status/Error Banner
            if (store.isSessionExpired)
              _buildSessionExpiredBanner(auth)
            else if (store.isOffline)
              _buildOfflineBanner(store)
            else if (store.errorMessage != null)
              _buildErrorBanner(store),

            // Main Active View
            Expanded(
              child: IndexedStack(
                index: _currentIndex,
                children: List.generate(
                  6,
                  (i) => _currentIndex == i || _screenCache[i] != null
                      ? _screenAt(i)
                      : const SizedBox.shrink(),
                ),
              ),
            ),
          ],
        );

        if (isWideScreen) {
          // Responsive Tablet / Wide-screen NavigationRail
          return Scaffold(
            body: Row(
              children: [
                NavigationRail(
                  selectedIndex: _currentIndex,
                  onDestinationSelected: _onTabSelected,
                  labelType: NavigationRailLabelType.all,
                  leading: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.menu_book_rounded, color: Colors.white, size: 24),
                    ),
                  ),
                  destinations: destinations.map((d) {
                    Widget iconWidget = Icon(d.icon);
                    Widget selIconWidget = Icon(d.selectedIcon);
                    if (d.badgeCount > 0) {
                      iconWidget = Badge(label: Text('${d.badgeCount}'), child: iconWidget);
                      selIconWidget = Badge(label: Text('${d.badgeCount}'), child: selIconWidget);
                    }
                    return NavigationRailDestination(
                      icon: iconWidget,
                      selectedIcon: selIconWidget,
                      label: Text(d.label, style: const TextStyle(fontSize: 12)),
                    );
                  }).toList(),
                ),
                const VerticalDivider(thickness: 1, width: 1, color: AppTheme.border),
                Expanded(child: content),
              ],
            ),
          );
        }

        // Mobile Phone Layout with high-response bottom nav bar
        return Scaffold(
          body: content,
          bottomNavigationBar: _buildMobileNavBar(destinations),
        );
      },
    );
  }

  Widget _buildMobileNavBar(List<_NavDestinationData> destinations) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(
          top: BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        bottom: true,
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(destinations.length, (index) {
              final d = destinations[index];
              final isSelected = _currentIndex == index;

              return Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _onTabSelected(index),
                    splashColor: AppTheme.primary.withValues(alpha: 0.1),
                    highlightColor: AppTheme.primary.withValues(alpha: 0.05),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Icon container with smooth animated pill indicator
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            curve: Curves.easeInOut,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppTheme.primary.withValues(alpha: 0.12)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: d.badgeCount > 0
                                ? Badge(
                                    label: Text(
                                      '${d.badgeCount}',
                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                    backgroundColor: AppTheme.danger,
                                    child: Icon(
                                      isSelected ? d.selectedIcon : d.icon,
                                      size: 22,
                                      color: isSelected ? AppTheme.primary : AppTheme.textMuted,
                                    ),
                                  )
                                : Icon(
                                    isSelected ? d.selectedIcon : d.icon,
                                    size: 22,
                                    color: isSelected ? AppTheme.primary : AppTheme.textMuted,
                                  ),
                          ),
                          const SizedBox(height: 2),
                          // Crisp single-line label
                          Text(
                            d.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                              color: isSelected ? AppTheme.primary : AppTheme.textMuted,
                              height: 1.1,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildSessionExpiredBanner(AuthProvider auth) {
    return Container(
      width: double.infinity,
      color: Colors.amber.shade900,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'লগইন সেশনের মেয়াদ শেষ। পুনরায় লগইন করুন।',
                style: TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600),
              ),
            ),
            TextButton(
              onPressed: () => auth.handleSessionExpired(),
              style: TextButton.styleFrom(
                backgroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'লগইন',
                style: TextStyle(color: Colors.amber.shade900, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfflineBanner(StoreProvider store) {
    return Container(
      width: double.infinity,
      color: Colors.indigo.shade800,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            const Icon(Icons.cloud_off_rounded, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'অফলাইন মোড: সংরক্ষিত ক্যাশ ডাটা প্রদর্শিত হচ্ছে',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
            InkWell(
              onTap: () => store.loadAllData(),
              child: const Row(
                children: [
                  Icon(Icons.refresh, color: Colors.white, size: 16),
                  SizedBox(width: 4),
                  Text(
                    'সিঙ্ক',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorBanner(StoreProvider store) {
    return Container(
      width: double.infinity,
      color: Colors.red.shade800,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                store.errorMessage ?? 'সার্ভার থেকে তথ্য লোড ব্যর্থ হয়েছে',
                style: const TextStyle(color: Colors.white, fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            TextButton(
              onPressed: () => store.loadAllData(),
              style: TextButton.styleFrom(
                backgroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'পুনরায় চেষ্টা',
                style: TextStyle(color: Colors.red.shade900, fontSize: 11.5, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavDestinationData {
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final int badgeCount;

  _NavDestinationData({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    this.badgeCount = 0,
  });
}
