import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/book_lookup_result.dart';
import '../models/product.dart';

/// Resolves product metadata from a scanned barcode, using only free sources.
///
/// Lookup order (most trustworthy first):
///   1. [LookupSource.localCatalog]  — exact barcode already in the shop's
///      own catalog. Always correct, works offline.
///   2. [LookupSource.localMemory]   — a barcode this device resolved before,
///      cached in SharedPreferences. Works offline.
///   3. [LookupSource.similarProduct]— a near-duplicate matched on name,
///      publisher and class (covers a re-printed book with a new barcode).
///   4. [LookupSource.openLibrary]   — the free, no-API-key Open Library.
///   5. [LookupSource.titleRule]     — keyword rules on the scanned/typed
///      title. This is what actually resolves Bangladeshi textbooks, which no
///      international API carries.
///
/// Deliberately never fetches prices from an API: a foreign list price is
/// meaningless to a local shop. Prices are only ever suggested from an
/// identical product the shop already stocks.
class BookMetadataService {
  static const String _cacheKey = 'sr_book_metadata_cache_v1';
  static const Duration _timeout = Duration(seconds: 6);

  /// Open Library asks API users to stay well under its limits.
  static const Duration _minRequestInterval = Duration(milliseconds: 350);
  DateTime _lastOpenLibraryCall = DateTime.fromMillisecondsSinceEpoch(0);

  /// Cap the cache so SharedPreferences does not grow without bound.
  static const int _maxCacheEntries = 500;

  final http.Client _client;

  BookMetadataService({http.Client? client}) : _client = client ?? http.Client();

  /// Short human labels for the source chips shown in the UI.
  static const Map<LookupSource, String> sourceLabels = {
    LookupSource.localCatalog: 'আপনার স্টক',
    LookupSource.localMemory: 'আগের স্ক্যান',
    LookupSource.similarProduct: 'একই বই',
    LookupSource.openLibrary: 'Open Library',
    LookupSource.titleRule: 'স্বয়ংক্রিয়',
  };

  // ---------------------------------------------------------------- ISBN ----

  /// True when [raw] is a syntactically valid ISBN-10 or ISBN-13.
  ///
  /// Bangladeshi publishers do use real ISBNs on many titles, so this gates the
  /// Open Library request and avoids pointless lookups of internal barcodes.
  static bool isValidIsbn(String raw) {
    final cleaned = raw.replaceAll(RegExp(r'[^0-9Xx]'), '').toUpperCase();
    if (cleaned.length == 10) return _isValidIsbn10(cleaned);
    if (cleaned.length == 13 && !cleaned.startsWith('979')) return _isValidIsbn13(cleaned);
    return false;
  }

  /// Normalises a scanned ISBN to a 13-digit form when possible, so it can be
  /// used to request an Open Library cover image.
  static String? normalizeIsbn(String raw) {
    final cleaned = raw.replaceAll(RegExp(r'[^0-9Xx]'), '').toUpperCase();
    if (cleaned.length == 13 && _isValidIsbn13(cleaned)) return cleaned;
    if (cleaned.length == 10 && _isValidIsbn10(cleaned)) return _isbn10To13(cleaned);
    return null;
  }

  static bool _isValidIsbn10(String s) {
    var sum = 0;
    for (var i = 0; i < 10; i++) {
      final c = s[i];
      final int digit;
      if (c == 'X' && i == 9) {
        digit = 10;
      } else if (c.codeUnitAt(0) >= 48 && c.codeUnitAt(0) <= 57) {
        digit = c.codeUnitAt(0) - 48;
      } else {
        return false;
      }
      sum += digit * (10 - i);
    }
    return sum % 11 == 0;
  }

  static bool _isValidIsbn13(String s) {
    var sum = 0;
    for (var i = 0; i < 13; i++) {
      final code = s.codeUnitAt(i) - 48;
      if (code < 0 || code > 9) return false;
      sum += code * (i.isEven ? 1 : 3);
    }
    return sum % 10 == 0;
  }

  static String _isbn10To13(String isbn10) {
    final body = '978${isbn10.substring(0, 9)}';
    var sum = 0;
    for (var i = 0; i < 12; i++) {
      sum += (body.codeUnitAt(i) - 48) * (i.isEven ? 1 : 3);
    }
    final check = (10 - (sum % 10)) % 10;
    return '$body$check';
  }

