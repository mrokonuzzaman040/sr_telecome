import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/store_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/lock_screen.dart';
import 'widgets/loading_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SRTelecomApp());
}

class SRTelecomApp extends StatelessWidget {
  const SRTelecomApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => StoreProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer2<AuthProvider, ThemeProvider>(
        builder: (context, auth, themeProvider, _) {
          return MaterialApp(
            title: 'SR Telecom & Library POS',
            debugShowCheckedModeBanner: false,
            theme: themeProvider.buildTheme(),
            home: auth.isLoading
                ? const LoadingScreen()
                : !auth.isAuthenticated
                    ? const LoginScreen()
                    : auth.needsUnlock
                        ? const LockScreen()
                        : const HomeScreen(),
          );
        },
      ),
    );
  }
}
