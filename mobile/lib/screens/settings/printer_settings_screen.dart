import 'package:flutter/material.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../../services/printer_service.dart';
import '../../theme/app_theme.dart';

class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  List<BluetoothInfo> _devices = [];
  String? _savedMac;
  bool _isLoading = false;
  bool _isConnecting = false;
  bool _isTestPrinting = false;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });

    final bluetoothOn = await PrinterService.bluetoothEnabled;
    if (!bluetoothOn) {
      setState(() {
        _isLoading = false;
        _statusMessage = 'ব্লুটুথ বন্ধ আছে। প্রথমে ফোনের ব্লুটুথ চালু করুন।';
      });
      return;
    }

    final devices = await PrinterService.getPairedDevices();
    final savedMac = await PrinterService.getSavedPrinterMac();
    setState(() {
      _devices = devices;
      _savedMac = savedMac;
      _isLoading = false;
      if (devices.isEmpty) {
        _statusMessage = 'কোন পেয়ারড প্রিন্টার পাওয়া যায়নি। ফোনের ব্লুটুথ সেটিংস থেকে প্রথমে প্রিন্টার পেয়ার করুন।';
      }
    });
  }

  Future<void> _selectDevice(BluetoothInfo device) async {
    setState(() => _isConnecting = true);
    try {
      final connected = await PrinterService.connect(device.macAdress);
      if (connected) {
        await PrinterService.saveSelectedPrinter(device);
        setState(() => _savedMac = device.macAdress);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${device.name} সংযুক্ত হয়েছে'), backgroundColor: AppTheme.success),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('সংযোগ ব্যর্থ হয়েছে, আবার চেষ্টা করুন'), backgroundColor: AppTheme.danger),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isConnecting = false);
    }
  }

  Future<void> _testPrint() async {
    setState(() => _isTestPrinting = true);
    try {
      final connected = await PrinterService.ensureConnectedToSavedPrinter();
      if (!connected) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('প্রথমে একটি প্রিন্টার সংযুক্ত করুন'), backgroundColor: AppTheme.danger),
          );
        }
        return;
      }
      final ok = await PrintBluetoothThermal.writeBytes(_testTicketBytes());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ok ? 'টেস্ট প্রিন্ট পাঠানো হয়েছে' : 'প্রিন্ট ব্যর্থ হয়েছে'),
            backgroundColor: ok ? AppTheme.success : AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isTestPrinting = false);
    }
  }

  List<int> _testTicketBytes() {
    return [
      ...('এস.আর টেলিকম & লাইব্রেরী\n').codeUnits,
      ...('টেস্ট প্রিন্ট সফল হয়েছে\n').codeUnits,
      ...('--------------------------------\n').codeUnits,
      ...('\n\n\n').codeUnits,
    ];
  }

  Future<void> _forget() async {
    await PrinterService.forgetPrinter();
    setState(() => _savedMac = null);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('প্রিন্টার সংযোগ মুছে ফেলা হয়েছে')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('থার্মাল প্রিন্টার সেটআপ'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_statusMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(10)),
                    child: Text(_statusMessage!, style: const TextStyle(fontSize: 13)),
                  ),
                if (_savedMac != null) ...[
                  Card(
                    color: Colors.green.shade50,
                    child: ListTile(
                      leading: const Icon(Icons.print, color: AppTheme.success),
                      title: const Text('সংযুক্ত প্রিন্টার', style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(_savedMac!),
                      trailing: IconButton(
                        icon: const Icon(Icons.link_off, color: AppTheme.danger),
                        tooltip: 'সংযোগ বিচ্ছিন্ন করুন',
                        onPressed: _forget,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _isTestPrinting ? null : _testPrint,
                      icon: _isTestPrinting
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.receipt_long),
                      label: const Text('টেস্ট প্রিন্ট করুন'),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
                const Text('পেয়ারড ব্লুটুথ ডিভাইস', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 8),
                if (_isConnecting) const LinearProgressIndicator(),
                ..._devices.map(
                  (device) => Card(
                    child: ListTile(
                      leading: Icon(
                        Icons.print_outlined,
                        color: device.macAdress == _savedMac ? AppTheme.success : Colors.grey,
                      ),
                      title: Text(device.name),
                      subtitle: Text(device.macAdress),
                      trailing: device.macAdress == _savedMac
                          ? const Icon(Icons.check_circle, color: AppTheme.success)
                          : const Icon(Icons.chevron_right),
                      onTap: _isConnecting ? null : () => _selectDevice(device),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