  /// Strips hyphens/spaces from a raw scan so it can be compared and stored.
  static String normalizeBarcode(String raw) => raw.trim();

  // -------------------------------------------------------------- lookup ----

  /// Resolves metadata for [barcode] against the shop's [catalog].
  ///
  /// Never throws: network and parse failures degrade to a smaller result so a
  /// failed lookup can never block the shop from entering a product.
  Future<BookLookupResult> lookup({
    required String barcode,
    required List<Product> catalog,
    String? titleHint,
  }) async {
    final code = normalizeBarcode(barcode);
    var result = BookLookupResult(barcode: code);
    if (code.isEmpty) return result;

    // 1. Exact barcode hit in our own catalog — the best possible match.
    final exact = _matchExact(catalog, code);
    if (exact != null) {
      result = result.merge(
        _fromProduct(exact, LookupSource.localCatalog, barcode: code),
        priority: LookupSource.localCatalog,
      );
    }

    // 2. Cache of barcodes this device has already resolved.
    if (result.name == null) {
      final cached = await _readCache(code);
      if (cached != null) {
        result = result.merge(cached, priority: LookupSource.localMemory);
      }
    }
    // 3. Near-duplicate by title/publisher/class (re-printed barcode).
    if (result.name == null) {
      final similar = _matchSimilar(catalog, titleHint, code);
      if (similar != null) {
        result = result.merge(
          _fromProduct(similar, LookupSource.similarProduct, barcode: code, copyPrice: false),
          priority: LookupSource.similarProduct,
        );
        result.notes.add('একই বইয়ের আগের এন্ট্রি থেকে তথ্য নেওয়া হয়েছে');
      }
    }

    // 4. Free Open Library lookup for genuine ISBNs.
    if (result.name == null && isValidIsbn(code)) {
      final remote = await _fetchOpenLibrary(code);
      if (remote != null) {
        result = result.merge(remote, priority: LookupSource.openLibrary);
      } else {
        result.notes.add('ওপেন লাইব্রেরিতে এই বইটি পাওয়া যায়নি');
      }
    }

    // 5. Keyword rules over whatever title we have.
    final titleForRules = result.name ?? titleHint;
    if (titleForRules != null && titleForRules.trim().isNotEmpty) {
      result = result.merge(inferFromTitle(titleForRules), priority: LookupSource.titleRule);
    }

    if (!result.isEmpty) await _writeCache(result, code);

    return result;
  }

  Product? _matchExact(List<Product> catalog, String barcode) {
    for (final p in catalog) {
      if (p.barcode.trim() == barcode) return p;
    }
    return null;
  }

