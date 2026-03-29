// File: test/studio_server_startup_test.dart

import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:spritecraft/src/config/runtime_config.dart';
import 'package:spritecraft/src/server/studio_server.dart';
import 'package:test/test.dart';

void main() {
  group('StudioServer.create', () {
    test('starts without LPC assets or database connectivity', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-server-startup-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      await File(path.join(root.path, '.env')).writeAsString(
        'DATABASE_URL=postgresql://127.0.0.1:1/does-not-exist\n',
      );

      final RuntimeConfig config = await RuntimeConfig.load(projectRoot: root);
      final StudioServer server = await StudioServer.create(config);

      expect(server.config.hasDatabase, isTrue);
      expect(server.historyRepository, isNull);
    });
  });
}
