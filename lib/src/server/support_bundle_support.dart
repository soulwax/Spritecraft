import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:path/path.dart' as path;

class SupportBundleSupport {
  const SupportBundleSupport._();

  static Future<File> createBundle({
    required Directory supportDirectory,
    required Directory logsDirectory,
    required Directory recoveryDirectory,
    required Map<String, Object?> bootstrapPayload,
    required Map<String, Object?> healthPayload,
    String? userNote,
  }) async {
    await supportDirectory.create(recursive: true);

    final DateTime now = DateTime.now().toUtc();
    final String timestamp =
        '${now.year.toString().padLeft(4, '0')}'
        '${now.month.toString().padLeft(2, '0')}'
        '${now.day.toString().padLeft(2, '0')}-'
        '${now.hour.toString().padLeft(2, '0')}'
        '${now.minute.toString().padLeft(2, '0')}'
        '${now.second.toString().padLeft(2, '0')}';
    final String baseName = 'spritecraft-support-$timestamp';

    final Archive archive = Archive();
    await _addJson(
      archive,
      'bootstrap.json',
      bootstrapPayload,
    );
    await _addJson(
      archive,
      'health.json',
      healthPayload,
    );
    await _addJson(
      archive,
      'manifest.json',
      <String, Object?>{
        'format': 'spritecraft.support-bundle',
        'version': 1,
        'createdAt': now.toIso8601String(),
        'userNote': userNote?.trim().isEmpty ?? true ? null : userNote?.trim(),
      },
    );

    await _addDirectoryFiles(
      archive,
      directory: logsDirectory,
      archiveRoot: 'logs',
      extensions: <String>{'.jsonl'},
    );
    await _addDirectoryFiles(
      archive,
      directory: recoveryDirectory,
      archiveRoot: 'recovery',
      fileNames: <String>{
        'export-recovery-log.json',
        'history-recovery-log.json',
      },
    );

    final List<int> zippedBytes = ZipEncoder().encode(archive);
    final File zipFile = File(path.join(supportDirectory.path, '$baseName.zip'));
    await zipFile.writeAsBytes(zippedBytes, flush: true);
    return zipFile;
  }

  static Future<void> _addJson(
    Archive archive,
    String fileName,
    Map<String, Object?> payload,
  ) async {
    final List<int> bytes = utf8.encode(
      const JsonEncoder.withIndent('  ').convert(payload),
    );
    archive.add(ArchiveFile(fileName, bytes.length, bytes));
  }

  static Future<void> _addDirectoryFiles(
    Archive archive, {
    required Directory directory,
    required String archiveRoot,
    Set<String> extensions = const <String>{},
    Set<String> fileNames = const <String>{},
  }) async {
    if (!await directory.exists()) {
      return;
    }

    await for (final FileSystemEntity entity in directory.list()) {
      if (entity is! File) {
        continue;
      }
      final String basename = path.basename(entity.path);
      final String extension = path.extension(entity.path).toLowerCase();
      final bool matchesName = fileNames.isEmpty || fileNames.contains(basename);
      final bool matchesExtension =
          extensions.isEmpty || extensions.contains(extension);
      if (!matchesName || !matchesExtension) {
        continue;
      }

      final List<int> bytes = await entity.readAsBytes();
      archive.add(
        ArchiveFile(
          path.join(archiveRoot, basename),
          bytes.length,
          bytes,
        ),
      );
    }
  }
}
