import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/store_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';
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
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return MaterialApp(
            title: 'SR Telecom & Library POS',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            home: auth.isLoading
                ? const LoadingScreen()
                : auth.isAuthenticated
                    ? const HomeScreen()
                    : const LoginScreen(),
          );
        },
      ),
    );
  }
}
