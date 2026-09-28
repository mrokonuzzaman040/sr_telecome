import 'package:intl/intl.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:print_bluetooth_thermal/post_code.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/sale.dart';

class PrinterService {
  static const String _macKey = 'sr_printer_mac';
  static const String _nameKey = 'sr_printer_name';

  static Future<String?> getSavedPrinterMac() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_macKey);
  }

  static Future<String?> getSavedPrinterName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_nameKey);
  }

  static Future<void> saveSelectedPrinter(BluetoothInfo device) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_macKey, device.macAdress);
    await prefs.setString(_nameKey, device.name);
  }

  static Future<void> forgetPrinter() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_macKey);
    await prefs.remove(_nameKey);
    if (await PrintBluetoothThermal.connectionStatus) {
      await PrintBluetoothThermal.disconnect;
    }
  }

  static Future<bool> get bluetoothEnabled => PrintBluetoothThermal.bluetoothEnabled;

  static Future<bool> get isPermissionGranted => PrintBluetoothThermal.isPermissionBluetoothGranted;

  static Future<List<BluetoothInfo>> getPairedDevices() => PrintBluetoothThermal.pairedBluetooths;

  static Future<bool> get isConnected => PrintBluetoothThermal.connectionStatus;

  static Future<bool> connect(String mac) => PrintBluetoothThermal.connect(macPrinterAddress: mac);

  static Future<bool> disconnect() => PrintBluetoothThermal.disconnect;

  /// Connects to the previously saved printer (if any) and returns whether
  /// a printer is ready to receive a print job.
  static Future<bool> ensureConnectedToSavedPrinter() async {
    if (await isConnected) return true;
    final mac = await getSavedPrinterMac();
    if (mac == null) return false;
    return connect(mac);
  }

  /// Builds and sends an ESC/POS thermal receipt for the given sale to the
  /// currently connected (or last-saved) printer.
  static Future<bool> printSaleReceipt(Sale sale) async {
    final ready = await ensureConnectedToSavedPrinter();
    if (!ready) return false;

    final bytes = _buildReceiptBytes(sale);
    return PrintBluetoothThermal.writeBytes(bytes);
  }

  static List<int> _buildReceiptBytes(Sale sale) {
    final currency = NumberFormat('#,##0', 'en_US');
    final bytes = <int>[];

    bytes.addAll(PostCode.reset());
    bytes.addAll(PostCode.text(text: 'এস.আর টেলিকম & লাইব্রেরী', align: AlignPos.center, bold: true, fontSize: FontSize.doubleWidth));
    bytes.addAll(PostCode.text(text: 'SR Telecom & Library', align: AlignPos.center));
    bytes.addAll(PostCode.line());
    bytes.addAll(PostCode.text(text: 'চালান নং: ${sale.invoiceNo}', align: AlignPos.left, bold: true));
    bytes.addAll(PostCode.text(text: 'তারিখ: ${sale.createdAt.split('T').first}', align: AlignPos.left));
    bytes.addAll(PostCode.text(text: 'ক্রেতা: ${sale.customerName}', align: AlignPos.left));
    bytes.addAll(PostCode.line());

    for (final item in sale.items) {
      bytes.addAll(PostCode.text(text: item.productName, align: AlignPos.left));
      bytes.addAll(PostCode.row(
        texts: ['${item.quantity} x ${currency.format(item.unitPrice)}', currency.format(item.total)],
        proportions: [60, 40],
      ));
    }

    bytes.addAll(PostCode.line());
    bytes.addAll(PostCode.row(texts: ['সাবটোটাল', '৳${currency.format(sale.subtotal)}'], proportions: [60, 40]));
    if (sale.totalDiscount > 0) {
      bytes.addAll(PostCode.row(texts: ['ছাড়', '-৳${currency.format(sale.totalDiscount)}'], proportions: [60, 40]));
    }
    bytes.addAll(PostCode.row(
      texts: ['মোট', '৳${currency.format(sale.payableAmount)}'],
      proportions: [60, 40],
      fontSize: FontSize.doubleWidth,
    ));
    bytes.addAll(PostCode.row(texts: ['পরিশোধিত', '৳${currency.format(sale.paidAmount)}'], proportions: [60, 40]));
    if (sale.dueAmount > 0) {
      bytes.addAll(PostCode.row(texts: ['বাকি', '৳${currency.format(sale.dueAmount)}'], proportions: [60, 40]));
    }
    bytes.addAll(PostCode.line());
    bytes.addAll(PostCode.text(text: 'ধন্যবাদান্তে আবার আসবেন', align: AlignPos.center));
    bytes.addAll(PostCode.cut());

    return bytes;
  }
}
