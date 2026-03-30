// File: test/metadata_snapshot_test.dart

import 'dart:convert';

import 'package:spritecraft/src/models/lpc_models.dart';
import 'package:spritecraft/src/models/spritesheet_build_result.dart';
import 'package:test/test.dart';

void main() {
  group('metadata snapshots', () {
    test('spritesheet metadata shape stays stable', () {
      final SpritesheetBuildResult result = SpritesheetBuildResult(
        sheetWidth: 64,
        sheetHeight: 32,
        tileWidth: 16,
        tileHeight: 16,
        columns: 4,
        rows: 2,
        imagePath: 'build/sheet.png',
        metadataPath: 'build/sheet.json',
        layoutMode: 'uniform-grid',
        animations: const <SpritesheetAnimationSequence>[],
        frames: const <SpriteFramePlacement>[
          SpriteFramePlacement(
            name: 'idle_0',
            sourcePath: 'frames/idle_0.png',
            index: 0,
            column: 0,
            row: 0,
            tileX: 0,
            tileY: 0,
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            tileWidth: 16,
            tileHeight: 16,
            offsetX: 0,
            offsetY: 0,
            sourceWidth: 16,
            sourceHeight: 16,
            durationMs: 100,
            pivotX: 0,
            pivotY: 0,
            tags: <String>[],
          ),
        ],
      );

      const String expected =
          '{\n'
          '  "schema": {\n'
          '    "name": "spritecraft.spritesheet",\n'
          '    "version": 1\n'
          '  },\n'
          '  "image": {\n'
          '    "path": "build/sheet.png",\n'
          '    "width": 64,\n'
          '    "height": 32\n'
          '  },\n'
          '  "layout": {\n'
          '    "mode": "uniform-grid",\n'
          '    "tileWidth": 16,\n'
          '    "tileHeight": 16,\n'
          '    "columns": 4,\n'
          '    "rows": 2,\n'
          '    "frameCount": 1\n'
          '  },\n'
          '  "metadataPath": "build/sheet.json",\n'
          '  "frames": [\n'
          '    {\n'
          '      "name": "idle_0",\n'
          '      "sourcePath": "frames/idle_0.png",\n'
          '      "index": 0,\n'
          '      "column": 0,\n'
          '      "row": 0,\n'
          '      "tileX": 0,\n'
          '      "tileY": 0,\n'
          '      "x": 0,\n'
          '      "y": 0,\n'
          '      "width": 16,\n'
          '      "height": 16,\n'
          '      "tileWidth": 16,\n'
          '      "tileHeight": 16,\n'
          '      "offsetX": 0,\n'
          '      "offsetY": 0,\n'
          '      "sourceWidth": 16,\n'
          '      "sourceHeight": 16\n'
          '    }\n'
          '  ]\n'
          '}';

      expect(
        const JsonEncoder.withIndent('  ').convert(result.toJson()),
        expected,
      );
    });

    test('render metadata shape stays stable', () {
      final LpcRenderResult result = LpcRenderResult(
        pngBytes: const <int>[1, 2, 3],
        width: 64,
        height: 64,
        usedLayers: const <UsedLpcLayer>[
          UsedLpcLayer(
            itemId: 'cape_red',
            itemName: 'Red Cape',
            typeName: 'Cape',
            variant: 'default',
            layerId: 'cape',
            zPos: 10,
            assetPath: 'spritesheets/cape_red.png',
          ),
        ],
        credits: const <LpcCreditRecord>[
          LpcCreditRecord(
            file: 'spritesheets/cape_red.png',
            notes: 'Cape source',
            authors: <String>['Artist'],
            licenses: <String>['CC-BY-SA'],
            urls: <String>['https://example.test/cape'],
          ),
        ],
      );

      final Map<String, Object> metadata = result.toMetadataJson(
        request: const LpcRenderRequest(
          bodyType: 'male',
          animation: 'idle',
          selections: <String, String>{'cape_red': 'default'},
          prompt: 'A caped hero',
        ),
        imageName: 'hero.png',
      );

      expect(metadata['schema'], <String, Object>{
        'name': 'spritecraft.render',
        'version': kSpriteCraftRenderSchemaVersion,
      });
      expect(
        (metadata['content'] as Map<String, Object?>)['projectSchemaVersion'],
        kSpriteCraftProjectSchemaVersion,
      );
      expect((metadata['content'] as Map<String, Object?>)['bodyType'], 'male');
      expect(
        (metadata['content'] as Map<String, Object?>)['animation'],
        'idle',
      );
      expect((metadata['layers'] as List<Object?>).length, 1);
      expect((metadata['credits'] as List<Object?>).length, 1);
    });
  });
}
