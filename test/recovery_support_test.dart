import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:spritecraft/src/server/recovery_support.dart';
import 'package:test/test.dart';

void main() {
  group('RecoverySupport', () {
    test('records export recovery entries with bundle details', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'spritecraft-recovery-export-test',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final File logFile = await RecoverySupport.recordExportRecovery(
        recoveryDirectory: sandbox,
        projectName: 'Forest Ranger',
        exportResult: <String, Object?>{
          'baseName': 'forest-ranger-export',
          'enginePreset': 'both',
          'imagePath': 'build/exports/forest-ranger-export.png',
          'metadataPath': 'build/exports/forest-ranger-export.json',
          'bundlePath': 'build/exports/forest-ranger-export.zip',
          'extraPaths': <String>[
            'build/exports/forest-ranger-export.godot.tres',
          ],
          'batch': false,
          'jobs': <Map<String, Object?>>[
            <String, Object?>{
              'variant': 'base',
              'animation': 'idle',
              'baseName': 'forest-ranger-export',
            },
          ],
        },
      );

      expect(path.basename(logFile.path), 'export-recovery-log.json');
      final Map<String, dynamic> payload =
          jsonDecode(await logFile.readAsString()) as Map<String, dynamic>;
      expect(payload['format'], 'spritecraft.export-recovery-log');
      expect(payload['records'], hasLength(1));
      expect(payload['records'][0]['bundlePath'], contains('.zip'));
      expect(payload['records'][0]['projectName'], 'Forest Ranger');
    });

    test('records history package export and import operations', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'spritecraft-recovery-history-test',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      await RecoverySupport.recordHistoryPackageRecovery(
        recoveryDirectory: sandbox,
        operation: 'export',
        historyId: '123',
        projectName: 'Ranger Draft',
        packagePath: 'build/exports/projects/ranger.spritecraft-project.json',
      );
      final File logFile = await RecoverySupport.recordHistoryPackageRecovery(
        recoveryDirectory: sandbox,
        operation: 'import',
        historyId: '456',
        projectName: 'Ranger Imported',
        packagePath: 'build/exports/projects/ranger.spritecraft-project.json',
      );

      final Map<String, dynamic> payload =
          jsonDecode(await logFile.readAsString()) as Map<String, dynamic>;
      expect(payload['format'], 'spritecraft.history-recovery-log');
      expect(payload['records'], hasLength(2));
      expect(payload['records'][0]['kind'], 'history-package-export');
      expect(payload['records'][1]['kind'], 'history-package-import');
      expect(payload['records'][1]['historyId'], '456');
    });
  });
}
