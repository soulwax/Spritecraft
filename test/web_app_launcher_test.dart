// File: test/web_app_launcher_test.dart

import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:spritecraft/src/dev/web_app_launcher.dart';
import 'package:test/test.dart';

void main() {
  group('detectWebPackageManager', () {
    test('prefers explicit package manager override', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'studio-launcher-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      expect(
        detectWebPackageManager(root, preferred: 'npm'),
        WebPackageManager.npm,
      );
    });

    test('uses packageManager field before lockfiles', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'studio-launcher-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      await File(path.join(root.path, 'package.json')).writeAsString('''
{
  "name": "studio",
  "packageManager": "bun@1.2.0"
}
''');
      await File(path.join(root.path, 'pnpm-lock.yaml')).writeAsString('lock');

      expect(detectWebPackageManager(root), WebPackageManager.bun);
    });

    test('falls back to lockfiles and then pnpm default', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'studio-launcher-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      await File(path.join(root.path, 'yarn.lock')).writeAsString('lock');
      expect(detectWebPackageManager(root), WebPackageManager.yarn);

      await File(path.join(root.path, 'yarn.lock')).delete();
      expect(detectWebPackageManager(root), WebPackageManager.pnpm);
    });
  });

  group('buildWebDevArguments', () {
    test('builds package-manager-specific dev arguments', () {
      expect(buildWebDevArguments(WebPackageManager.pnpm, port: 3210), <String>[
        'dev',
        '--port',
        '3210',
      ]);
      expect(buildWebDevArguments(WebPackageManager.npm, port: 3210), <String>[
        'run',
        'dev',
        '--',
        '--port',
        '3210',
      ]);
      expect(buildWebDevArguments(WebPackageManager.yarn, port: 3210), <String>[
        'dev',
        '--port',
        '3210',
      ]);
    });
  });

  group('webDependenciesInstalled', () {
    test('detects node_modules presence', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'studio-launcher-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      expect(webDependenciesInstalled(root), isFalse);
      await Directory(path.join(root.path, 'node_modules')).create();
      expect(webDependenciesInstalled(root), isTrue);
    });
  });

  group('buildWebInstallArguments', () {
    test('uses install for supported package managers', () {
      expect(buildWebInstallArguments(WebPackageManager.pnpm), <String>[
        'install',
      ]);
      expect(buildWebInstallArguments(WebPackageManager.npm), <String>[
        'install',
      ]);
      expect(buildWebInstallArguments(WebPackageManager.yarn), <String>[
        'install',
      ]);
      expect(buildWebInstallArguments(WebPackageManager.bun), <String>[
        'install',
      ]);
    });
  });
}
