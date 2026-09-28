import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/sale.dart';
import '../models/return_record.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';

class PdfInvoiceService {
  static final _currency = NumberFormat('#,##0', 'en_US');

  static const String shopName = 'SR Telecom & Library';
  static const String bengaliShopName = 'এস. আর. টেলিকম এন্ড লাইব্রেরি';
  static const String proprietor = 'মো: রোকনুজ্জামান';
  static const String phone = '01712-345678';
  static const String address = 'মেইন রোড, সোনালী ব্যাংক মোড়, থানা সদর';
  static const String footerMessage = 'বই জ্ঞানের আলো ছড়ায় • আমাদের সাথে থাকার জন্য ধন্যবাদ';

  /// Load Unicode Bengali font safely with fallback
  static Future<pw.Font> _loadFont({bool bold = false}) async {
    try {
      if (bold) {
        return await PdfGoogleFonts.notoSansBengaliBold();
      } else {
        return await PdfGoogleFonts.notoSansBengaliRegular();
      }
    } catch (_) {
      // Offline fallback
      return bold ? pw.Font.helveticaBold() : pw.Font.helvetica();
    }
  }

  /// Generate high-quality A4 / Receipt PDF for a sale invoice
  static Future<Uint8List> generateSalePdf(Sale sale) async {
    final pdf = pw.Document();
    final fontRegular = await _loadFont(bold: false);
    final fontBold = await _loadFont(bold: true);

    final isPaid = sale.dueAmount <= 0;
    final dateFormatted = sale.createdAt.contains('T')
        ? sale.createdAt.split('T').first
        : sale.createdAt;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        bengaliShopName,
                        style: pw.TextStyle(font: fontBold, fontSize: 20, color: PdfColors.blueGrey900),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        shopName,
                        style: pw.TextStyle(font: fontBold, fontSize: 13, color: PdfColors.blueGrey700),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'স্বত্বাধিকারী: $proprietor  |  ফোন: $phone',
                        style: pw.TextStyle(font: fontRegular, fontSize: 10, color: PdfColors.grey700),
                      ),
                      pw.Text(
                        address,
                        style: pw.TextStyle(font: fontRegular, fontSize: 10, color: PdfColors.grey700),
                      ),
                    ],
                  ),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: pw.BoxDecoration(
                      color: isPaid ? PdfColors.green50 : PdfColors.red50,
                      borderRadius: pw.BorderRadius.circular(6),
                      border: pw.Border.all(color: isPaid ? PdfColors.green400 : PdfColors.red400),
                    ),
                    child: pw.Column(
                      children: [
                        pw.Text(
                          isPaid ? 'PAID / পরিশোধিত' : 'DUE / বকেয়া',
                          style: pw.TextStyle(
                            font: fontBold,
                            fontSize: 12,
                            color: isPaid ? PdfColors.green800 : PdfColors.red800,
                          ),
                        ),
                        if (!isPaid)
                          pw.Text(
                            'বাকি: Tk ${_currency.format(sale.dueAmount)}',
                            style: pw.TextStyle(font: fontBold, fontSize: 10, color: PdfColors.red800),
                          ),
                      ],
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 12),
              pw.Divider(thickness: 1, color: PdfColors.grey300),
              pw.SizedBox(height: 10),

              // Invoice Details & Customer Info
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('চালান / ইনভয়েস নং: ${sale.invoiceNo}', style: pw.TextStyle(font: fontBold, fontSize: 11)),
                      pw.SizedBox(height: 3),
                      pw.Text('তারিখ: $dateFormatted', style: pw.TextStyle(font: fontRegular, fontSize: 10, color: PdfColors.grey800)),
                      pw.Text('পেমেন্ট মাধ্যম: ${sale.paymentMethod.toUpperCase()}', style: pw.TextStyle(font: fontRegular, fontSize: 10, color: PdfColors.grey800)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('ক্রেতার নাম: ${sale.customerName}', style: pw.TextStyle(font: fontBold, fontSize: 11)),
                      pw.SizedBox(height: 3),
                      if (sale.customerPhone != null && sale.customerPhone!.isNotEmpty)
                        pw.Text('মোবাইল: ${sale.customerPhone}', style: pw.TextStyle(font: fontRegular, fontSize: 10, color: PdfColors.grey800)),
                      pw.Text(
                        'গ্রাহকের ধরণ: ${sale.customerType == 'agent' ? 'পাইকারি এজেন্ট (Agent)' : 'সাধারণ খুচরা (Single)'}',
                        style: pw.TextStyle(font: fontRegular, fontSize: 10, color: PdfColors.grey800),
                      ),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 16),

              // Items Table
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
                columnWidths: {
                  0: const pw.FixedColumnWidth(28),
                  1: const pw.FlexColumnWidth(4),
                  2: const pw.FixedColumnWidth(40),
                  3: const pw.FixedColumnWidth(55),
                  4: const pw.FixedColumnWidth(55),
                  5: const pw.FixedColumnWidth(55),
                  6: const pw.FixedColumnWidth(65),
                },
                children: [
                  // Table Header
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                    children: [
                      _cell('নং', font: fontBold, isHeader: true, align: pw.TextAlign.center),
                      _cell('পণ্যের বিবরণ', font: fontBold, isHeader: true),
                      _cell('পরিমাণ', font: fontBold, isHeader: true, align: pw.TextAlign.center),
                      _cell('গায়ের মূল্য', font: fontBold, isHeader: true, align: pw.TextAlign.right),
                      _cell('কমিশন/ছাড়', font: fontBold, isHeader: true, align: pw.TextAlign.right),
                      _cell('বিক্রয় দর', font: fontBold, isHeader: true, align: pw.TextAlign.right),
                      _cell('মোট (টাকা)', font: fontBold, isHeader: true, align: pw.TextAlign.right),
                    ],
                  ),
                  // Table Rows
                  ...sale.items.asMap().entries.map((entry) {
                    final idx = entry.key + 1;
                    final item = entry.value;
                    final discText = item.unitDiscount > 0
                        ? '${_currency.format(item.unitDiscount)}${item.commissionRate != null ? ' (${item.commissionRate!.toInt()}%)' : ''}'
                        : '-';
                    return pw.TableRow(
                      children: [
                        _cell('$idx', font: fontRegular, align: pw.TextAlign.center),
                        _cell(item.productName, font: fontRegular),
                        _cell('${item.quantity}', font: fontRegular, align: pw.TextAlign.center),
                        _cell('Tk ${_currency.format(item.mrp)}', font: fontRegular, align: pw.TextAlign.right),
                        _cell(discText, font: fontRegular, align: pw.TextAlign.right),
                        _cell('Tk ${_currency.format(item.unitPrice)}', font: fontRegular, align: pw.TextAlign.right),
                        _cell('Tk ${_currency.format(item.total)}', font: fontBold, align: pw.TextAlign.right),
                      ],
                    );
                  }),
                ],
              ),

              pw.SizedBox(height: 16),

              // Totals summary section
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Left side notes / info
                  pw.Expanded(
                    flex: 3,
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(10),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.grey50,
                        border: pw.Border.all(color: PdfColors.grey200),
                        borderRadius: pw.BorderRadius.circular(6),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('বিশেষ দ্রষ্টব্য:', style: pw.TextStyle(font: fontBold, fontSize: 9)),
                          pw.SizedBox(height: 3),
                          pw.Text('১. বিক্রিত বই বা মালামাল পরিবর্তনযোগ্য (শর্ত সাপেক্ষে)।', style: pw.TextStyle(font: fontRegular, fontSize: 8, color: PdfColors.grey700)),
                          pw.Text('২. চালান ব্যতীত কোনো পণ্য ফেরত বা এক্সচেঞ্জ করা হবে না।', style: pw.TextStyle(font: fontRegular, fontSize: 8, color: PdfColors.grey700)),
                          if (sale.notes != null && sale.notes!.isNotEmpty) ...[
                            pw.SizedBox(height: 6),
                            pw.Text('নোট: ${sale.notes}', style: pw.TextStyle(font: fontRegular, fontSize: 9, color: PdfColors.blueGrey800)),
                          ],
                        ],
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 20),
                  // Right side calculations
                  pw.Expanded(
                    flex: 2,
                    child: pw.Column(
                      children: [
                        _totalRow('সাবটোটাল (MRP):', 'Tk ${_currency.format(sale.subtotal)}', fontRegular),
                        if (sale.totalDiscount > 0)
                          _totalRow('মোট ছাড় / কমিশন:', '-Tk ${_currency.format(sale.totalDiscount)}', fontRegular, color: PdfColors.green800),
                        pw.Divider(thickness: 0.5, color: PdfColors.grey300),
                        _totalRow('পরিশোধযোগ্য মূল্য:', 'Tk ${_currency.format(sale.payableAmount)}', fontBold, fontSize: 11),
                        _totalRow('জমা / পরিশোধিত:', 'Tk ${_currency.format(sale.paidAmount)}', fontRegular, color: PdfColors.green800),
                        if (sale.dueAmount > 0)
                          _totalRow('বকেয়া / বাকি:', 'Tk ${_currency.format(sale.dueAmount)}', fontBold, color: PdfColors.red800),
                      ],
                    ),
                  ),
                ],
              ),

              pw.Spacer(),

              // Signatures
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    children: [
                      pw.Container(width: 120, height: 1, color: PdfColors.grey400),
                      pw.SizedBox(height: 4),
                      pw.Text('ক্রেতার স্বাক্ষর', style: pw.TextStyle(font: fontRegular, fontSize: 9)),
                    ],
                  ),
                  pw.Column(
                    children: [
                      pw.Container(width: 120, height: 1, color: PdfColors.grey400),
                      pw.SizedBox(height: 4),
                      pw.Text('কর্তৃপক্ষের স্বাক্ষর', style: pw.TextStyle(font: fontRegular, fontSize: 9)),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 12),
              pw.Center(
                child: pw.Text(
                  footerMessage,
                  style: pw.TextStyle(font: fontRegular, fontSize: 9, color: PdfColors.grey600),
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  /// Generate Return & Exchange Voucher PDF
  static Future<Uint8List> generateReturnSlipPdf(ReturnRecord record) async {
    final pdf = pw.Document();
    final fontRegular = await _loadFont(bold: false);
    final fontBold = await _loadFont(bold: true);

    final createdAt = record.createdAt ?? '';
    final dateFormatted =
        createdAt.contains('T') ? createdAt.split('T').first : createdAt;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(bengaliShopName, style: pw.TextStyle(font: fontBold, fontSize: 18)),
                      pw.Text('রিটার্ন ও এক্সচেঞ্জ ভাউচার (Return & Exchange Slip)', style: pw.TextStyle(font: fontBold, fontSize: 12, color: PdfColors.blueGrey800)),
                      pw.Text('ফোন: $phone  |  $address', style: pw.TextStyle(font: fontRegular, fontSize: 9, color: PdfColors.grey700)),
                    ],
                  ),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.grey100,
                      borderRadius: pw.BorderRadius.circular(6),
                      border: pw.Border.all(color: PdfColors.grey300),
                    ),
                    child: pw.Text(
                      'ভাউচার: #${record.id.length > 12 ? record.id.substring(record.id.length - 8) : record.id}',
                      style: pw.TextStyle(font: fontBold, fontSize: 10),
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 10),
              pw.Divider(thickness: 1, color: PdfColors.grey300),
              pw.SizedBox(height: 8),

              // Customer & Reference
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('ক্রেতা: ${record.customerName}', style: pw.TextStyle(font: fontBold, fontSize: 11)),
                  pw.Text('তারিখ: $dateFormatted', style: pw.TextStyle(font: fontRegular, fontSize: 10)),
                  if (record.invoiceNo != null)
                    pw.Text('মূল চালান: ${record.invoiceNo}', style: pw.TextStyle(font: fontRegular, fontSize: 10)),
                ],
              ),
              pw.SizedBox(height: 12),

              // Returned Items Table
              pw.Text('ফেরত দেওয়া পণ্যসমূহ (Returned Items):', style: pw.TextStyle(font: fontBold, fontSize: 11, color: PdfColors.red800)),
              pw.SizedBox(height: 4),
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
                children: [
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                    children: [
                      _cell('বিবরণ', font: fontBold, isHeader: true),
                      _cell('পরিমাণ', font: fontBold, isHeader: true, align: pw.TextAlign.center),
                      _cell('ফেরত দর', font: fontBold, isHeader: true, align: pw.TextAlign.right),
                      _cell('মোট মূল্য', font: fontBold, isHeader: true, align: pw.TextAlign.right),
                    ],
                  ),
                  ...record.returnedItems.map((item) => pw.TableRow(
                    children: [
                      _cell(item.productName, font: fontRegular),
                      _cell('${item.quantity}', font: fontRegular, align: pw.TextAlign.center),
                      _cell('Tk ${_currency.format(item.unitPrice)}', font: fontRegular, align: pw.TextAlign.right),
                      _cell('Tk ${_currency.format(item.total)}', font: fontBold, align: pw.TextAlign.right),
                    ],
                  )),
                ],
              ),

              // Replacement Items (if any)
              if (record.replacementItems.isNotEmpty) ...[
                pw.SizedBox(height: 12),
                pw.Text('পরিবর্তিত নতুন পণ্যসমূহ (Replacement Items):', style: pw.TextStyle(font: fontBold, fontSize: 11, color: PdfColors.green800)),
                pw.SizedBox(height: 4),
                pw.Table(
                  border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
                  children: [
                    pw.TableRow(
                      decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                      children: [
                        _cell('বিবরণ', font: fontBold, isHeader: true),
                        _cell('পরিমাণ', font: fontBold, isHeader: true, align: pw.TextAlign.center),
                        _cell('মূল্য দর', font: fontBold, isHeader: true, align: pw.TextAlign.right),
                        _cell('মোট মূল্য', font: fontBold, isHeader: true, align: pw.TextAlign.right),
                      ],
                    ),
                    ...record.replacementItems.map((item) => pw.TableRow(
                      children: [
                        _cell(item.productName, font: fontRegular),
                        _cell('${item.quantity}', font: fontRegular, align: pw.TextAlign.center),
                        _cell('Tk ${_currency.format(item.unitPrice)}', font: fontRegular, align: pw.TextAlign.right),
                        _cell('Tk ${_currency.format(item.total)}', font: fontBold, align: pw.TextAlign.right),
                      ],
                    )),
                  ],
                ),
              ],

              pw.SizedBox(height: 16),
              // Summary
              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey50,
                  border: pw.Border.all(color: PdfColors.grey300),
                  borderRadius: pw.BorderRadius.circular(6),
                ),
                child: pw.Column(
                  children: [
                    _totalRow('মোট ফেরত মূল্য (Credit):', 'Tk ${_currency.format(record.totalRefundCredit)}', fontRegular),
                    _totalRow('মোট নতুন পণ্যের মূল্য:', 'Tk ${_currency.format(record.totalReplacementValue)}', fontRegular),
                    pw.Divider(thickness: 0.5, color: PdfColors.grey300),
                    _totalRow(
                      record.priceDifference > 0 ? 'গ্রাহক পরিশোধ করেছে:' : 'দোকান ফেরত / সমন্বয় করেছে:',
                      'Tk ${_currency.format(record.priceDifference.abs())}',
                      fontBold,
                      color: record.priceDifference > 0 ? PdfColors.red800 : PdfColors.green800,
                    ),
                    if (record.reason.isNotEmpty) ...[
                      pw.SizedBox(height: 4),
                      _totalRow('রিটার্নের কারণ:', record.reason, fontRegular),
                    ],
                  ],
                ),
              ),

              pw.Spacer(),

              // Signatures
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    children: [
                      pw.Container(width: 120, height: 1, color: PdfColors.grey400),
                      pw.SizedBox(height: 4),
                      pw.Text('গ্রাহকের স্বাক্ষর', style: pw.TextStyle(font: fontRegular, fontSize: 9)),
                    ],
                  ),
                  pw.Column(
                    children: [
                      pw.Container(width: 120, height: 1, color: PdfColors.grey400),
                      pw.SizedBox(height: 4),
                      pw.Text('কর্তৃপক্ষের স্বাক্ষর', style: pw.TextStyle(font: fontRegular, fontSize: 9)),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 10),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  /// 1. Print directly using Bluetooth thermal printer, or fallback to system print
  static Future<bool> printSale(BuildContext context, Sale sale) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      const SnackBar(content: Text('প্রিন্টারে পাঠানো হচ্ছে...')),
    );

    try {
      final ok = await PrinterService.printSaleReceipt(sale);
      if (ok) {
        messenger.showSnackBar(
          const SnackBar(content: Text('রিসিপ্ট প্রিন্ট হয়েছে'), backgroundColor: AppTheme.success),
        );
        return true;
      }
    } catch (_) {}

    // Fallback to system print dialog
    try {
      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => generateSalePdf(sale),
        name: '${sale.invoiceNo}.pdf',
      );
      return true;
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('প্রিন্ট ত্রুটি: $e'), backgroundColor: AppTheme.danger),
      );
      return false;
    }
  }

  /// 2. Save as PDF or Share
  static Future<void> shareSalePdf(BuildContext context, Sale sale) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      const SnackBar(content: Text('PDF প্রস্তুত করা হচ্ছে...')),
    );

    try {
      final bytes = await generateSalePdf(sale);
      await Printing.sharePdf(
        bytes: bytes,
        filename: '${sale.invoiceNo}.pdf',
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('PDF তৈরি ব্যর্থ: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  /// 1. Print Return Slip
  static Future<bool> printReturn(BuildContext context, ReturnRecord record) async {
    try {
      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => generateReturnSlipPdf(record),
        name: 'Return-${record.id}.pdf',
      );
      return true;
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('প্রিন্ট ত্রুটি: $e'), backgroundColor: AppTheme.danger),
      );
      return false;
    }
  }

  /// 2. Share Return Slip as PDF
  static Future<void> shareReturnPdf(BuildContext context, ReturnRecord record) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      const SnackBar(content: Text('ভাউচার PDF প্রস্তুত করা হচ্ছে...')),
    );

    try {
      final bytes = await generateReturnSlipPdf(record);
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'Return-${record.id}.pdf',
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('PDF শেয়ার ব্যর্থ: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  // --- Helper Table Widgets ---
  static pw.Widget _cell(
    String text, {
    required pw.Font font,
    bool isHeader = false,
    pw.TextAlign align = pw.TextAlign.left,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 5, vertical: 5),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(
          font: font,
          fontSize: isHeader ? 8.5 : 8,
          color: isHeader ? PdfColors.blueGrey900 : PdfColors.black,
        ),
      ),
    );
  }

  static pw.Widget _totalRow(
    String label,
    String value,
    pw.Font font, {
    PdfColor? color,
    double fontSize = 9.5,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: pw.TextStyle(font: font, fontSize: fontSize, color: PdfColors.grey800)),
          pw.Text(value, style: pw.TextStyle(font: font, fontSize: fontSize, color: color ?? PdfColors.black)),
        ],
      ),
    );
  }
}

