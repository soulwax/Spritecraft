// File: test/lpc_renderer_test.dart

import 'dart:io';
import 'dart:typed_data';

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
        'version': kSpriteCraftRenderSchemaVersion,
      });
      expect(
        (metadata['content'] as Map<String, Object?>)['projectSchemaVersion'],
        kSpriteCraftProjectSchemaVersion,
      );
      expect(
        (metadata['layout'] as Map<String, Object>)['mode'],
        'layered-fullsheet',
      );
      expect((metadata['layout'] as Map<String, Object>)['frameCount'], 4);
      expect((metadata['layout'] as Map<String, Object>)['tileWidth'], 4);
      expect(
        (metadata['content'] as Map<String, Object?>)['animation'],
        'idle',
      );
      expect(
        (metadata['content'] as Map<String, Object?>)['recolorGroups'],
        <String, String>{},
      );
    });

    test('applies controlled recolor groups to rendered layers', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'lpc_renderer_recolor_test',
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
  "credits": []
}
''');

      final img.Image image = img.Image(width: 4, height: 4);
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

      final LpcRenderRequest request = const LpcRenderRequest(
        bodyType: 'male',
        animation: 'idle',
        selections: <String, String>{'body': 'light'},
        recolorGroups: <String, String>{'body': '#00ff00'},
      );
      final LpcRenderResult result = await renderer.render(request);
      final img.Image decoded =
          img.decodePng(Uint8List.fromList(result.pngBytes))!;
      final img.Pixel pixel = decoded.getPixel(0, 0);

      expect(pixel.g, greaterThan(pixel.r));
      expect(pixel.a, 255);
      expect(
        (result.toMetadataJson(
          request: request,
          imageName: 'recolor.png',
        )['content'] as Map<String, Object?>)['recolorGroups'],
        <String, String>{'body': '#00ff00'},
      );
      expect(
        (result.toMetadataJson(
          request: request,
          imageName: 'recolor.png',
        )['layout'] as Map<String, Object>)['frameCount'],
        4,
      );
    });

    test('renders custom external overlay layers above LPC assets', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'lpc_renderer_external_test',
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
  "credits": []
}
''');

      final img.Image baseImage = img.Image(width: 8, height: 8);
      img.fill(baseImage, color: img.ColorRgb8(255, 0, 0));
      await File(
        path.join(spritesheetsDir.path, 'light.png'),
      ).writeAsBytes(img.encodePng(baseImage));

      final File externalFile = File(path.join(sandbox.path, 'overlay.png'));
      final img.Image overlayImage = img.Image(width: 8, height: 8);
      img.fill(overlayImage, color: img.ColorRgba8(0, 0, 0, 0));
      overlayImage.setPixelRgba(0, 0, 0, 0, 255, 255);
      await externalFile.writeAsBytes(img.encodePng(overlayImage));

      final LpcCatalog catalog = await const LpcCatalogLoader().load(
        Directory(path.join(sandbox.path, 'lpc', 'sheet_definitions')),
      );
      final LpcRenderer renderer = LpcRenderer(
        catalog: catalog,
        spritesheetsDirectory: Directory(
          path.join(sandbox.path, 'lpc', 'spritesheets'),
        ),
      );

      final LpcRenderRequest request = LpcRenderRequest(
        bodyType: 'male',
        animation: 'idle',
        selections: const <String, String>{'body': 'light'},
        externalLayers: <ExternalRenderLayer>[
          ExternalRenderLayer(
            path: externalFile.path,
            name: 'Custom Mark',
            zPos: 999,
          ),
        ],
      );

      final LpcRenderResult result = await renderer.render(request);
      final img.Image decoded =
          img.decodePng(Uint8List.fromList(result.pngBytes))!;
      final img.Pixel pixel = decoded.getPixel(0, 0);

      expect(result.usedLayers, hasLength(2));
      expect(result.usedLayers.last.typeName, 'external-overlay');
      expect(result.usedLayers.last.itemName, 'Custom Mark');
      expect(pixel.b, greaterThan(pixel.r));
      expect(
        (result.toMetadataJson(
          request: request,
          imageName: 'external.png',
        )['content'] as Map<String, Object?>)['externalLayers'],
        hasLength(1),
      );
    });
  });
}
