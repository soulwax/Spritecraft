import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as path;

class RecoverySupport {
  const RecoverySupport._();

  static const int _maxRecords = 200;
  static const String _exportLogName = 'export-recovery-log.json';
  static const String _historyLogName = 'history-recovery-log.json';

  static Future<File> recordExportRecovery({
    required Directory recoveryDirectory,
    required Map<String, Object?> exportResult,
    String? projectName,
  }) async {
    final Map<String, Object?> record = <String, Object?>{
      'kind': 'export-bundle',
      'recordedAt': DateTime.now().toUtc().toIso8601String(),
      'projectName': projectName,
      'baseName': exportResult['baseName']?.toString(),
      'enginePreset': exportResult['enginePreset']?.toString(),
      'imagePath': exportResult['imagePath']?.toString(),
      'metadataPath': exportResult['metadataPath']?.toString(),
      'bundlePath': exportResult['bundlePath']?.toString(),
      'extraPaths':
          (exportResult['extraPaths'] as List<dynamic>? ?? const <dynamic>[])
              .map((dynamic value) => value.toString())
              .toList(),
      'batch': exportResult['batch'] == true,
      'jobs': (exportResult['jobs'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map>()
          .map(
            (Map<dynamic, dynamic> job) => Map<String, Object?>.from(
              job.map(
                (dynamic key, dynamic value) =>
                    MapEntry(key.toString(), value as Object?),
              ),
            ),
          )
          .toList(),
    };

    return _appendRecord(
      recoveryDirectory: recoveryDirectory,
      fileName: _exportLogName,
      format: 'spritecraft.export-recovery-log',
      record: record,
    );
  }

  static Future<File> recordHistoryPackageRecovery({
    required Directory recoveryDirectory,
    required String operation,
    required String packagePath,
    String? historyId,
    String? projectName,
  }) async {
    final Map<String, Object?> record = <String, Object?>{
      'kind': 'history-package-$operation',
      'recordedAt': DateTime.now().toUtc().toIso8601String(),
      'historyId': historyId,
      'projectName': projectName,
      'packagePath': packagePath,
    };

    return _appendRecord(
      recoveryDirectory: recoveryDirectory,
      fileName: _historyLogName,
      format: 'spritecraft.history-recovery-log',
      record: record,
    );
  }

  static Future<File> _appendRecord({
    required Directory recoveryDirectory,
    required String fileName,
    required String format,
    required Map<String, Object?> record,
  }) async {
    await recoveryDirectory.create(recursive: true);
    final File logFile = File(path.join(recoveryDirectory.path, fileName));

    final List<Map<String, Object?>> records = <Map<String, Object?>>[];
    if (await logFile.exists()) {
      try {
        final Object? decoded = jsonDecode(await logFile.readAsString());
        if (decoded is Map) {
          final List<dynamic> existing =
              decoded['records'] as List<dynamic>? ?? const <dynamic>[];
          records.addAll(
            existing.whereType<Map>().map(
              (Map<dynamic, dynamic> entry) => Map<String, Object?>.from(
                entry.map(
                  (dynamic key, dynamic value) =>
                      MapEntry(key.toString(), value as Object?),
                ),
              ),
            ),
          );
        }
      } on FormatException {
        records.clear();
      }
    }

    records.add(record);
    final List<Map<String, Object?>> trimmed = records.length <= _maxRecords
        ? records
        : records.sublist(records.length - _maxRecords);

    await logFile.writeAsString(
      const JsonEncoder.withIndent('  ').convert(<String, Object?>{
        'format': format,
        'version': 1,
        'updatedAt': DateTime.now().toUtc().toIso8601String(),
        'records': trimmed,
      }),
    );

    return logFile;
  }
}
