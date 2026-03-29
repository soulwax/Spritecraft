// File: lib/src/config/runtime_config.dart

import 'dart:io';

import 'package:path/path.dart' as path;

class RuntimeConfig {
  RuntimeConfig({
    required this.projectRoot,
    required this.geminiApiKey,
    required this.databaseUrl,
    required this.lpcProjectRoot,
    required this.configurationWarnings,
  });

  final Directory projectRoot;
  final String geminiApiKey;
  final String databaseUrl;
  final Directory lpcProjectRoot;
  final List<String> configurationWarnings;

  bool get hasGemini => geminiApiKey.isNotEmpty;
  bool get hasDatabase => databaseUrl.isNotEmpty;
  bool get hasLpcProject => lpcProjectRoot.existsSync();

  Directory get exportDirectory =>
      Directory(path.join(projectRoot.path, 'build', 'exports'));
  Directory get projectPackageDirectory =>
      Directory(path.join(exportDirectory.path, 'projects'));
  Directory get lpcDefinitionsDirectory =>
      Directory(path.join(lpcProjectRoot.path, 'sheet_definitions'));
  Directory get lpcSpritesheetsDirectory =>
      Directory(path.join(lpcProjectRoot.path, 'spritesheets'));

  static Future<RuntimeConfig> load({Directory? projectRoot}) async {
    final Directory root = projectRoot ?? Directory.current;
    final _DotEnvLoadResult dotEnv = await _loadDotEnvIfPresent(root);
    final Map<String, String> values = <String, String>{
      ...dotEnv.values,
      ...Platform.environment,
    };

    return RuntimeConfig(
      projectRoot: root,
      geminiApiKey: values['GEMINI_API_KEY'] ?? '',
      databaseUrl: values['DATABASE_URL'] ?? '',
      lpcProjectRoot: Directory(
        path.join(root.path, 'lpc-spritesheet-creator'),
      ),
      configurationWarnings: dotEnv.warnings,
    );
  }

  static Future<_DotEnvLoadResult> _loadDotEnvIfPresent(
    Directory root,
  ) async {
    final File dotEnv = File(path.join(root.path, '.env'));
    if (!await dotEnv.exists()) {
      return const _DotEnvLoadResult();
    }

    final Map<String, String> values = <String, String>{};
    final List<String> warnings = <String>[];
    final List<String> lines = await dotEnv.readAsLines();
    for (int index = 0; index < lines.length; index++) {
      final String rawLine = lines[index];
      final String line = rawLine.trim();
      if (line.isEmpty || line.startsWith('#')) {
        continue;
      }

      final int separator = line.indexOf('=');
      if (separator <= 0) {
        warnings.add(
          '.env line ${index + 1} is ignored because it is not KEY=VALUE.',
        );
        continue;
      }

      final String key = line.substring(0, separator).trim();
      String value = line.substring(separator + 1).trim();
      if (key.isEmpty) {
        warnings.add('.env line ${index + 1} has an empty key and was ignored.');
        continue;
      }

      final bool startsQuoted =
          value.startsWith('"') || value.startsWith("'");
      final bool endsQuoted = value.endsWith('"') || value.endsWith("'");
      if (startsQuoted != endsQuoted) {
        warnings.add(
          '.env line ${index + 1} has mismatched quotes for $key.',
        );
      }

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }

      values[key] = value;
    }

    return _DotEnvLoadResult(values: values, warnings: warnings);
  }
}

class _DotEnvLoadResult {
  const _DotEnvLoadResult({
    this.values = const <String, String>{},
    this.warnings = const <String>[],
  });

  final Map<String, String> values;
  final List<String> warnings;
}
