import 'package:local_auth/local_auth.dart';

class BiometricService {
  static final LocalAuthentication _auth = LocalAuthentication();

  /// Whether this device has usable biometric/device-credential hardware set up.
  static Future<bool> isAvailable() async {
    try {
      final supported = await _auth.isDeviceSupported();
      final canCheck = await _auth.canCheckBiometrics;
      return supported && canCheck;
    } catch (_) {
      return false;
    }
  }

  /// Prompts the OS biometric/PIN-pattern sheet. Returns true only on a
  /// genuine successful authentication (not on cancel/lockout/error).
  static Future<bool> authenticate({required String reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        biometricOnly: false, // also allow device PIN/pattern as OS-level fallback
        persistAcrossBackgrounding: true,
      );
    } on LocalAuthException {
      return false;
    } catch (_) {
      return false;
    }
  }
}
