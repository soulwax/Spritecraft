// File: test/lpc_catalog_test.dart

import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  group('LpcCatalogLoader', () {
    test('loads layer-backed definitions and searches them', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'lpc_catalog_test',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final Directory definitions = Directory(
        path.join(sandbox.path, 'sheet_definitions', 'body'),
      );
      await definitions.create(recursive: true);

      final File definition = File(path.join(definitions.path, 'body.json'));
      await definition.writeAsString('''
{
  "name": "Body Color",
  "type_name": "body",
  "priority": 10,
  "variants": ["light", "amber"],
  "animations": ["idle", "walk"],
  "layer_1": {
    "zPos": 10,
    "male": "body/bodies/male/"
  },
  "credits": [
    {
      "file": "body/bodies/male",
      "notes": "",
      "authors": ["Artist"],
      "licenses": ["CC-BY"],
      "urls": ["https://example.com"]
    }
  ]
}
''');

      final LpcCatalog catalog = await const LpcCatalogLoader().load(
        Directory(path.join(sandbox.path, 'sheet_definitions')),
      );

      expect(catalog.itemsById, contains('body'));
      expect(catalog.bodyTypes, contains('male'));
      expect(catalog.search(query: 'body', bodyType: 'male'), hasLength(1));
    });
  });
}
