# Auto-Update Feature Setup

This document explains the auto-update functionality implemented in the SR Telecom & Library mobile app.

## Overview

The app uses the `upgrader` package to automatically check for and prompt users to update to the latest version available on the app stores (Google Play Store and Apple App Store).

## How It Works

1. **Automatic Version Check**: When the app launches, it checks the latest version available on the respective app store
2. **Update Prompt**: If a newer version is available, users see an update dialog
3. **User Options**: Users can:
   - Update now (redirects to app store)
   - Remind me later (dismisses for 4 hours)
   - Ignore this version (dismisses permanently for this version)
4. **Release Notes**: Shows release notes if available from the app store

## Configuration

The auto-update feature is configured in `lib/main.dart`:

```dart
UpgradeAlert(
  upgrader: Upgrader(
    languageCode: 'en',                        // Language for the dialog
    durationUntilAlertAgain: const Duration(hours: 4),  // How long to wait before prompting again
  ),
  child: MaterialApp(...),
)
```

## Release Process

To trigger an update for users:

1. **Update Version in pubspec.yaml**:
   ```yaml
   version: 1.0.1+2  # Increment version and build number
   ```

2. **Build and Release**:
   - The CI/CD pipeline will automatically build the new version
   - Create a GitHub release with the new version tag
   - Download the APK/AAB and IPA from the release artifacts

3. **Publish to App Stores**:
   - **Android**: Upload the AAB to Google Play Console
   - **iOS**: Upload the IPA to App Store Connect

4. **Users Will Be Notified**:
   - Once the new version is available on the stores, users will see the update prompt
   - The prompt respects the configured timing (4 hours between prompts)

## Customization Options

You can customize the auto-update behavior by modifying the `Upgrader` configuration:

- **languageCode**: Set the language for the update dialog (e.g., 'en', 'bn')
- **durationUntilAlertAgain**: Change how often to prompt users (default: 4 hours)
- Additional options available in the upgrader package for advanced customization

## Testing

To test the auto-update feature:

1. **Local Testing**:
   ```bash
   flutter pub get
   flutter run
   ```

2. **Test Different Scenarios**:
   - Test with a version that's behind the store version
   - Test with the latest version (should not show prompt)
   - Test dismissing and later options

## Troubleshooting

### Update Not Showing
- Ensure the new version is actually published to the app store
- Check that the version in `pubspec.yaml` matches the store version
- Verify internet connectivity for version check

### Always Showing Update Prompt
- Check that the version numbers are correctly incremented
- Ensure the app store has the latest version approved

### Build Errors
- Run `flutter pub get` to ensure dependencies are installed
- Check that `upgrader` package is compatible with your Flutter version

## Best Practices

1. **Semantic Versioning**: Follow semantic versioning (MAJOR.MINOR.PATCH)
2. **Release Notes**: Always include meaningful release notes in the app store
3. **Test Thoroughly**: Test the update process with each release
4. **User Communication**: Consider adding in-app announcements for major updates
5. **Timing**: Choose appropriate timing for the update prompt frequency

## Integration with CI/CD

The auto-update feature works seamlessly with the CI/CD pipeline:

1. Update version in `pubspec.yaml`
2. Push to main branch
3. CI/CD builds and creates release
4. Download artifacts and publish to stores
5. Users automatically get update prompts

This ensures a smooth, automated release and update process.
