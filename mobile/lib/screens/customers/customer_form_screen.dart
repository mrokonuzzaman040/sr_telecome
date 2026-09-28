import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/customer.dart';
import '../../providers/store_provider.dart';
import '../../theme/app_theme.dart';

class CustomerFormScreen extends StatefulWidget {
  final Customer? customer; // null = create new

  const CustomerFormScreen({super.key, this.customer});

  @override
  State<CustomerFormScreen> createState() => _CustomerFormScreenState();
}

class _CustomerFormScreenState extends State<CustomerFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _addressController;
  late final TextEditingController _commissionController;

  String _type = 'single';
  bool _isSubmitting = false;

  bool get _isEditing => widget.customer != null;

  @override
  void initState() {
    super.initState();
    final c = widget.customer;
    _nameController = TextEditingController(text: c?.name ?? '');
    _phoneController = TextEditingController(text: c?.phone ?? '');
    _addressController = TextEditingController(text: c?.address ?? '');
    _commissionController = TextEditingController(text: c != null ? c.defaultCommissionRate.toStringAsFixed(0) : '0');
    _type = c?.type ?? 'single';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _commissionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final store = Provider.of<StoreProvider>(context, listen: false);
      final customer = Customer(
        id: widget.customer?.id ?? 'cust-${DateTime.now().millisecondsSinceEpoch}',
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
        address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        type: _type,
        defaultCommissionRate: double.tryParse(_commissionController.text) ?? 0,
        totalPurchased: widget.customer?.totalPurchased ?? 0,
        totalPaid: widget.customer?.totalPaid ?? 0,
        currentDue: widget.customer?.currentDue ?? 0,
      );

      if (_isEditing) {
        await store.updateCustomer(customer);
      } else {
        await store.addCustomer(customer);
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEditing ? 'কাস্টমার সফলভাবে আপডেট হয়েছে' : 'কাস্টমার সফলভাবে যোগ হয়েছে'),
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
        title: Text(_isEditing ? 'কাস্টমার সম্পাদনা করুন' : 'নতুন কাস্টমার যোগ করুন'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'নাম *', prefixIcon: Icon(Icons.person_outline)),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'নাম আবশ্যক' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'ফোন নম্বর *', prefixIcon: Icon(Icons.call_outlined)),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'ফোন নম্বর আবশ্যক' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'ঠিকানা', prefixIcon: Icon(Icons.location_on_outlined)),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'ধরন *', prefixIcon: Icon(Icons.storefront_outlined)),
              items: const [
                DropdownMenuItem(value: 'single', child: Text('খুচরা কাস্টমার (Single)')),
                DropdownMenuItem(value: 'agent', child: Text('এজেন্ট (Agent)')),
              ],
              onChanged: (val) => setState(() => _type = val ?? 'single'),
            ),
            if (_type == 'agent') ...[
              const SizedBox(height: 12),
              TextFormField(
                controller: _commissionController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'ডিফল্ট কমিশন হার (%)',
                  prefixIcon: Icon(Icons.percent_outlined),
                ),
              ),
            ],
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
