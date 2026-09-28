import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/biometric_service.dart';
import '../theme/app_theme.dart';

class LockScreen extends StatefulWidget {
  const LockScreen({super.key});

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> with WidgetsBindingObserver {
  bool _isPromptingBiometric = false;
  bool _showPinFallback = false;
  String _pin = '';
  String? _errorMessage;
  bool _isVerifyingPin = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _promptBiometric());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Re-offer biometric unlock when the app comes back to foreground while
    // still on the lock screen (e.g. user switched apps then returned).
    if (state == AppLifecycleState.resumed && mounted && !_showPinFallback && !_isPromptingBiometric) {
      _promptBiometric();
    }
  }

  Future<void> _promptBiometric() async {
    if (_isPromptingBiometric) return;
    setState(() => _isPromptingBiometric = true);

    final available = await BiometricService.isAvailable();
    if (!available) {
      if (mounted) setState(() => _showPinFallback = true);
      if (mounted) setState(() => _isPromptingBiometric = false);
      return;
    }

    final success = await BiometricService.authenticate(
      reason: 'এস.আর টেলিকম & লাইব্রেরী আনলক করতে যাচাই করুন',
    );

    if (!mounted) return;
    if (success) {
      Provider.of<AuthProvider>(context, listen: false).markUnlocked();
    } else {
      setState(() => _showPinFallback = true);
    }
    setState(() => _isPromptingBiometric = false);
  }

  void _onKeyPress(String digit) {
    if (_isVerifyingPin) return;
    if (_pin.length < 6) {
      setState(() {
        _pin += digit;
        _errorMessage = null;
      });
      if (_pin.length == 4) _submitPin();
    }
  }

  void _onBackspace() {
    if (_isVerifyingPin) return;
    if (_pin.isNotEmpty) {
      setState(() {
        _pin = _pin.substring(0, _pin.length - 1);
        _errorMessage = null;
      });
    }
  }

  Future<void> _submitPin() async {
    setState(() => _isVerifyingPin = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final ok = await auth.unlockWithPin(_pin);
    if (!mounted) return;
    if (!ok) {
      setState(() {
        _errorMessage = 'ভুল পিন কোড!';
        _pin = '';
        _isVerifyingPin = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.primary, width: 2),
                  ),
                  child: const Icon(Icons.lock_outline, size: 48, color: AppTheme.success),
                ),
                const SizedBox(height: 16),
                Text(
                  user?.name ?? 'অ্যাপ লক করা আছে',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 24),
                if (!_showPinFallback) ...[
                  if (_isPromptingBiometric)
                    const CircularProgressIndicator(color: AppTheme.success)
                  else
                    Column(
                      children: [
                        const Icon(Icons.fingerprint, size: 64, color: Colors.white70),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: _promptBiometric,
                          icon: const Icon(Icons.fingerprint),
                          label: const Text('আবার চেষ্টা করুন'),
                        ),
                      ],
                    ),
                  const SizedBox(height: 20),
                  TextButton(
                    onPressed: () => setState(() => _showPinFallback = true),
                    child: const Text('পিন দিয়ে আনলক করুন', style: TextStyle(color: Colors.white70)),
                  ),
                ] else ...[
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
                          border: Border.all(color: filled ? AppTheme.success : Colors.white38, width: 2),
                        ),
                      );
                    }),
                  ),
                  if (_isVerifyingPin) ...[
                    const SizedBox(height: 16),
                    const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.success)),
                  ],
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 16),
                    Text(_errorMessage!, style: const TextStyle(color: AppTheme.danger, fontSize: 13)),
                  ],
                  const SizedBox(height: 28),
                  Column(
                    children: [
                      _keyRow(['1', '2', '3']),
                      const SizedBox(height: 14),
                      _keyRow(['4', '5', '6']),
                      const SizedBox(height: 14),
                      _keyRow(['7', '8', '9']),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          const SizedBox(width: 48, height: 48),
                          _keyButton('0'),
                          IconButton(
                            onPressed: _onBackspace,
                            icon: const Icon(Icons.backspace_outlined, color: Colors.white70, size: 28),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => setState(() {
                      _showPinFallback = false;
                      _pin = '';
                      _errorMessage = null;
                    }),
                    child: const Text('বায়োমেট্রিক দিয়ে চেষ্টা করুন', style: TextStyle(color: Colors.white70)),
                  ),
                ],
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => auth.logout(),
                  child: const Text('লগআউট করুন', style: TextStyle(color: AppTheme.danger)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _keyRow(List<String> digits) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: digits.map(_keyButton).toList(),
    );
  }

  Widget _keyButton(String digit) {
    return InkWell(
      onTap: () => _onKeyPress(digit),
      borderRadius: BorderRadius.circular(40),
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white12),
        ),
        alignment: Alignment.center,
        child: Text(digit, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w600, color: Colors.white)),
      ),
    );
  }
}