/// A modern, reusable Modal Bottom Sheet presenting the 2 Print options
void showPrintOptionsModal(
  BuildContext context, {
  Sale? sale,
  ReturnRecord? returnRecord,
}) {
  assert(sale != null || returnRecord != null, 'Either sale or returnRecord must be provided');

  final isSale = sale != null;
  final title = isSale ? 'চালান #${sale.invoiceNo}' : 'রিটার্ন ভাউচার';

  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (ctx) => Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.print, color: AppTheme.primary, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 2),
                      const Text('প্রিন্ট বা PDF সংরক্ষণের অপশন বেছে নিন', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Option 1: Print
            InkWell(
              onTap: () {
                Navigator.pop(ctx);
                if (isSale) {
                  PdfInvoiceService.printSale(context, sale);
                } else {
                  PdfInvoiceService.printReturn(context, returnRecord!);
                }
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                  borderRadius: BorderRadius.circular(16),
                  color: AppTheme.primary.withValues(alpha: 0.04),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.print, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('১. সরাসরি প্রিন্ট (Print)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          SizedBox(height: 2),
                          Text('ব্লুটুথ থার্মাল প্রিন্টার অথবা সিস্টেম প্রিন্টারে পাঠান', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, size: 16, color: AppTheme.primary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Option 2: Save as PDF or Share
            InkWell(
              onTap: () {
                Navigator.pop(ctx);
                if (isSale) {
                  PdfInvoiceService.shareSalePdf(context, sale);
                } else {
                  PdfInvoiceService.shareReturnPdf(context, returnRecord!);
                }
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(16),
                  color: Colors.grey.shade50,
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.indigo,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.picture_as_pdf, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('২. PDF সংরক্ষণ বা শেয়ার (Save as PDF / Share)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          SizedBox(height: 2),
                          Text('হোয়াটসঅ্যাপ, ইমেইল বা ডিভাইসে PDF আকারে সংরক্ষণ করুন', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ),
                    Icon(Icons.share, size: 18, color: Colors.grey.shade700),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    ),
  );
}
