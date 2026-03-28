import 'dart:io';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;
import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  group('LpcRenderer', () {
    test('composites selected LPC layers and resolves credits', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'lpc_renderer_test',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final Directory definitionsDir = Directory(
        path.join(sandbox.path, 'lpc', 'sheet_definitions', 'body'),
      );
      final Directory spritesheetsDir = Directory(
        path.join(
          sandbox.path,
          'lpc',
          'spritesheets',
          'body',
          'bodies',
          'male',
          'idle',
        ),
      );
      await definitionsDir.create(recursive: true);
      await spritesheetsDir.create(recursive: true);

      await File(path.join(definitionsDir.path, 'body.json')).writeAsString('''
{
  "name": "Body Color",
  "type_name": "body",
  "variants": ["light"],
  "animations": ["idle"],
  "match_body_color": false,
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

      final img.Image image = img.Image(width: 16, height: 16);
      img.fill(image, color: img.ColorRgb8(255, 0, 0));
      await File(
        path.join(spritesheetsDir.path, 'light.png'),
      ).writeAsBytes(img.encodePng(image));

      final LpcCatalog catalog = await const LpcCatalogLoader().load(
        Directory(path.join(sandbox.path, 'lpc', 'sheet_definitions')),
      );
      final LpcRenderer renderer = LpcRenderer(
        catalog: catalog,
        spritesheetsDirectory: Directory(
          path.join(sandbox.path, 'lpc', 'spritesheets'),
        ),
      );

      final LpcRenderResult result = await renderer.render(
        const LpcRenderRequest(
          bodyType: 'male',
          animation: 'idle',
          selections: <String, String>{'body': 'light'},
        ),
      );

      expect(result.width, 16);
      expect(result.height, 16);
      expect(result.usedLayers, hasLength(1));
      expect(result.credits.single.authors, contains('Artist'));
      final Map<String, Object> metadata = result.toMetadataJson(
        request: const LpcRenderRequest(
          bodyType: 'male',
          animation: 'idle',
          selections: <String, String>{'body': 'light'},
        ),
        imageName: 'test.png',
      );
      expect(metadata['schema'], <String, Object>{
        'name': 'spritecraft.render',
        'version': 1,
      });
      expect(
        (metadata['layout'] as Map<String, Object>)['mode'],
        'layered-fullsheet',
      );
      expect(
        (metadata['content'] as Map<String, Object?>)['animation'],
        'idle',
      );
    });
  });
}
