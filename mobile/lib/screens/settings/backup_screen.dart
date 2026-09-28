import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../providers/store_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class BackupScreen extends StatefulWidget {
  const BackupScreen({super.key});

  @override
  State<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends State<BackupScreen> {
  final currencyFormat = NumberFormat('#,##0', 'en_US');
  List<Map<String, dynamic>> _backups = [];
  bool _isLoadingBackups = true;
  bool _isTriggering = false;
  bool _isExporting = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadBackups();
  }

  Future<void> _loadBackups() async {
    setState(() {
      _isLoadingBackups = true;
      _loadError = null;
    });
    try {
      final backups = await ApiService.fetchBackups();
      setState(() => _backups = backups);
    } catch (e) {
      setState(() => _loadError = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoadingBackups = false);
    }
  }

  Future<void> _triggerBackup() async {
    setState(() => _isTriggering = true);
    try {
      await ApiService.triggerBackup();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('সার্ভারে নতুন ব্যাকআপ তৈরি হয়েছে'), backgroundColor: AppTheme.success),
        );
      }
      await _loadBackups();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('ত্রুটি: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isTriggering = false);
    }
  }

  Future<void> _exportLocalJson() async {
    setState(() => _isExporting = true);
    try {
      final store = Provider.of<StoreProvider>(context, listen: false);
      final snapshot = {
        'exportedAt': DateTime.now().toIso8601String(),
        'products': store.products.map((p) => p.toJson()).toList(),
        'customers': store.customers.map((c) => c.toJson()).toList(),
        'sales': store.sales.map((s) => s.toJson()).toList(),
        'expenses': store.expenses.map((e) => e.toJson()).toList(),
        'publishers': store.publishers.map((p) => p.toJson()).toList(),
      };

      final dir = await getApplicationDocumentsDirectory();
      final fileName = 'sr_telecom_backup_${DateFormat('yyyyMMdd_HHmmss').format(DateTime.now())}.json';
      final file = File('${dir.path}/$fileName');
      await file.writeAsString(jsonEncode(snapshot));

      if (mounted) {
        await SharePlus.instance.share(
          ShareParams(files: [XFile(file.path)], text: 'SR Telecom & Library - Local Data Export'),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('এক্সপোর্ট ব্যর্থ হয়েছে: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ডাটাবেস ব্যাকআপ'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadBackups),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('সার্ভার স্ন্যাপশট', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 6),
          const Text(
            'সার্ভারে থাকা সব পণ্য, কাস্টমার, বিক্রয়, রিটার্ন ও খরচের ডেটার একটি সম্পূর্ণ কপি এই মুহূর্তে সংরক্ষণ করুন।',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isTriggering ? null : _triggerBackup,
              icon: _isTriggering
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.cloud_upload_outlined),
              label: const Text('এখনই সার্ভার ব্যাকআপ নিন'),
            ),
          ),
          const SizedBox(height: 24),

          const Text('সাম্প্রতিক ব্যাকআপ (সর্বশেষ ৩০টি)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 10),
          if (_isLoadingBackups)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()))
          else if (_loadError != null)
            Text('লোড করা যায়নি: $_loadError', style: const TextStyle(color: AppTheme.danger, fontSize: 12))
          else if (_backups.isEmpty)
            const Text('কোন ব্যাকআপ পাওয়া যায়নি', style: TextStyle(color: Colors.grey, fontSize: 13))
          else
            ..._backups.map((b) {
              final summary = b['summary'] is Map ? b['summary'] as Map : {};
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(
                    b['backupType'] == 'manual' ? Icons.touch_app_outlined : Icons.schedule_outlined,
                    color: AppTheme.secondary,
                  ),
                  title: Text('${b['backupDate'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text(
                    'পণ্য: ${summary['totalProducts'] ?? '-'} · কাস্টমার: ${summary['totalCustomers'] ?? '-'} · বিক্রয়: ${summary['totalSales'] ?? '-'}',
                    style: const TextStyle(fontSize: 11),
                  ),
                  trailing: Text(
                    b['backupType'] == 'manual' ? 'ম্যানুয়াল' : 'স্বয়ংক্রিয়',
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ),
              );
            }),
          const SizedBox(height: 24),

          const Text('লোকাল JSON এক্সপোর্ট', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 6),
          const Text(
            'এই মুহূর্তে অ্যাপে লোড করা ডেটার একটি JSON ফাইল তৈরি করে শেয়ার/সংরক্ষণ করুন (নিজের কম্পিউটার বা ড্রাইভে রাখার জন্য)।',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _isExporting ? null : _exportLocalJson,
              icon: _isExporting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.ios_share),
              label: const Text('JSON ফাইল এক্সপোর্ট / শেয়ার করুন'),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'নোট: এই JSON ফাইল থেকে সরাসরি ডেটা পুনরুদ্ধার (import/restore) মোবাইল অ্যাপ থেকে সমর্থিত নয় — এটি শুধু নিরাপদ কপি রাখার জন্য।',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}
