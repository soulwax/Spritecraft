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

    test(
      'skips malformed and unusable definitions while preserving valid ones',
      () async {
        final Directory sandbox = await Directory.systemTemp.createTemp(
          'lpc_catalog_malformed_test',
        );
        addTearDown(() => sandbox.delete(recursive: true));

        final Directory definitions = Directory(
          path.join(sandbox.path, 'sheet_definitions'),
        );
        await Directory(
          path.join(definitions.path, 'body'),
        ).create(recursive: true);
        await Directory(
          path.join(definitions.path, 'broken'),
        ).create(recursive: true);

        await File(
          path.join(definitions.path, 'body', 'body.json'),
        ).writeAsString('''
{
  "name": "Body Color",
  "type_name": "body",
  "variants": ["light"],
  "animations": ["idle"],
  "layer_1": {
    "zPos": 10,
    "male": "body/bodies/male/"
  },
  "credits": []
}
''');
        await File(
          path.join(definitions.path, 'broken', 'bad-json.json'),
        ).writeAsString('{ definitely-not-json');
        await File(
          path.join(definitions.path, 'broken', 'missing-keys.json'),
        ).writeAsString('''
{
  "name": "Broken Definition"
}
''');
        await File(
          path.join(definitions.path, 'broken', 'bad-layer.json'),
        ).writeAsString('''
{
  "name": "Bad Layer",
  "type_name": "broken",
  "layer_1": "not-an-object"
}
''');

        final LpcCatalog catalog = await const LpcCatalogLoader().load(
          definitions,
        );

        expect(catalog.itemsById.keys, contains('body'));
        expect(catalog.itemsById.keys, isNot(contains('bad-json')));
        expect(catalog.loadWarnings, isNotEmpty);
        expect(
          catalog.loadWarnings.join('\n'),
          allOf(
            contains('bad-json.json'),
            contains('missing-keys.json'),
            contains('bad-layer.json'),
          ),
        );
      },
    );
  });
}
