import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/publisher.dart';
import '../../providers/store_provider.dart';
import '../../theme/app_theme.dart';

class PublisherFormScreen extends StatefulWidget {
  final Publisher? publisher; // null = create new

  const PublisherFormScreen({super.key, this.publisher});

  @override
  State<PublisherFormScreen> createState() => _PublisherFormScreenState();
}

class _PublisherFormScreenState extends State<PublisherFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _bengaliNameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _addressController;
  late final TextEditingController _commissionController;
  late final TextEditingController _notesController;

  bool _isSubmitting = false;

  bool get _isEditing => widget.publisher != null;

  @override
  void initState() {
    super.initState();
    final p = widget.publisher;
    _nameController = TextEditingController(text: p?.name ?? '');
    _bengaliNameController = TextEditingController(text: p?.bengaliName ?? '');
    _phoneController = TextEditingController(text: p?.phone ?? '');
    _addressController = TextEditingController(text: p?.address ?? '');
    _commissionController = TextEditingController(text: p != null ? p.defaultCommissionRate.toStringAsFixed(0) : '35');
    _notesController = TextEditingController(text: p?.notes ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bengaliNameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _commissionController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final store = Provider.of<StoreProvider>(context, listen: false);
      final publisher = Publisher(
        id: widget.publisher?.id ?? 'pub-${DateTime.now().millisecondsSinceEpoch}',
        name: _nameController.text.trim(),
        bengaliName: _bengaliNameController.text.trim().isEmpty ? null : _bengaliNameController.text.trim(),
        phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        defaultCommissionRate: double.tryParse(_commissionController.text) ?? 35.0,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );

      await store.savePublisher(publisher);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEditing ? 'প্রকাশনী সফলভাবে আপডেট হয়েছে' : 'প্রকাশনী সফলভাবে যোগ হয়েছে'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('ত্রুটি: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'প্রকাশনী সম্পাদনা করুন' : 'নতুন প্রকাশনী যোগ করুন'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'নাম (English) *', prefixIcon: Icon(Icons.business)),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'নাম আবশ্যক' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _bengaliNameController,
              decoration: const InputDecoration(labelText: 'নাম (বাংলা)', prefixIcon: Icon(Icons.translate)),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'ফোন নম্বর', prefixIcon: Icon(Icons.call_outlined)),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'ঠিকানা', prefixIcon: Icon(Icons.location_on_outlined)),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _commissionController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'ডিফল্ট কমিশন হার (%)',
                prefixIcon: Icon(Icons.percent_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notesController,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'নোট', prefixIcon: Icon(Icons.note_outlined)),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                    )
                  : Text(_isEditing ? 'আপডেট করুন' : 'সংরক্ষণ করুন'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
