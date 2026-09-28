import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/models/book_lookup_result.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/services/book_metadata_service.dart';

Product _product({
  String id = 'p1',
  String name = 'Panjeree SSC English Guide',
  String barcode = 'BC-001',
  String? publisher = 'Panjeree',
  String? bookClass = 'Class 10 (SSC)',
  String? subject = 'English',
  String? itemType = 'Guide',
  double mrp = 280,
  double buyPrice = 180,
  int stockQty = 40,
  String category = 'book',
}) {
  return Product(
    id: id,
    name: name,
    category: category,
    barcode: barcode,
    sku: 'SKU-$id',
    publisher: publisher,
    bookClass: bookClass,
    subject: subject,
    itemType: itemType,
    bengaliName: null,
    editionYear: '2026',
    buyPrice: buyPrice,
    mrp: mrp,
    stockQty: stockQty,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ISBN validation', () {
    test('accepts valid ISBN-13', () {
      expect(BookMetadataService.isValidIsbn('9780261102217'), isTrue);
    });

    test('rejects ISBN-13 with a bad check digit', () {
      expect(BookMetadataService.isValidIsbn('9780141187763'), isFalse);
    });

    test('rejects a 13-digit barcode that is not an ISBN prefix', () {
      // 979 is excluded: those are ISMN, not ISBN.
      expect(BookMetadataService.isValidIsbn('9790000000000'), isFalse);
    });

    test('accepts ISBN-10 including a trailing X check digit', () {
      expect(BookMetadataService.isValidIsbn('0-8044-2957-X'), isTrue);
    });

    test('rejects short internal barcodes', () {
      expect(BookMetadataService.isValidIsbn('BC-001'), isFalse);
      expect(BookMetadataService.isValidIsbn('12345'), isFalse);
    });

    test('normalises ISBN-10 to ISBN-13', () {
      final normalized = BookMetadataService.normalizeIsbn('080442957X');
      expect(normalized, isNotNull);
      expect(normalized!.length, 13);
      expect(normalized.startsWith('978'), isTrue);
      expect(BookMetadataService.isValidIsbn(normalized), isTrue);
    });
  });

  group('title rule inference (the Bangladeshi-textbook path)', () {
    test('maps SSC to Class 10', () {
      final r = BookMetadataService.inferFromTitle('Panjeree SSC English Guide');
      expect(r.bookClass, 'Class 10 (SSC)');
    });

    test('maps HSC to Class 12', () {
      final r = BookMetadataService.inferFromTitle('Lecture HSC Bangla Grammar');
      expect(r.bookClass, 'Class 12 (HSC)');
    });

    test('reads Bengali class names', () {
      expect(
        BookMetadataService.inferFromTitle('NCTB Class 9 Science Textbook').bookClass,
        'Class 9',
      );
      expect(
        BookMetadataService.inferFromTitle('এনসিটিবি দশম শ্রেণি বাংলা').bookClass,
        'Class 10 (SSC)',
      );
      expect(
        BookMetadataService.inferFromTitle('নবম শ্রেণি গণিত').bookClass,
        'Class 9',
      );
    });

    test('infers subject from Bengali and English keywords', () {
      expect(BookMetadataService.inferFromTitle('পদার্থবিজ্ঞান').subject, 'Physics');
      expect(BookMetadataService.inferFromTitle('Anupam Model Test Physics').subject, 'Physics');
      expect(BookMetadataService.inferFromTitle('রসায়ন ১১').subject, 'Chemistry');
      expect(BookMetadataService.inferFromTitle('গণিত সমাধান').subject, 'Math');
    });

    test('infers item type', () {
      expect(BookMetadataService.inferFromTitle('Anupam Model Test Physics').itemType, 'Model Test');
      expect(BookMetadataService.inferFromTitle('Royal Chemistry Practical Book').itemType, 'Practical');
      // Dictionaries follow the catalog's own convention.
      final dict = BookMetadataService.inferFromTitle('Popy English to Bangla Dictionary');
      expect(dict.itemType, 'Reference');
      expect(dict.subject, 'Dictionary');
    });

    test('tags each inferred field with its source', () {
      final r = BookMetadataService.inferFromTitle('Lecture HSC Physics Guide');
      expect(r.sourceOf('bookClass'), LookupSource.titleRule);
      expect(r.sourceOf('subject'), LookupSource.titleRule);
    });

    test('returns an empty result for an unrecognisable title', () {
      final r = BookMetadataService.inferFromTitle('zzzz qqqq');
      expect(r.isEmpty, isTrue);
    });
  });

  group('publisher inference', () {
    test('picks a publisher the shop already stocks', () {
      final catalog = [_product(publisher: 'Panjeree'), _product(id: 'p2', publisher: 'Lecture')];
      final r = BookMetadataService.inferPublisherFromTitle(
        'Panjeree HSC Physics Guide',
        catalog,
      );
      expect(r.publisher, 'Panjeree');
    });

    test('does not invent a publisher that is not in the catalog', () {
      final catalog = [_product(publisher: 'Panjeree')];
      final r = BookMetadataService.inferPublisherFromTitle('Some Unknown Press Book', catalog);
      expect(r.publisher, isNull);
    });
  });

  group('lookup', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('exact catalog barcode wins and suggests the existing price', () async {
      final service = BookMetadataService(
        client: MockClient((_) async => http.Response('{}', 404)),
      );
      final catalog = [_product()];

      final r = await service.lookup(barcode: 'BC-001', catalog: catalog);

      expect(r.name, 'Panjeree SSC English Guide');
      expect(r.publisher, 'Panjeree');
      expect(r.sourceOf('name'), LookupSource.localCatalog);
      expect(r.suggestedMrp, 280);
      expect(r.suggestedBuyPrice, 180);
      expect(r.matchedProductId, 'p1');
    });

    test('unknown non-ISBN barcode falls back to title rules only', () async {
      var calls = 0;
      final service = BookMetadataService(
        client: MockClient((_) async {
          calls++;
          return http.Response('{}', 404);
        }),
      );

      final r = await service.lookup(
        barcode: 'BC-NOT-FOUND',
        catalog: [_product()],
        titleHint: 'Lecture HSC Bangla Grammar',
      );

      // No network call for a non-ISBN barcode.
      expect(calls, 0);
      expect(r.bookClass, 'Class 12 (HSC)');
      expect(r.subject, 'Bangla');
    });

    test('valid ISBN queries Open Library and maps the response', () async {
      final service = BookMetadataService(
        client: MockClient((req) async {
          expect(req.url.toString(), contains('openlibrary.org/isbn/9780261102217'));
          return http.Response(
            jsonEncode({
              'title': 'The Hobbit',
              'subtitle': 'or There and Back Again',
              'publishers': ['HarperCollins'],
              'publish_date': '2009',
            }),
            200,
          );
        }),
      );

      final r = await service.lookup(barcode: '9780261102217', catalog: []);

      expect(r.name, 'The Hobbit: or There and Back Again');
      expect(r.publisher, 'HarperCollins');
      expect(r.editionYear, '2009');
      expect(r.sourceOf('name'), LookupSource.openLibrary);
      expect(r.imageUrl, contains('covers.openlibrary.org'));
    });

    test('a network failure degrades gracefully instead of throwing', () async {
      final service = BookMetadataService(
        client: MockClient((_) async => throw const SocketExceptionStub()),
      );

      final r = await service.lookup(
        barcode: '9780261102217',
        catalog: [],
        titleHint: 'Physics Guide',
      );

      expect(r.subject, 'Physics');
    });

    test('caches a resolved barcode for the next offline scan', () async {
      final service = BookMetadataService(
        client: MockClient((_) async => http.Response('{}', 404)),
      );

      final first = await service.lookup(
        barcode: 'BC-CACHE-1',
        catalog: [],
        titleHint: 'Nobodut SSC Math Solution',
      );
      expect(first.bookClass, 'Class 10 (SSC)');
      expect(first.subject, 'Math');
      // The service never invents a product name it was not given.
      expect(first.name, isNull);

      // A brand new service instance shares the same device storage, so the
      // remembered resolution is reused even with no catalog and no network.
      final second = BookMetadataService(
        client: MockClient((_) async => http.Response('{}', 404)),
      );
      final cached = await second.lookup(barcode: 'BC-CACHE-1', catalog: []);

      expect(cached.bookClass, 'Class 10 (SSC)');
      expect(cached.subject, 'Math');
      expect(cached.sourceOf('bookClass'), LookupSource.localMemory);
    });

    test('caches a catalog name so a later scan needs no network', () async {
      final service = BookMetadataService(
        client: MockClient((_) async => http.Response('{}', 404)),
      );
      await service.lookup(barcode: 'BC-001', catalog: [_product()]);

      // Empty catalog: the only way to recover the name is the device cache.
      final offline = BookMetadataService(
        client: MockClient((_) async => throw const SocketExceptionStub()),
      );
      final cached = await offline.lookup(barcode: 'BC-001', catalog: []);

      expect(cached.name, 'Panjeree SSC English Guide');
      expect(cached.publisher, 'Panjeree');
      expect(cached.sourceOf('name'), LookupSource.localMemory);
    });

    test('empty barcode returns an empty result without work', () async {
      final service = BookMetadataService(
        client: MockClient((_) async => http.Response('{}', 500)),
      );
      final r = await service.lookup(barcode: '   ', catalog: [_product()]);
      expect(r.isEmpty, isTrue);
    });
  });

  group('result merging', () {
    test('a more trustworthy source wins on conflict', () {
      final local = BookLookupResult(
        name: 'Catalog Name',
        sources: {'name': const ResolvedField('Catalog Name', LookupSource.localCatalog)},
      );
      final remote = BookLookupResult(
        name: 'Remote Name',
        sources: {'name': const ResolvedField('Remote Name', LookupSource.openLibrary)},
      );

      expect(local.merge(remote).name, 'Catalog Name');
      expect(remote.merge(local).name, 'Catalog Name');
    });

    test('empty values never overwrite real ones', () {
      final a = BookLookupResult(
        name: 'Real',
        sources: {'name': const ResolvedField('Real', LookupSource.localCatalog)},
      );
      final b = BookLookupResult(name: '   ', publisher: 'Panjeree', sources: const {});
      final merged = a.merge(b);

      expect(merged.name, 'Real');
      expect(merged.publisher, 'Panjeree');
    });

    test('isEmpty is true when nothing usable was found', () {
      expect(BookLookupResult().isEmpty, isTrue);
      expect(BookLookupResult(name: 'x').isEmpty, isFalse);
      expect(BookLookupResult(name: '  ').isEmpty, isTrue);
    });
  });
}

/// Stand-in for a transport failure so the test does not depend on real sockets.
class SocketExceptionStub implements Exception {
  const SocketExceptionStub();
  @override
  String toString() => 'SocketException: connection failed';
}
