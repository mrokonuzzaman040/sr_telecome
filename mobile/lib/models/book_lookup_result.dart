/// Where a piece of auto-filled metadata came from.
///
/// Ordered roughly from most to least trustworthy so the UI can rank results
/// and the shop owner knows how much to trust a field.
enum LookupSource {
  /// Exact barcode hit against the shop's own product catalog. The most
  /// reliable source: this data was entered by the shop itself.
  localCatalog,

  /// A remembered barcode seen on this device. Populated from a previous scan
  /// that the user accepted, so it reflects real shop data.
  localMemory,

  /// A near-duplicate already in the catalog, matched on name/publisher/class
  /// rather than barcode. Useful when a book is re-printed with a new barcode.
  similarProduct,

  /// Open Library, a free open bibliographic API that needs no API key.
  /// Covers international and English-language titles well, but has almost no
  /// coverage of Bangladeshi school textbooks.
  openLibrary,

  /// Derived from a keyword rule applied to the title (e.g. "পদার্থবিজ্ঞান"
  /// implies subject = Physics, "HSC" implies Class 12).
  titleRule,
}

/// A single auto-filled field, keeping its value and provenance together.
class ResolvedField {
  final String value;
  final LookupSource source;

  const ResolvedField(this.value, this.source);

  bool get isNotEmpty => value.trim().isNotEmpty;
}

/// Result of looking up a scanned barcode (and optionally the typed title).
///
/// Fields are stored separately rather than as a flat [Product] so the form can
/// show *why* each value appeared and only overwrite fields the user has not
/// already typed.
class BookLookupResult {
  final String? barcode;

  final String? name;
  final String? bengaliName;
  final String? publisher;
  final String? bookClass;
  final String? subject;
  final String? itemType;
  final String? editionYear;
  final String? imageUrl;
  final String? category;

  /// Prices are never auto-filled from a public API — a foreign list price is
  /// wrong for a local shop. They are only ever offered as an editable
  /// suggestion when an identical product already exists in the catalog.
  final double? suggestedMrp;
  final double? suggestedBuyPrice;

  /// The catalog product this result was derived from, if any.
  final String? matchedProductId;

  final Map<String, ResolvedField> sources;

  /// Human-readable hints about the lookup, e.g. why a source was skipped.
  /// Always a growable list so callers can annotate a result in place.
  final List<String> notes;

  BookLookupResult({
    this.barcode,
    this.name,
    this.bengaliName,
    this.publisher,
    this.bookClass,
    this.subject,
    this.itemType,
    this.editionYear,
    this.imageUrl,
    this.category,
    this.suggestedMrp,
    this.suggestedBuyPrice,
    this.matchedProductId,
    Map<String, ResolvedField>? sources,
    List<String>? notes,
  })  : sources = sources ?? <String, ResolvedField>{},
        notes = notes ?? <String>[];

  /// True when nothing usable was found, so the form should just stay manual.
  bool get isEmpty =>
      (name?.trim().isEmpty ?? true) &&
      (publisher?.trim().isEmpty ?? true) &&
      (bookClass?.trim().isEmpty ?? true) &&
      (subject?.trim().isEmpty ?? true) &&
      (itemType?.trim().isEmpty ?? true);

  /// Human-readable count of fields resolved, used for the summary chip.
  int get filledFieldCount {
    var n = 0;
    for (final v in [
      name,
      bengaliName,
      publisher,
      bookClass,
      subject,
      itemType,
      editionYear,
      imageUrl,
      category,
    ]) {
      if ((v?.trim().isEmpty ?? true) == false) n++;
    }
    return n;
  }

  LookupSource? sourceOf(String field) => sources[field]?.source;

  /// Returns a new result with non-empty values from [other] layered on top of
  /// this one. [priority] decides who wins when both sides have a value.
  BookLookupResult merge(BookLookupResult other, {LookupSource? priority}) {
    ResolvedField? pick(String key, String? mine, String? theirs) {
      final mineOk = (mine?.trim().isEmpty ?? true) == false;
      final theirsOk = (theirs?.trim().isEmpty ?? true) == false;
      if (mineOk && theirsOk) {
        // Both sides know the value; keep the more trustworthy source.
        final myPriority = priority ?? sourceOf(key) ?? LookupSource.titleRule;
        final theirPriority = other.sourceOf(key) ?? LookupSource.titleRule;
        if (theirPriority.index <= myPriority.index) {
          return ResolvedField(theirs!.trim(), theirPriority);
        }
        return ResolvedField(mine!.trim(), myPriority);
      }
      if (mineOk) return ResolvedField(mine!.trim(), sourceOf(key) ?? LookupSource.titleRule);
      if (theirsOk) {
        return ResolvedField(theirs!.trim(), other.sourceOf(key) ?? LookupSource.titleRule);
      }
      return null;
    }

    final merged = <String, ResolvedField>{};
    void add(String key, ResolvedField? field) {
      if (field != null) merged[key] = field;
    }

    add('name', pick('name', name, other.name));
    add('bengaliName', pick('bengaliName', bengaliName, other.bengaliName));
    add('publisher', pick('publisher', publisher, other.publisher));
    add('bookClass', pick('bookClass', bookClass, other.bookClass));
    add('subject', pick('subject', subject, other.subject));
    add('itemType', pick('itemType', itemType, other.itemType));
    add('editionYear', pick('editionYear', editionYear, other.editionYear));
    add('imageUrl', pick('imageUrl', imageUrl, other.imageUrl));
    add('category', pick('category', category, other.category));

    return BookLookupResult(
      barcode: barcode ?? other.barcode,
      name: merged['name']?.value,
      bengaliName: merged['bengaliName']?.value,
      publisher: merged['publisher']?.value,
      bookClass: merged['bookClass']?.value,
      subject: merged['subject']?.value,
      itemType: merged['itemType']?.value,
      editionYear: merged['editionYear']?.value,
      imageUrl: merged['imageUrl']?.value,
      category: merged['category']?.value,
      suggestedMrp: other.suggestedMrp ?? suggestedMrp,
      suggestedBuyPrice: other.suggestedBuyPrice ?? suggestedBuyPrice,
      matchedProductId: other.matchedProductId ?? matchedProductId,
      sources: merged,
      notes: [...notes, ...other.notes],
    );
  }
}
