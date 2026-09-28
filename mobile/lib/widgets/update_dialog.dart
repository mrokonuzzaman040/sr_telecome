import 'package:flutter/material.dart';
import '../services/update_service.dart';

class UpdateDialog extends StatelessWidget {
  final AppVersion versionInfo;
  final bool forceUpdate;

  const UpdateDialog({
    super.key,
    required this.versionInfo,
    required this.forceUpdate,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(
            forceUpdate ? Icons.system_update_alt : Icons.info_outline,
            color: forceUpdate ? Colors.red : Colors.blue,
          ),
          const SizedBox(width: 8),
          Text(
            forceUpdate ? 'আপডেট প্রয়োজন' : 'নতুন আপডেট উপলব্ধ',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'বর্তমান সংস্করণ: ${versionInfo.current}',
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 4),
            Text(
              'নতুন সংস্করণ: ${versionInfo.latest}',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'পরিবর্তনসমূহ:',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...versionInfo.releaseNotes.map((note) => Padding(
                  padding: const EdgeInsets.only(left: 8, bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(fontSize: 14)),
                      Expanded(
                        child: Text(
                          note,
                          style: const TextStyle(fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                )),
            if (forceUpdate)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning, color: Colors.red.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'এই আপডেটটি প্রয়োজনীয়। আপনার বর্তমান সংস্করণটি আর সমর্থিত নয়।',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.red.shade700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
      actions: [
        if (!forceUpdate)
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('বাতিল'),
          ),
        ElevatedButton(
          onPressed: () async {
            Navigator.of(context).pop();
            await UpdateService.downloadUpdate(versionInfo.downloadUrl);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: forceUpdate ? Colors.red : Colors.blue,
            foregroundColor: Colors.white,
          ),
          child: const Text('আপডেট ডাউনলোড করুন'),
        ),
      ],
    );
  }
}
