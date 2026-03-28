import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:path/path.dart' as path;
import 'package:spritecraft/src/server/export_support.dart';
import 'package:test/test.dart';

void main() {
  group('ExportSupport.buildBaseName', () {
    test('prefers project name and adds timestamp suffix', () {
      final String baseName = ExportSupport.buildBaseName(
        prompt: 'Forest ranger idle',
        projectName: 'Forest Ranger',
        timestamp: DateTime.utc(2026, 3, 28, 18, 41, 36),
      );

      expect(baseName, 'forest-ranger-20260328-184136');
    });

    test('falls back to prompt and sanitizes unsafe characters', () {
      final String baseName = ExportSupport.buildBaseName(
        prompt: 'Mage / Boss   Variant!!!',
        timestamp: DateTime.utc(2026, 3, 28, 9, 5, 2),
      );

      expect(baseName, 'mage-boss-variant-20260328-090502');
    });
  });

  group('ExportSupport.writeEnginePresetFiles', () {
    test('writes both engine presets when requested', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-export-presets-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      final List<File> files = await ExportSupport.writeEnginePresetFiles(
        exportDirectory: root,
        baseName: 'forest-ranger-20260328-184136',
        enginePreset: 'both',
        metadata: <String, Object?>{
          'image': 'forest-ranger-20260328-184136.png',
          'frameCount': 6,
        },
      );

      expect(files, hasLength(2));
      expect(files.map((File file) => path.basename(file.path)), containsAll(<String>[
        'forest-ranger-20260328-184136.godot.json',
        'forest-ranger-20260328-184136.unity.json',
      ]));

      final Map<String, dynamic> godotPayload = jsonDecode(
        await files.firstWhere((File file) => file.path.endsWith('.godot.json'))
            .readAsString(),
      ) as Map<String, dynamic>;
      expect(godotPayload['engine'], 'godot');
      expect(godotPayload['metadata'], isA<Map<String, dynamic>>());
    });
  });

  group('ExportSupport.writeExportBundle', () {
    test('creates a zip bundle with all provided files', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-export-bundle-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      final File pngFile = File(path.join(root.path, 'hero.png'))
        ..writeAsBytesSync(<int>[1, 2, 3, 4]);
      final File jsonFile = File(path.join(root.path, 'hero.json'))
        ..writeAsStringSync('{"ok":true}');
      final File presetFile = File(path.join(root.path, 'hero.godot.json'))
        ..writeAsStringSync('{"engine":"godot"}');

      final File bundle = await ExportSupport.writeExportBundle(
        exportDirectory: root,
        baseName: 'hero-export',
        files: <File>[pngFile, jsonFile, presetFile],
      );

      expect(await bundle.exists(), isTrue);
      final List<int> zipBytes = await bundle.readAsBytes();
      final Archive archive = ZipDecoder().decodeBytes(zipBytes);
      final List<String> archivedNames = archive.files
          .map((ArchiveFile file) => file.name)
          .toList();

      expect(archivedNames, containsAll(<String>[
        'hero.png',
        'hero.json',
        'hero.godot.json',
        'bundle-manifest.json',
      ]));

      final ArchiveFile manifest = archive.files.firstWhere(
        (ArchiveFile file) => file.name == 'bundle-manifest.json',
      );
      final Map<String, dynamic> manifestPayload = jsonDecode(
        utf8.decode(manifest.content as List<int>),
      ) as Map<String, dynamic>;
      expect(manifestPayload['bundle']['name'], 'hero-export');
      expect(
        manifestPayload['files'],
        containsAll(<String>['hero.png', 'hero.json', 'hero.godot.json']),
      );
    });
  });
}
