import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class AppVersion {
  final String current;
  final String latest;
  final String minSupported;
  final String releaseDate;
  final String downloadUrl;
  final List<String> releaseNotes;
  final bool forceUpdate;

  AppVersion({
    required this.current,
    required this.latest,
    required this.minSupported,
    required this.releaseDate,
    required this.downloadUrl,
    required this.releaseNotes,
    required this.forceUpdate,
  });

  factory AppVersion.fromJson(Map<String, dynamic> json) {
    final version = json['version'] as Map<String, dynamic>;
    return AppVersion(
      current: version['current'] as String,
      latest: version['latest'] as String,
      minSupported: version['minSupported'] as String,
      releaseDate: version['releaseDate'] as String,
      downloadUrl: version['downloadUrl'] as String,
      releaseNotes: (version['releaseNotes'] as List<dynamic>)
          .map((e) => e.toString())
          .toList(),
      forceUpdate: version['forceUpdate'] as bool,
    );
  }
}

class UpdateService {
  static const String _baseUrl = 'https://srtelecom.vercel.app';
  
  static Future<AppVersion?> checkForUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/version'),
        headers: {
          'X-App-Version': currentVersion,
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        if (data['success'] == true) {
          return AppVersion.fromJson(data);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Failed to check for updates: $e');
      return null;
    }
  }

  static Future<bool> downloadUpdate(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        return await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
      }
      return false;
    } catch (e) {
      debugPrint('Failed to open download URL: $e');
      return false;
    }
  }

  static String compareVersions(String current, String latest) {
    final currentParts = current.split('.').map(int.parse).toList();
    final latestParts = latest.split('.').map(int.parse).toList();
    
    for (int i = 0; i < 3; i++) {
      if (currentParts[i] < latestParts[i]) {
        return 'lower';
      } else if (currentParts[i] > latestParts[i]) {
        return 'higher';
      }
    }
    return 'equal';
  }
}
