import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:path/path.dart' as path;
import 'package:spritecraft/src/server/support_bundle_support.dart';
import 'package:test/test.dart';

void main() {
  group('SupportBundleSupport', () {
    test('creates a zip with runtime snapshots, logs, and recovery indexes', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'spritecraft-support-bundle-test',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final Directory logsDirectory = Directory(path.join(sandbox.path, 'logs'))
        ..createSync(recursive: true);
      final Directory recoveryDirectory = Directory(
        path.join(sandbox.path, 'recovery'),
      )..createSync(recursive: true);
      final Directory supportDirectory = Directory(
        path.join(sandbox.path, 'support'),
      );

      await File(path.join(logsDirectory.path, 'spritecraft-2026-03-30.log.jsonl'))
          .writeAsString('{"event":"startup_check_failed"}\n');
      await File(path.join(recoveryDirectory.path, 'export-recovery-log.json'))
          .writeAsString('{"format":"spritecraft.export-recovery-log"}');

      final File bundle = await SupportBundleSupport.createBundle(
        supportDirectory: supportDirectory,
        logsDirectory: logsDirectory,
        recoveryDirectory: recoveryDirectory,
        bootstrapPayload: <String, Object?>{
          'config': <String, Object?>{'hasGemini': false},
        },
        healthPayload: <String, Object?>{
          'status': 'warning',
          'checks': <Object?>[],
        },
        userNote: 'Support requested after export failure',
      );

      expect(await bundle.exists(), isTrue);
      final Archive archive = ZipDecoder().decodeBytes(await bundle.readAsBytes());
      final List<String> names = archive.files.map((ArchiveFile file) => file.name).toList();

      expect(names, contains('manifest.json'));
      expect(names, contains('bootstrap.json'));
      expect(names, contains('health.json'));
      expect(names, contains('logs/spritecraft-2026-03-30.log.jsonl'));
      expect(names, contains('recovery/export-recovery-log.json'));

      final ArchiveFile manifestFile = archive.files.firstWhere(
        (ArchiveFile file) => file.name == 'manifest.json',
      );
      final Map<String, dynamic> manifest =
          jsonDecode(utf8.decode(manifestFile.content as List<int>))
              as Map<String, dynamic>;
      expect(manifest['format'], 'spritecraft.support-bundle');
      expect(manifest['userNote'], contains('export failure'));
    });
  });
}
