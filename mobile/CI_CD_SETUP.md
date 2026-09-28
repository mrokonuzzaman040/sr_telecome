# CI/CD Pipeline Setup Guide

This document explains how to set up the CI/CD pipeline for the SR Telecom & Library mobile app.

## GitHub Actions Workflow

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that automatically:

1. **Runs tests** on every push and pull request
2. **Builds Android APK/AAB** on main branch pushes and releases
3. **Builds iOS IPA** on main branch pushes and releases
4. **Creates GitHub releases** with build artifacts

## Required GitHub Secrets

To enable release builds, you need to configure the following secrets in your GitHub repository:

### Android Signing Secrets

1. **ANDROID_KEYSTORE_BASE64**: Base64-encoded keystore file
   - Generate: `base64 -i your-keystore.jks | pbcopy` (macOS) or `base64 -w 0 your-keystore.jks` (Linux)
   - Paste the output as the secret value

2. **KEYSTORE_PASSWORD**: Password for the keystore file

3. **KEY_ALIAS**: Alias of the key in the keystore

4. **KEY_PASSWORD**: Password for the key

### iOS Configuration

Update `ios/ExportOptions.plist` with your:
- Team ID (replace `YOUR_TEAM_ID` with your actual Apple Developer Team ID)
- Export method (app-store, ad-hoc, enterprise, or development)

## Creating a Release

1. Update the version in `pubspec.yaml`:
   ```yaml
   version: 1.0.0+2  # Increment version and build number
   ```

2. Commit and push to main branch

3. Create a GitHub release:
   - Go to Releases → Create a new release
   - Tag version: `v1.0.0`
   - Release title: `Version 1.0.0`
   - Publish release

The CI/CD pipeline will automatically:
- Run tests
- Build Android APK and AAB
- Build iOS IPA
- Attach build artifacts to the release

## Manual Testing

To test the workflow locally before pushing:

```bash
# Test the Flutter build
flutter pub get
flutter test
flutter build apk --release
flutter build appbundle --release
```

## Branch Strategy

- **main**: Production builds and releases
- **develop**: Development and testing
- Pull requests trigger test runs only

## Troubleshooting

### Android Build Fails
- Verify keystore secrets are correctly configured
- Ensure keystore password and key password match

### iOS Build Fails
- Verify Team ID in ExportOptions.plist
- Ensure Apple Developer account is active
- Check Xcode version compatibility

### Test Failures
- Run `flutter test` locally to reproduce
- Check Flutter version compatibility (3.24.0)
