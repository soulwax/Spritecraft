// File: lib/src/config/runtime_config.dart

import 'dart:io';

import 'package:path/path.dart' as path;

class RuntimeConfig {
  RuntimeConfig({
    required this.projectRoot,
    required this.geminiApiKey,
    required this.databaseUrl,
    required this.lpcProjectRoot,
  });

  final Directory projectRoot;
  final String geminiApiKey;
  final String databaseUrl;
  final Directory lpcProjectRoot;

  bool get hasGemini => geminiApiKey.isNotEmpty;
  bool get hasDatabase => databaseUrl.isNotEmpty;
  bool get hasLpcProject => lpcProjectRoot.existsSync();

  Directory get studioDirectory =>
      Directory(path.join(projectRoot.path, 'studio'));
  Directory get exportDirectory =>
      Directory(path.join(projectRoot.path, 'build', 'exports'));
  Directory get lpcDefinitionsDirectory =>
      Directory(path.join(lpcProjectRoot.path, 'sheet_definitions'));
  Directory get lpcSpritesheetsDirectory =>
      Directory(path.join(lpcProjectRoot.path, 'spritesheets'));

  static Future<RuntimeConfig> load({Directory? projectRoot}) async {
    final Directory root = projectRoot ?? Directory.current;
    final Map<String, String> values = <String, String>{
      ...await _loadDotEnvIfPresent(root),
      ...Platform.environment,
    };

    return RuntimeConfig(
      projectRoot: root,
      geminiApiKey: values['GEMINI_API_KEY'] ?? '',
      databaseUrl: values['DATABASE_URL'] ?? '',
      lpcProjectRoot: Directory(
        path.join(root.path, 'lpc-spritesheet-creator'),
      ),
    );
  }

  static Future<Map<String, String>> _loadDotEnvIfPresent(
    Directory root,
  ) async {
    final File dotEnv = File(path.join(root.path, '.env'));
    if (!await dotEnv.exists()) {
      return <String, String>{};
    }

    final Map<String, String> values = <String, String>{};
    final List<String> lines = await dotEnv.readAsLines();
    for (final String rawLine in lines) {
      final String line = rawLine.trim();
      if (line.isEmpty || line.startsWith('#')) {
        continue;
      }

      final int separator = line.indexOf('=');
      if (separator <= 0) {
        continue;
      }

      final String key = line.substring(0, separator).trim();
      String value = line.substring(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }

      values[key] = value;
    }

    return values;
  }
}
