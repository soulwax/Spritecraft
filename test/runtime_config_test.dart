import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:spritecraft/src/config/runtime_config.dart';
import 'package:test/test.dart';

void main() {
  group('RuntimeConfig startup checks', () {
    test('flags missing LPC submodule structure as startup errors', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'runtime_config_missing_lpc',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final RuntimeConfig config = await RuntimeConfig.load(
        projectRoot: sandbox,
      );

      expect(config.hasStartupErrors, isTrue);
      expect(
        config.startupChecks.any(
          (RuntimeStartupCheck check) =>
              check.code == 'lpc_project_root' && check.status == 'error',
        ),
        isTrue,
      );
      expect(
        config.startupChecks.any(
          (RuntimeStartupCheck check) =>
              check.code == 'lpc_definitions_directory' &&
              check.status == 'error',
        ),
        isTrue,
      );
      expect(
        config.startupFailureMessage,
        contains('git submodule update --init --recursive'),
      );
    });

    test('passes startup checks for a complete LPC project layout', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'runtime_config_valid_lpc',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final Directory lpcRoot = Directory(
        path.join(sandbox.path, 'lpc-spritesheet-creator'),
      );
      final Directory definitions = Directory(
        path.join(lpcRoot.path, 'sheet_definitions', 'body'),
      );
      final Directory spritesheets = Directory(
        path.join(lpcRoot.path, 'spritesheets', 'body'),
      );

      await definitions.create(recursive: true);
      await spritesheets.create(recursive: true);
      await File(
        path.join(lpcRoot.path, '.git'),
      ).writeAsString('gitdir: ../.git/modules/lpc-spritesheet-creator');
      await File(
        path.join(lpcRoot.path, 'CREDITS.csv'),
      ).writeAsString('file,author\n');
      await File(path.join(definitions.path, 'body.json')).writeAsString('{}');
      await File(
        path.join(spritesheets.path, 'idle.png'),
      ).writeAsBytes(<int>[0]);

      final RuntimeConfig config = await RuntimeConfig.load(
        projectRoot: sandbox,
      );

      expect(config.hasStartupErrors, isFalse);
      expect(
        config.startupChecks.every(
          (RuntimeStartupCheck check) => check.status != 'error',
        ),
        isTrue,
      );
      expect(
        config.startupChecks.any(
          (RuntimeStartupCheck check) =>
              check.code == 'lpc_spritesheet_files' && check.status == 'ok',
        ),
        isTrue,
      );
    });

    test('accepts bundled LPC runtime assets without a submodule marker', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'runtime_config_bundled_lpc',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final Directory bundledRoot = Directory(
        path.join(sandbox.path, 'runtime', 'assets', 'lpc-spritesheet-creator'),
      );
      final Directory definitions = Directory(
        path.join(bundledRoot.path, 'sheet_definitions', 'body'),
      );
      final Directory spritesheets = Directory(
        path.join(bundledRoot.path, 'spritesheets', 'body'),
      );

      await definitions.create(recursive: true);
      await spritesheets.create(recursive: true);
      await File(
        path.join(bundledRoot.path, 'CREDITS.csv'),
      ).writeAsString('file,author\n');
      await File(path.join(definitions.path, 'body.json')).writeAsString('{}');
      await File(
        path.join(spritesheets.path, 'idle.png'),
      ).writeAsBytes(<int>[0]);

      final RuntimeConfig config = await RuntimeConfig.load(
        projectRoot: sandbox,
        environment: <String, String>{'SPRITECRAFT_LPC_ROOT': bundledRoot.path},
      );

      expect(config.hasStartupErrors, isFalse);
      expect(config.expectsLpcSubmoduleMarker, isFalse);
      expect(
        config.startupChecks.any(
          (RuntimeStartupCheck check) =>
              check.code == 'lpc_submodule_marker' && check.status == 'ok',
        ),
        isTrue,
      );
    });
  });
}
