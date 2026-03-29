import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:spritecraft/src/server/export_support.dart';
import 'package:test/test.dart';

void main() {
  group('ExportSupport Godot presets', () {
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp(
        'spritecraft-godot-export-test-',
      );
    });

    tearDown(() async {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('writes native SpriteFrames tres output alongside compatibility json', () async {
      final List<File> files = await ExportSupport.writeEnginePresetFiles(
        exportDirectory: tempDir,
        baseName: 'forest-ranger-20260330-120000',
        enginePreset: 'godot',
        metadata: <String, Object?>{
          'image': <String, Object?>{
            'path': 'build/exports/forest-ranger-20260330-120000.png',
            'width': 128,
            'height': 64,
          },
          'frames': <Map<String, Object?>>[
            <String, Object?>{
              'index': 0,
              'name': 'idle_0',
              'x': 0,
              'y': 0,
              'width': 32,
              'height': 32,
              'durationMs': 100,
              'pivotX': 16,
              'pivotY': 24,
              'tags': <String>['idle'],
            },
            <String, Object?>{
              'index': 1,
              'name': 'idle_1',
              'x': 32,
              'y': 0,
              'width': 32,
              'height': 32,
              'durationMs': 120,
              'pivotX': 16,
              'pivotY': 24,
              'tags': <String>['idle'],
            },
          ],
          'animations': <Map<String, Object?>>[
            <String, Object?>{
              'name': 'idle',
              'loop': true,
              'frameIndices': <int>[0, 1],
              'totalDurationMs': 220,
            },
          ],
        },
      );

      final List<String> names = files
          .map((File file) => path.basename(file.path))
          .toList()
        ..sort();

      expect(
        names,
        contains('forest-ranger-20260330-120000.godot.tres'),
      );
      expect(
        names,
        contains('forest-ranger-20260330-120000.godot.json'),
      );

      final File tresFile = files.firstWhere(
        (File file) => file.path.endsWith('.godot.tres'),
      );
      final String tresContents = await tresFile.readAsString();

      expect(tresContents, contains('[gd_resource type="SpriteFrames"'));
      expect(
        tresContents,
        contains('[ext_resource type="Texture2D" path="res://forest-ranger-20260330-120000.png" id="1_texture"]'),
      );
      expect(tresContents, contains('[sub_resource type="AtlasTexture" id="AtlasTexture_0"]'));
      expect(tresContents, contains('region = Rect2(0, 0, 32, 32)'));
      expect(tresContents, contains('&"idle"'));
      expect(tresContents, contains('SubResource("AtlasTexture_1")'));
    });
  });
}
