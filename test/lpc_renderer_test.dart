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
      final img.Image decoded = img.decodePng(
        Uint8List.fromList(result.pngBytes),
      )!;
      final img.Pixel pixel = decoded.getPixel(0, 0);

      expect(pixel.g, greaterThan(pixel.r));
      expect(pixel.a, 255);
      expect(
        (result.toMetadataJson(
              request: request,
              imageName: 'recolor.png',
            )['content']
            as Map<String, Object?>)['recolorGroups'],
        <String, String>{'body': '#00ff00'},
      );
      expect(
        (result.toMetadataJson(
              request: request,
              imageName: 'recolor.png',
            )['layout']
            as Map<String, Object>)['frameCount'],
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
      final img.Image decoded = img.decodePng(
        Uint8List.fromList(result.pngBytes),
      )!;
      final img.Pixel pixel = decoded.getPixel(0, 0);

      expect(result.usedLayers, hasLength(2));
      expect(result.usedLayers.last.typeName, 'external-overlay');
      expect(result.usedLayers.last.itemName, 'Custom Mark');
      expect(pixel.b, greaterThan(pixel.r));
      expect(
        (result.toMetadataJson(
              request: request,
              imageName: 'external.png',
            )['content']
            as Map<String, Object?>)['externalLayers'],
        hasLength(1),
      );
    });

    test(
      'renders a representative multi-layer LPC combination deterministically',
      () async {
        final Directory sandbox = await Directory.systemTemp.createTemp(
          'lpc_renderer_regression_combo_test',
        );
        addTearDown(() => sandbox.delete(recursive: true));

        final Directory definitionsDir = Directory(
          path.join(sandbox.path, 'lpc', 'sheet_definitions'),
        );
        final Directory spritesheetsDir = Directory(
          path.join(sandbox.path, 'lpc', 'spritesheets'),
        );
        await definitionsDir.create(recursive: true);
        await spritesheetsDir.create(recursive: true);

        await Directory(
          path.join(definitionsDir.path, 'body'),
        ).create(recursive: true);
        await Directory(
          path.join(definitionsDir.path, 'torso'),
        ).create(recursive: true);
        await Directory(
          path.join(definitionsDir.path, 'weapons'),
        ).create(recursive: true);

        await File(
          path.join(definitionsDir.path, 'body', 'body.json'),
        ).writeAsString('''
{
  "name": "Body Color",
  "type_name": "body",
  "variants": ["light", "tan"],
  "animations": ["walk"],
  "match_body_color": false,
  "layer_1": {
    "zPos": 10,
    "male": "body/bodies/male/"
  },
  "credits": [
    {
      "file": "body/bodies/male",
      "notes": "Base body",
      "authors": ["Body Artist"],
      "licenses": ["CC-BY"],
      "urls": ["https://example.com/body"]
    }
  ]
}
''');

        await File(
          path.join(definitionsDir.path, 'torso', 'leather.json'),
        ).writeAsString('''
{
  "name": "Leather Tunic",
  "type_name": "torso",
  "variants": ["default"],
  "animations": ["walk"],
  "match_body_color": true,
  "tags": ["cloth", "torso"],
  "layer_1": {
    "zPos": 40,
    "male": "torso/leather/male/"
  },
  "credits": [
    {
      "file": "torso/leather/male",
      "notes": "Tunic layer",
      "authors": ["Torso Artist"],
      "licenses": ["CC-BY-SA"],
      "urls": ["https://example.com/torso"]
    }
  ]
}
''');

        await File(
          path.join(definitionsDir.path, 'weapons', 'sword.json'),
        ).writeAsString('''
{
  "name": "Iron Sword",
  "type_name": "weapon",
  "variants": ["steel"],
  "animations": ["walk"],
  "match_body_color": false,
  "tags": ["weapon", "metal"],
  "layer_1": {
    "zPos": 90,
    "male": "weapons/sword/male/"
  },
  "credits": [
    {
      "file": "weapons/sword/male",
      "notes": "Weapon layer",
      "authors": ["Weapon Artist"],
      "licenses": ["OGA-BY"],
      "urls": ["https://example.com/sword"]
    }
  ]
}
''');

        Future<void> writeLayerPng(String relativePath, img.Color color) async {
          final Directory parent = Directory(
            path.join(spritesheetsDir.path, path.dirname(relativePath)),
          );
          await parent.create(recursive: true);
          final img.Image image = img.Image(width: 8, height: 8);
          img.fill(image, color: img.ColorRgba8(0, 0, 0, 0));
          img.fillRect(image, x1: 0, y1: 0, x2: 7, y2: 7, color: color);
          await File(
            path.join(spritesheetsDir.path, relativePath),
          ).writeAsBytes(img.encodePng(image));
        }

        await writeLayerPng(
          path.join('body', 'bodies', 'male', 'walk', 'tan.png'),
          img.ColorRgb8(180, 120, 80),
        );
        await writeLayerPng(
          path.join('torso', 'leather', 'male', 'walk', 'tan.png'),
          img.ColorRgb8(20, 160, 40),
        );
        await writeLayerPng(
          path.join('weapons', 'sword', 'male', 'walk', 'steel.png'),
          img.ColorRgb8(40, 80, 220),
        );

        final LpcCatalog catalog = await const LpcCatalogLoader().load(
          definitionsDir,
        );
        final LpcRenderer renderer = LpcRenderer(
          catalog: catalog,
          spritesheetsDirectory: spritesheetsDir,
        );

        const LpcRenderRequest request = LpcRenderRequest(
          bodyType: 'male',
          animation: 'walk',
          selections: <String, String>{
            'body': 'tan',
            'leather': 'default',
            'sword': 'steel',
          },
        );

        final LpcRenderResult first = await renderer.render(request);
        final LpcRenderResult second = await renderer.render(request);
        final img.Image decoded = img.decodePng(
          Uint8List.fromList(first.pngBytes),
        )!;
        final img.Pixel pixel = decoded.getPixel(0, 0);

        expect(first.width, 8);
        expect(first.height, 8);
        expect(
          first.usedLayers.map((UsedLpcLayer layer) => layer.itemId),
          <String>['body', 'leather', 'sword'],
        );
        expect(
          first.usedLayers.map((UsedLpcLayer layer) => layer.variant),
          <String>['tan', 'tan', 'steel'],
        );
        expect(
          first.credits.map((LpcCreditRecord credit) => credit.authors.single),
          containsAll(<String>['Body Artist', 'Torso Artist', 'Weapon Artist']),
        );
        expect(pixel.b, greaterThan(pixel.g));
        expect(first.pngBytes, second.pngBytes);

        final Map<String, Object> metadata = first.toMetadataJson(
          request: request,
          imageName: 'combo.png',
        );
        expect((metadata['layers'] as List<Object?>), hasLength(3));
        expect((metadata['credits'] as List<Object?>), hasLength(3));
        expect(
          (metadata['content'] as Map<String, Object?>)['animation'],
          'walk',
        );
      },
    );

    test('reuses decoded LPC assets across repeated renders', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'lpc_renderer_cache_test',
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

      final File assetFile = File(path.join(spritesheetsDir.path, 'light.png'));
      final img.Image image = img.Image(width: 4, height: 4);
      img.fill(image, color: img.ColorRgb8(255, 0, 0));
      await assetFile.writeAsBytes(img.encodePng(image));

      final LpcCatalog catalog = await const LpcCatalogLoader().load(
        Directory(path.join(sandbox.path, 'lpc', 'sheet_definitions')),
      );
      final LpcRenderer renderer = LpcRenderer(
        catalog: catalog,
        spritesheetsDirectory: Directory(
          path.join(sandbox.path, 'lpc', 'spritesheets'),
        ),
      );

      const LpcRenderRequest request = LpcRenderRequest(
        bodyType: 'male',
        animation: 'idle',
        selections: <String, String>{'body': 'light'},
      );

      final LpcRenderResult firstResult = await renderer.render(request);
      expect(firstResult.usedLayers, hasLength(1));

      await assetFile.delete();

      final LpcRenderResult secondResult = await renderer.render(request);
      expect(secondResult.usedLayers, hasLength(1));
      expect(secondResult.width, firstResult.width);
      expect(secondResult.height, firstResult.height);
    });

    test(
      'reports actionable hints when selected LPC assets are missing',
      () async {
        final Directory sandbox = await Directory.systemTemp.createTemp(
          'lpc_renderer_missing_asset_test',
        );
        addTearDown(() => sandbox.delete(recursive: true));

        final Directory definitionsDir = Directory(
          path.join(sandbox.path, 'lpc', 'sheet_definitions', 'body'),
        );
        final Directory spritesheetsDir = Directory(
          path.join(sandbox.path, 'lpc', 'spritesheets'),
        );
        await definitionsDir.create(recursive: true);
        await spritesheetsDir.create(recursive: true);

        await File(path.join(definitionsDir.path, 'body.json')).writeAsString(
          '''
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
''',
        );

        final LpcCatalog catalog = await const LpcCatalogLoader().load(
          Directory(path.join(sandbox.path, 'lpc', 'sheet_definitions')),
        );
        final LpcRenderer renderer = LpcRenderer(
          catalog: catalog,
          spritesheetsDirectory: spritesheetsDir,
        );

        expect(
          () => renderer.render(
            const LpcRenderRequest(
              bodyType: 'male',
              animation: 'idle',
              selections: <String, String>{'body': 'light'},
            ),
          ),
          throwsA(
            isA<StateError>().having(
              (StateError error) => error.message,
              'message',
              allOf(
                contains('No renderable layers were found'),
                contains('Missing asset hints:'),
                contains('body:layer_1'),
                contains('body/bodies/male/idle/light.png'),
              ),
            ),
          ),
        );
      },
    );

    test(
      'reuses decoded LPC assets from disk cache across renderer instances',
      () async {
        final Directory sandbox = await Directory.systemTemp.createTemp(
          'lpc_renderer_disk_cache_test',
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
        final Directory cacheDir = Directory(path.join(sandbox.path, 'cache'));
        await definitionsDir.create(recursive: true);
        await spritesheetsDir.create(recursive: true);

        await File(path.join(definitionsDir.path, 'body.json')).writeAsString(
          '''
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
''',
        );

        final File assetFile = File(
          path.join(spritesheetsDir.path, 'light.png'),
        );
        final img.Image image = img.Image(width: 4, height: 4);
        img.fill(image, color: img.ColorRgb8(255, 0, 0));
        await assetFile.writeAsBytes(img.encodePng(image));

        final LpcCatalog catalog = await const LpcCatalogLoader().load(
          Directory(path.join(sandbox.path, 'lpc', 'sheet_definitions')),
        );

        const LpcRenderRequest request = LpcRenderRequest(
          bodyType: 'male',
          animation: 'idle',
          selections: <String, String>{'body': 'light'},
        );

        final LpcRenderer firstRenderer = LpcRenderer(
          catalog: catalog,
          spritesheetsDirectory: Directory(
            path.join(sandbox.path, 'lpc', 'spritesheets'),
          ),
          decodedAssetCacheDirectory: cacheDir,
        );
        final LpcRenderResult firstResult = await firstRenderer.render(request);
        expect(firstResult.usedLayers, hasLength(1));

        await assetFile.delete();

        final LpcRenderer secondRenderer = LpcRenderer(
          catalog: catalog,
          spritesheetsDirectory: Directory(
            path.join(sandbox.path, 'lpc', 'spritesheets'),
          ),
          decodedAssetCacheDirectory: cacheDir,
        );
        final LpcRenderResult secondResult = await secondRenderer.render(
          request,
        );
        expect(secondResult.usedLayers, hasLength(1));
        expect(secondResult.width, firstResult.width);
        expect(secondResult.height, firstResult.height);
        expect(
          cacheDir
              .listSync()
              .whereType<File>()
              .map((File file) => path.extension(file.path))
              .toSet(),
          containsAll(<String>{'.json', '.rgba'}),
        );
      },
    );
  });
}
