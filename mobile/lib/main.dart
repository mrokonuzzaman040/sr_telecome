import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:upgrader/upgrader.dart';
import 'providers/auth_provider.dart';
import 'providers/store_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/language_provider.dart';
import 'l10n/app_localizations.dart';
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
        ChangeNotifierProvider(create: (_) => LanguageProvider()),
      ],
      child: Consumer3<AuthProvider, ThemeProvider, LanguageProvider>(
        builder: (context, auth, themeProvider, languageProvider, _) {
          return UpgradeAlert(
            upgrader: Upgrader(
              languageCode: 'en',
              durationUntilAlertAgain: const Duration(hours: 4),
            ),
            child: MaterialApp(
              title: 'SR Telecom & Library POS',
              debugShowCheckedModeBanner: false,
              theme: themeProvider.buildTheme(),
              locale: languageProvider.currentLocale,
              localizationsDelegates: [
                AppLocalizations.delegate,
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              supportedLocales: const [
                Locale('bn', 'BD'),
                Locale('en', 'US'),
              ],
              home: auth.isLoading
                  ? const LoadingScreen()
                  : !auth.isAuthenticated
                      ? const LoginScreen()
                      : auth.needsUnlock
                          ? const LockScreen()
                          : const HomeScreen(),
            ),
          );
        },
      ),
    );
  }
}
