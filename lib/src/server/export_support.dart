import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:path/path.dart' as path;

class ExportSupport {
  const ExportSupport._();

  static String buildBaseName({
    required String prompt,
    required DateTime timestamp,
    String projectName = '',
  }) {
    final String preferred = projectName.trim().isNotEmpty
        ? projectName
        : prompt.trim();
    final String stem = sanitizeFileStem(
      preferred.isEmpty ? 'spritecraft-export' : preferred,
    );
    final String suffix =
        '${timestamp.year.toString().padLeft(4, '0')}'
        '${timestamp.month.toString().padLeft(2, '0')}'
        '${timestamp.day.toString().padLeft(2, '0')}-'
        '${timestamp.hour.toString().padLeft(2, '0')}'
        '${timestamp.minute.toString().padLeft(2, '0')}'
        '${timestamp.second.toString().padLeft(2, '0')}';
    return '$stem-$suffix';
  }

  static String sanitizeFileStem(String value) {
    final String normalized = value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
    return normalized.isEmpty ? 'spritecraft-export' : normalized;
  }

  static Future<List<File>> writeEnginePresetFiles({
    required Directory exportDirectory,
    required String baseName,
    required String enginePreset,
    required Map<String, Object?> metadata,
  }) async {
    final List<File> files = <File>[];
    final String normalized = enginePreset.trim().toLowerCase();

    Future<void> addPreset(String engine) async {
      final File file = File(
        path.join(exportDirectory.path, '$baseName.$engine.json'),
      );
      final Map<String, Object?> payload = <String, Object?>{
        'engine': engine,
        'baseName': baseName,
        'metadata': metadata,
      };
      await file.writeAsString(
        const JsonEncoder.withIndent('  ').convert(payload),
      );
      files.add(file);
    }

    if (normalized == 'godot' || normalized == 'both') {
      await addPreset('godot');
    }
    if (normalized == 'unity' || normalized == 'both') {
      await addPreset('unity');
    }

    return files;
  }

  static Future<File> writeExportBundle({
    required Directory exportDirectory,
    required String baseName,
    required List<File> files,
  }) async {
    final Archive archive = Archive();
    final List<String> archivedNames = <String>[];
    for (final File file in files) {
      final List<int> bytes = await file.readAsBytes();
      final String fileName = path.basename(file.path);
      archive.add(
        ArchiveFile(
          fileName,
          bytes.length,
          bytes,
        ),
      );
      archivedNames.add(fileName);
    }

    final List<int> manifestBytes = utf8.encode(
      const JsonEncoder.withIndent('  ').convert(<String, Object>{
        'bundle': <String, Object>{
          'name': baseName,
          'version': 1,
        },
        'files': archivedNames,
      }),
    );
    archive.add(
      ArchiveFile(
        'bundle-manifest.json',
        manifestBytes.length,
        manifestBytes,
      ),
    );

    final List<int> zippedBytes = ZipEncoder().encode(archive) ?? <int>[];
    final File zipFile = File(path.join(exportDirectory.path, '$baseName.zip'));
    await zipFile.writeAsBytes(zippedBytes, flush: true);
    return zipFile;
  }
}
