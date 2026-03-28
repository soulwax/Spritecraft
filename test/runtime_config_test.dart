import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:spritecraft/src/config/runtime_config.dart';
import 'package:test/test.dart';

void main() {
  group('RuntimeConfig.load', () {
    test('loads env values and reports malformed .env lines', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-runtime-config-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      final File dotEnv = File(path.join(root.path, '.env'));
      await dotEnv.writeAsString('''
GEMINI_API_KEY="demo-key"
DATABASE_URL=postgres://example.test/db
BROKEN_LINE
EMPTY_KEY==
MISMATCHED_QUOTE="oops
''');

      final RuntimeConfig config = await RuntimeConfig.load(projectRoot: root);

      expect(config.geminiApiKey, 'demo-key');
      expect(config.databaseUrl, 'postgres://example.test/db');
      expect(config.configurationWarnings, isNotEmpty);
      expect(
        config.configurationWarnings.join(' '),
        contains('line 3'),
      );
      expect(
        config.configurationWarnings.join(' '),
        contains('MISMATCHED_QUOTE'),
      );
    });

    test('resolves project-relative directories', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-runtime-paths-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      final RuntimeConfig config = await RuntimeConfig.load(projectRoot: root);

      expect(config.studioDirectory.path, path.join(root.path, 'studio'));
      expect(
        config.exportDirectory.path,
        path.join(root.path, 'build', 'exports'),
      );
      expect(
        config.lpcDefinitionsDirectory.path,
        path.join(root.path, 'lpc-spritesheet-creator', 'sheet_definitions'),
      );
      expect(
        config.lpcSpritesheetsDirectory.path,
        path.join(root.path, 'lpc-spritesheet-creator', 'spritesheets'),
      );
    });
  });
}
