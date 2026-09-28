import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../services/biometric_service.dart';
import '../theme/app_theme.dart';
import '../l10n/app_localizations.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String _pin = '';
  String _username = 'admin'; // matches seeded web-app usernames: admin / cashier
  String? _errorMessage;
  bool _isSubmitting = false;
  bool _isBiometricAvailable = false;
  bool _isBiometricAuthenticating = false;
  String _serverUrl = ApiService.defaultBaseUrl;

  @override
  void initState() {
    super.initState();
    ApiService.getBaseUrl().then((url) {
      if (mounted) setState(() => _serverUrl = url);
    });
    BiometricService.isAvailable().then((available) {
      if (mounted) setState(() => _isBiometricAvailable = available);
    });
  }

  void _onKeyPress(String digit) {
    if (_isSubmitting) return;
    if (_pin.length < 6) {
      setState(() {
        _pin += digit;
        _errorMessage = null;
      });
      if (_pin.length == 4) {
        _submitLogin();
      }
    }
  }

  void _onBackspace() {
    if (_isSubmitting) return;
    if (_pin.isNotEmpty) {
      setState(() {
        _pin = _pin.substring(0, _pin.length - 1);
        _errorMessage = null;
      });
    }
  }

  Future<void> _submitLogin() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    try {
      await auth.login(_username, _pin);
    } catch (e) {
      if (!mounted) return;
      final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
      final loc = AppLocalizations.of(languageProvider.currentLocale);
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _pin = '';
      });
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _biometricLogin() async {
    if (_isBiometricAuthenticating || _isSubmitting) return;
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final loc = AppLocalizations.of(languageProvider.currentLocale);
    
    setState(() {
      _isBiometricAuthenticating = true;
      _errorMessage = null;
    });

    try {
      final success = await BiometricService.authenticate(
        reason: loc.get('biometric_reason'),
      );

      if (!mounted) return;

      if (success) {
        // After successful biometric, attempt login with stored credentials
        final auth = Provider.of<AuthProvider>(context, listen: false);
        try {
          // Get stored PIN for biometric login
          final storedPin = await auth.getStoredPin(_username);
          if (storedPin != null) {
            await auth.login(_username, storedPin);
          } else {
            // If no stored PIN, prompt user to login with PIN first
            if (mounted) {
              setState(() {
                _errorMessage = loc.get('biometric_login_first');
              });
            }
          }
        } catch (e) {
          if (mounted) {
            setState(() {
              _errorMessage = loc.get('biometric_login_error');
            });
          }
        }
      }
    } finally {
      if (mounted) setState(() => _isBiometricAuthenticating = false);
    }
  }

  void _showServerDialog() {
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final loc = AppLocalizations.of(languageProvider.currentLocale);
    final controller = TextEditingController(text: _serverUrl);
    bool testing = false;
    String? testMsg;
    bool? testOk;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.dns_rounded, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 8),
              Text(loc.get('server_settings'), style: const TextStyle(fontSize: 16)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                loc.get('api_server_address'),
                style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  hintText: 'https://srtelecom.vercel.app',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              if (testMsg != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: (testOk == true ? AppTheme.success : AppTheme.danger).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        testOk == true ? Icons.check_circle : Icons.error,
                        size: 16,
                        color: testOk == true ? AppTheme.success : AppTheme.danger,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          testMsg!,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: testOk == true ? AppTheme.success : AppTheme.danger,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: testing
                        ? null
                        : () async {
                            setDialogState(() {
                              testing = true;
                              testMsg = loc.get('pinging');
                            });
                            final r = await ApiService.testConnection(controller.text);
                            setDialogState(() {
                              testing = false;
                              testOk = r['success'] == true;
                              testMsg = r['message']?.toString();
                            });
                          },
                    icon: testing
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.wifi_tethering, size: 16),
                    label: Text(loc.get('test'), style: const TextStyle(fontSize: 12)),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => controller.text = ApiService.defaultBaseUrl,
                    child: Text(loc.get('default'), style: const TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(loc.get('cancel')),
            ),
            ElevatedButton(
              onPressed: () async {
                final newUrl = controller.text.trim();
                if (newUrl.isNotEmpty) {
                  await ApiService.setBaseUrl(newUrl);
                  if (mounted) setState(() => _serverUrl = newUrl);
                  if (ctx.mounted) Navigator.pop(ctx);
                }
              },
              child: Text(loc.get('save_server')),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final loc = AppLocalizations.of(languageProvider.currentLocale);
    
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark slate
      body: SafeArea(
        child: Stack(
          children: [
            // Top Bar: Server Config Button
            Positioned(
              top: 8,
              right: 12,
              child: TextButton.icon(
                onPressed: _showServerDialog,
                icon: const Icon(Icons.dns_outlined, size: 16, color: Colors.white60),
                label: Text(
                  _serverUrl.replaceFirst('https://', '').replaceFirst('.vercel.app', ''),
                  style: const TextStyle(fontSize: 11, color: Colors.white60),
                ),
                style: TextButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.06),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),

            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Shop Logo & Title
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                        border: Border.all(color: Theme.of(context).colorScheme.primary, width: 2),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Image.asset(
                        'assets/icon/app_icon_512.png',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.menu_book_rounded,
                          size: 44,
                          color: AppTheme.success,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      loc.get('app_name'),
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      loc.get('app_subtitle'),
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Colors.white70,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Biometric login button (if available)
                    if (_isBiometricAvailable) ...[
                      Container(
                        width: double.infinity,
                        constraints: const BoxConstraints(maxWidth: 320),
                        child: ElevatedButton.icon(
                          onPressed: _isBiometricAuthenticating ? null : _biometricLogin,
                          icon: _isBiometricAuthenticating
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.fingerprint, size: 22),
                          label: Text(
                            _isBiometricAuthenticating ? loc.get('biometric_authenticating') : loc.get('biometric_login'),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white.withValues(alpha: 0.15),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: Colors.white24),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Role selector — picks which username the PIN is checked against
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildRoleChip(loc.get('admin_role'), 'admin'),
                          _buildRoleChip(loc.get('cashier_role'), 'cashier'),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // PIN indicator dots
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(4, (index) {
                        final filled = index < _pin.length;
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 10),
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            color: filled ? AppTheme.success : Colors.transparent,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: filled ? AppTheme.success : Colors.white38,
                              width: 2,
                            ),
                          ),
                        );
                      }),
                    ),

                    if (_isSubmitting) ...[
                      const SizedBox(height: 14),
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.success),
                      ),
                    ],

                    if (_errorMessage != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.danger.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ),
                    ],

                    const SizedBox(height: 28),

                    // Numeric Keypad
                    Container(
                      constraints: const BoxConstraints(maxWidth: 320),
                      child: Column(
                        children: [
                          _buildKeyRow(['1', '2', '3']),
                          const SizedBox(height: 12),
                          _buildKeyRow(['4', '5', '6']),
                          const SizedBox(height: 12),
                          _buildKeyRow(['7', '8', '9']),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              const SizedBox(width: 68, height: 68),
                              _buildKeyButton('0'),
                              InkWell(
                                onTap: _onBackspace,
                                borderRadius: BorderRadius.circular(35),
                                child: Container(
                                  width: 68,
                                  height: 68,
                                  alignment: Alignment.center,
                                  child: const Icon(Icons.backspace_outlined, color: Colors.white70, size: 26),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleChip(String label, String username) {
    final selected = _username == username;
    return GestureDetector(
      onTap: _isSubmitting
          ? null
          : () => setState(() {
                _username = username;
                _errorMessage = null;
              }),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppTheme.success : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : Colors.white60,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
            fontSize: 12.5,
          ),
        ),
      ),
    );
  }

  Widget _buildKeyRow(List<String> digits) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: digits.map((d) => _buildKeyButton(d)).toList(),
    );
  }

  Widget _buildKeyButton(String digit) {
    return InkWell(
      onTap: () => _onKeyPress(digit),
      borderRadius: BorderRadius.circular(35),
      child: Container(
        width: 68,
        height: 68,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white12),
        ),
        alignment: Alignment.center,
        child: Text(
          digit,
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