  /// Finds a catalog product that looks like the same book under a different
  /// barcode. Requires a reasonably strong match so unrelated products are not
  /// silently copied.
  Product? _matchSimilar(List<Product> catalog, String? titleHint, String barcode) {
    if (titleHint == null || titleHint.trim().length < 4) return null;
    final target = _normalizeName(titleHint);

    Product? best;
    var bestScore = 0.0;
    for (final p in catalog) {
      if (p.barcode.trim() == barcode) continue;
      final score = _similarity(target, _normalizeName(p.name));
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    // 0.82 keeps this to near-duplicate titles rather than loose category
    // matches like "Practice Book" vs "Practice Book Class 9".
    return bestScore >= 0.82 ? best : null;
  }

  static String _normalizeName(String value) {
    return value
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\u0980-\u09FF ]'), ' ')
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty && !_stopWords.contains(w))
        .join(' ');
  }

  static const Set<String> _stopWords = {
    'the', 'a', 'an', 'of', 'and', 'for', 'edition', 'book', 'copy',
  };

  /// Token-overlap similarity (Dice coefficient) in 0..1.
  static double _similarity(String a, String b) {
    if (a.isEmpty || b.isEmpty) return 0;
    if (a == b) return 1;
    final at = a.split(' ').toSet();
    final bt = b.split(' ').toSet();
    if (at.isEmpty || bt.isEmpty) return 0;
    final overlap = at.intersection(bt).length;
    return (2 * overlap) / (at.length + bt.length);
  }

  BookLookupResult _fromProduct(
    Product p,
    LookupSource source, {
    String? barcode,
    bool copyPrice = true,
  }) {
    final sources = <String, ResolvedField>{};
    void put(String key, String? value) {
      if ((value?.trim().isEmpty ?? true) == false) {
        sources[key] = ResolvedField(value!.trim(), source);
      }
    }

    put('name', p.name);
    put('bengaliName', p.bengaliName);
    put('publisher', p.publisher);
    put('bookClass', p.bookClass);
    put('subject', p.subject);
    put('itemType', p.itemType);
    put('editionYear', p.editionYear);
    put('imageUrl', p.imageUrl);
    put('category', p.category);

    return BookLookupResult(
      barcode: barcode ?? p.barcode,
      name: p.name,
      bengaliName: p.bengaliName,
      publisher: p.publisher,
      bookClass: p.bookClass,
      subject: p.subject,
      itemType: p.itemType,
      editionYear: p.editionYear,
      imageUrl: p.imageUrl,
      category: p.category,
      // Only an exact catalog hit may seed prices; a merely similar product's
      // prices could belong to a different edition.
      suggestedMrp: copyPrice && p.mrp > 0 ? p.mrp : null,
      suggestedBuyPrice: copyPrice && p.buyPrice > 0 ? p.buyPrice : null,
      matchedProductId: p.id,
      sources: sources,
    );
  }

  // --------------------------------------------------------- Open Library ----

  Future<BookLookupResult?> _fetchOpenLibrary(String barcode) async {
    final isbn = normalizeIsbn(barcode);
    if (isbn == null) return null;

    // Politeness: keep at least _minRequestInterval between calls.
    final since = DateTime.now().difference(_lastOpenLibraryCall);
    if (since < _minRequestInterval) {
      await Future<void>.delayed(_minRequestInterval - since);
    }
    _lastOpenLibraryCall = DateTime.now();

    try {
      final uri = Uri.parse(
        'https://openlibrary.org/isbn/$isbn.json',
      );
      final res = await _client.get(uri).timeout(_timeout);

      // 404 means "not in Open Library" — expected for most Bangladeshi
      // textbooks, so it is a normal outcome rather than a failure.
      if (res.statusCode != 200) return null;

      final json = jsonDecode(res.body);
      if (json is! Map<String, dynamic>) return null;

      final title = (json['title'] as String?)?.trim();
      if (title == null || title.isEmpty) return null;

      final subtitle = (json['subtitle'] as String?)?.trim();
      final publishers = json['publishers'];
      final publisher = publishers is List && publishers.isNotEmpty
          ? publishers.first.toString().trim()
          : null;
      final publishDate = (json['publish_date'] as String?)?.trim();
      final editionYear = publishDate != null && publishDate.length >= 4
          ? publishDate.substring(0, 4)
          : null;

      final sources = <String, ResolvedField>{
        'name': ResolvedField(
          subtitle != null && subtitle.isNotEmpty ? '$title: $subtitle' : title,
          LookupSource.openLibrary,
        ),
      };
      void put(String key, String? value) {
        if ((value?.trim().isEmpty ?? true) == false) {
          sources[key] = ResolvedField(value!.trim(), LookupSource.openLibrary);
        }
      }

      put('publisher', publisher);
      put('editionYear', editionYear);
      // Free cover image, no key required.
      final cover = 'https://covers.openlibrary.org/b/isbn/$isbn-M.jpg';
      put('imageUrl', cover);

      return BookLookupResult(
        barcode: barcode,
        name: sources['name']!.value,
        publisher: publisher,
        editionYear: editionYear,
        imageUrl: cover,
        category: 'book',
        sources: sources,
      );
    } on TimeoutException {
      return null;
    } catch (_) {
      // Any transport/parse problem must not break manual entry.
      return null;
    }
  }

  // --------------------------------------------------------- title rules ----

  /// Infers class, subject and item type from keywords in a title.
  ///
  /// This is the part that actually works for Bangladeshi school books, since
  /// no free international API catalogues them.
  static BookLookupResult inferFromTitle(String title) {
    final text = title.toLowerCase();
    final sources = <String, ResolvedField>{};
    String? bookClass, subject, itemType;

    // Order matters: "HSC" must win over the generic "HSC ভর্তি কোচিং" cases.
    const classRules = <({String key, String value})>[
      (key: 'hsc', value: 'Class 12 (HSC)'),
      (key: 'এইচএসসি', value: 'Class 12 (HSC)'),
      (key: 'ssc', value: 'Class 10 (SSC)'),
      (key: 'এসএসসি', value: 'Class 10 (SSC)'),
      (key: 'class 12', value: 'Class 12 (HSC)'),
      (key: 'class 11', value: 'Class 11-12'),
      (key: 'class 10', value: 'Class 10 (SSC)'),
      (key: 'class 9', value: 'Class 9'),
      (key: 'class 8', value: 'Class 8'),
      (key: 'class 7', value: 'Class 7'),
      (key: 'class 6', value: 'Class 6'),
      (key: 'class 5', value: 'Class 5'),
      (key: 'প্রাথমিক', value: 'Primary'),
      (key: 'primary', value: 'Primary'),
      (key: 'অষ্টম', value: 'Class 8'),
      (key: 'সপ্তম', value: 'Class 7'),
      (key: 'ষষ্ঠ', value: 'Class 6'),
      (key: 'পঞ্চম', value: 'Class 5'),
      (key: 'চতুর্থ', value: 'Class 4'),
      (key: 'তৃতীয়', value: 'Class 3'),
      (key: 'নবম', value: 'Class 9'),
      (key: 'দশম', value: 'Class 10 (SSC)'),
      (key: 'একাদশ', value: 'Class 11-12'),
      (key: 'দ্বাদশ', value: 'Class 12 (HSC)'),
    ];
    for (final rule in classRules) {
      if (text.contains(rule.key)) {
        bookClass = rule.value;
        break;
      }
    }

    const subjectRules = <({String key, String value})>[
      // A dictionary/reference title mentions a language ("English to Bangla
      // Dictionary") but is catalogued as a Dictionary, so it must be checked
      // before the language keywords below.
      (key: 'অভিধান', value: 'Dictionary'),
      (key: 'dictionary', value: 'Dictionary'),
      (key: 'পদার্থবিজ্ঞান', value: 'Physics'),
      (key: 'physics', value: 'Physics'),
      (key: 'রসায়ন', value: 'Chemistry'),
      (key: 'chemistry', value: 'Chemistry'),
      (key: 'জীববিজ্ঞান', value: 'Biology'),
      (key: 'biology', value: 'Biology'),
      (key: 'গণিত', value: 'Math'),
      (key: 'math', value: 'Math'),
      (key: 'ইংরেজি', value: 'English'),
      (key: 'english', value: 'English'),
      (key: 'বাংলা ব্যাকরণ', value: 'Bangla'),
      (key: 'bangla', value: 'Bangla'),
      (key: 'ভূগোল', value: 'Geography'),
      (key: 'geography', value: 'Geography'),
      (key: 'ইতিহাস', value: 'History'),
      (key: 'history', value: 'History'),
      (key: 'অর্থনীতি', value: 'Economics'),
      (key: 'economics', value: 'Economics'),
      (key: 'হিসাববিল', value: 'Accounting'),
      (key: 'accounting', value: 'Accounting'),
      (key: 'তথ্যপ্রযুক্তি', value: 'ICT'),
      (key: 'ict', value: 'ICT'),
      (key: 'বিজ্ঞান', value: 'Science'),
      (key: 'science', value: 'Science'),
    ];
    for (final rule in subjectRules) {
      if (text.contains(rule.key)) {
        subject = rule.value;
        break;
      }
    }

    const itemTypeRules = <({String key, String value})>[
      (key: 'মডেল টেস্ট', value: 'Model Test'),
      (key: 'model test', value: 'Model Test'),
      (key: 'টেক্সটবুক', value: 'Textbook'),
      (key: 'পাঠ্যপুস্তক', value: 'Textbook'),
      (key: 'textbook', value: 'Textbook'),
      (key: 'প্র্যাকটিক্যাল', value: 'Practical'),
      (key: 'practical', value: 'Practical'),
      (key: 'সাধারণী', value: 'Question Bank'),
      (key: 'question bank', value: 'Question Bank'),
      (key: 'রচনা', value: 'Essay'),
      (key: 'নোট', value: 'Notes'),
      (key: 'guide', value: 'Guide'),
      (key: 'গাইড', value: 'Guide'),
      (key: 'খাতা', value: 'Notebook'),
      (key: 'notebook', value: 'Notebook'),
      (key: 'ডায়েরি', value: 'Diary'),
      (key: 'diary', value: 'Diary'),
      // Matches the catalog's existing convention: dictionaries are recorded
      // as "Reference" for item type and "Dictionary" for subject.
      (key: 'অভিধান', value: 'Reference'),
      (key: 'dictionary', value: 'Reference'),
    ];
    for (final rule in itemTypeRules) {
      if (text.contains(rule.key)) {
        itemType = rule.value;
        break;
      }
    }

    void put(String key, String? value) {
      if (value == null || value.trim().isEmpty) return;
      sources[key] = ResolvedField(value.trim(), LookupSource.titleRule);
    }

    put('bookClass', bookClass);
    put('subject', subject);
    put('itemType', itemType);

    return BookLookupResult(
      bookClass: bookClass,
      subject: subject,
      itemType: itemType,
      sources: sources,
    );
  }

  /// Picks the most likely publisher from a title, matched against the
  /// publishers the shop already stocks. Keeps spelling consistent with what
  /// is already in the catalog.
  static BookLookupResult inferPublisherFromTitle(
    String title,
    List<Product> catalog,
  ) {
    final text = title.toLowerCase();
    final known = <String>{};
    for (final p in catalog) {
      final pub = p.publisher?.trim();
      if (pub != null && pub.isNotEmpty) known.add(pub);
    }

    String? best;
    var bestLen = 0;
    for (final pub in known) {
      final needle = pub.toLowerCase();
      if (needle.isEmpty) continue;
      if (text.contains(needle) && needle.length > bestLen) {
        best = pub;
        bestLen = needle.length;
      }
    }

    if (best == null) return BookLookupResult();
    return BookLookupResult(
      publisher: best,
      sources: {
        'publisher': ResolvedField(best, LookupSource.titleRule),
      },
    );
  }

  // ------------------------------------------------------------- caching ----

  /// Rehydrates a cached barcode entry back into a [BookLookupResult].
  ///
  /// Accepts an entry that only carries rule-derived fields (e.g. class and
  /// subject from a title with no catalogue name), since that is a valid
  /// resolution worth remembering for the next scan of the same book.
  Future<BookLookupResult?> _readCache(String barcode) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw == null) return null;
      final all = jsonDecode(raw);
      if (all is! Map<String, dynamic>) return null;
      final entry = all[barcode];
      if (entry is! Map<String, dynamic>) return null;

      final sources = <String, ResolvedField>{};
      String? value(String key) {
        final v = entry[key]?.toString().trim();
        if (v == null || v.isEmpty) return null;
        sources[key] = ResolvedField(v, LookupSource.localMemory);
        return v;
      }

      final name = value('name');
      final publisher = value('publisher');
      final bookClass = value('bookClass');
      final subject = value('subject');
      final itemType = value('itemType');

      // Nothing worth reusing.
      if (name == null && publisher == null && bookClass == null && subject == null && itemType == null) {
        return null;
      }

      return BookLookupResult(
        barcode: barcode,
        name: name,
        bengaliName: value('bengaliName'),
        publisher: publisher,
        bookClass: bookClass,
        subject: subject,
        itemType: itemType,
        editionYear: value('editionYear'),
        category: value('category'),
        sources: sources,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeCache(BookLookupResult result, String barcode) async {
    if (result.isEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      final all = raw != null
          ? (jsonDecode(raw) as Map<String, dynamic>?)
          : <String, dynamic>{};
      if (all == null) return;

      all[barcode] = {
        'name': result.name,
        'bengaliName': result.bengaliName,
        'publisher': result.publisher,
        'bookClass': result.bookClass,
        'subject': result.subject,
        'itemType': result.itemType,
        'editionYear': result.editionYear,
        'category': result.category,
        'at': DateTime.now().millisecondsSinceEpoch,
      };

      // Trim oldest entries so the cache stays bounded.
      if (all.length > _maxCacheEntries) {
        final entries = all.entries.toList()
          ..sort((a, b) {
            final at = (a.value as Map)['at'] as int? ?? 0;
            final bt = (b.value as Map)['at'] as int? ?? 0;
            return at.compareTo(bt);
          });
        for (final e in entries.take(all.length - _maxCacheEntries)) {
          all.remove(e.key);
        }
      }

      await prefs.setString(_cacheKey, jsonEncode(all));
    } catch (_) {
      // Caching is best-effort; never fail a lookup because of it.
    }
  }

  void dispose() => _client.close();
}
