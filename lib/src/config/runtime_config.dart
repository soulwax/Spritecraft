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
    required this.startupChecks,
  });

  final Directory projectRoot;
  final String geminiApiKey;
  final String databaseUrl;
  final Directory lpcProjectRoot;
  final List<String> configurationWarnings;
  final List<RuntimeStartupCheck> startupChecks;

  bool get hasGemini => geminiApiKey.isNotEmpty;
  bool get hasDatabase => databaseUrl.isNotEmpty;
  bool get hasLpcProject => lpcProjectRoot.existsSync();
  bool get hasStartupErrors =>
      startupChecks.any((RuntimeStartupCheck check) => check.status == 'error');
  String get startupFailureMessage {
    final List<String> failures = startupChecks
        .where((RuntimeStartupCheck check) => check.status == 'error')
        .map((RuntimeStartupCheck check) => check.detail)
        .toList(growable: false);
    return failures.join(' ');
  }

  Directory get exportDirectory =>
      Directory(path.join(projectRoot.path, 'build', 'exports'));
  Directory get recoveryDirectory =>
      Directory(path.join(projectRoot.path, 'build', 'recovery'));
  Directory get renderCacheDirectory =>
      Directory(path.join(projectRoot.path, 'build', 'cache', 'render-assets'));
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
      startupChecks: await _buildStartupChecks(
        lpcProjectRoot: Directory(
          path.join(root.path, 'lpc-spritesheet-creator'),
        ),
      ),
    );
  }

  static Future<List<RuntimeStartupCheck>> _buildStartupChecks({
    required Directory lpcProjectRoot,
  }) async {
    final Directory definitionsDirectory = Directory(
      path.join(lpcProjectRoot.path, 'sheet_definitions'),
    );
    final Directory spritesheetsDirectory = Directory(
      path.join(lpcProjectRoot.path, 'spritesheets'),
    );
    final File submoduleMarker = File(path.join(lpcProjectRoot.path, '.git'));
    final File creditsFile = File(
      path.join(lpcProjectRoot.path, 'CREDITS.csv'),
    );

    final List<RuntimeStartupCheck> checks = <RuntimeStartupCheck>[
      RuntimeStartupCheck(
        code: 'lpc_project_root',
        label: 'LPC project root',
        status: lpcProjectRoot.existsSync() ? 'ok' : 'error',
        detail: lpcProjectRoot.existsSync()
            ? 'Found LPC project root at ${lpcProjectRoot.path}.'
            : 'Missing lpc-spritesheet-creator at ${lpcProjectRoot.path}. Run git submodule update --init --recursive.',
        location: lpcProjectRoot.path,
      ),
    ];

    if (!lpcProjectRoot.existsSync()) {
      checks.addAll(<RuntimeStartupCheck>[
        RuntimeStartupCheck(
          code: 'lpc_submodule_marker',
          label: 'LPC submodule marker',
          status: 'error',
          detail:
              'Cannot verify the LPC submodule marker because the project root is missing.',
          location: submoduleMarker.path,
        ),
        RuntimeStartupCheck(
          code: 'lpc_definitions_directory',
          label: 'Definitions directory',
          status: 'error',
          detail:
              'Missing sheet_definitions because the LPC project root is unavailable.',
          location: definitionsDirectory.path,
        ),
        RuntimeStartupCheck(
          code: 'lpc_spritesheets_directory',
          label: 'Spritesheets directory',
          status: 'error',
          detail:
              'Missing spritesheets because the LPC project root is unavailable.',
          location: spritesheetsDirectory.path,
        ),
      ]);
      return checks;
    }

    final bool hasSubmoduleMarker =
        submoduleMarker.existsSync() ||
        Directory(path.join(lpcProjectRoot.path, '.git')).existsSync();
    checks.add(
      RuntimeStartupCheck(
        code: 'lpc_submodule_marker',
        label: 'LPC submodule marker',
        status: hasSubmoduleMarker ? 'ok' : 'warning',
        detail: hasSubmoduleMarker
            ? 'Found a .git marker inside the LPC project.'
            : 'The LPC project does not contain a .git marker. It may not be initialized as a submodule in this checkout.',
        location: submoduleMarker.path,
      ),
    );

    final bool hasDefinitionsDirectory = definitionsDirectory.existsSync();
    checks.add(
      RuntimeStartupCheck(
        code: 'lpc_definitions_directory',
        label: 'Definitions directory',
        status: hasDefinitionsDirectory ? 'ok' : 'error',
        detail: hasDefinitionsDirectory
            ? 'Found sheet definitions at ${definitionsDirectory.path}.'
            : 'Missing sheet definitions at ${definitionsDirectory.path}.',
        location: definitionsDirectory.path,
      ),
    );
    if (hasDefinitionsDirectory) {
      final bool hasDefinitionFiles = await _containsFileWithExtension(
        definitionsDirectory,
        '.json',
      );
      checks.add(
        RuntimeStartupCheck(
          code: 'lpc_definition_files',
          label: 'Definition files',
          status: hasDefinitionFiles ? 'ok' : 'error',
          detail: hasDefinitionFiles
              ? 'Found LPC definition JSON files.'
              : 'No LPC definition JSON files were found under ${definitionsDirectory.path}.',
          location: definitionsDirectory.path,
        ),
      );
    }

    final bool hasSpritesheetsDirectory = spritesheetsDirectory.existsSync();
    checks.add(
      RuntimeStartupCheck(
        code: 'lpc_spritesheets_directory',
        label: 'Spritesheets directory',
        status: hasSpritesheetsDirectory ? 'ok' : 'error',
        detail: hasSpritesheetsDirectory
            ? 'Found spritesheets at ${spritesheetsDirectory.path}.'
            : 'Missing spritesheets at ${spritesheetsDirectory.path}.',
        location: spritesheetsDirectory.path,
      ),
    );
    if (hasSpritesheetsDirectory) {
      final bool hasSpritesheetFiles = await _containsFileWithExtension(
        spritesheetsDirectory,
        '.png',
      );
      checks.add(
        RuntimeStartupCheck(
          code: 'lpc_spritesheet_files',
          label: 'Spritesheet PNG assets',
          status: hasSpritesheetFiles ? 'ok' : 'error',
          detail: hasSpritesheetFiles
              ? 'Found LPC spritesheet PNG assets.'
              : 'No LPC spritesheet PNG assets were found under ${spritesheetsDirectory.path}.',
          location: spritesheetsDirectory.path,
        ),
      );
    }

    checks.add(
      RuntimeStartupCheck(
        code: 'lpc_credits_manifest',
        label: 'Credits manifest',
        status: creditsFile.existsSync() ? 'ok' : 'warning',
        detail: creditsFile.existsSync()
            ? 'Found CREDITS.csv for LPC asset provenance.'
            : 'CREDITS.csv is missing from the LPC project root.',
        location: creditsFile.path,
      ),
    );

    return checks;
  }

  static Future<bool> _containsFileWithExtension(
    Directory directory,
    String extension,
  ) async {
    await for (final FileSystemEntity entity in directory.list(
      recursive: true,
    )) {
      if (entity is File &&
          path.extension(entity.path).toLowerCase() == extension) {
        return true;
      }
    }
    return false;
  }

  static Future<_DotEnvLoadResult> _loadDotEnvIfPresent(Directory root) async {
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
        warnings.add(
          '.env line ${index + 1} has an empty key and was ignored.',
        );
        continue;
      }

      final bool startsQuoted = value.startsWith('"') || value.startsWith("'");
      final bool endsQuoted = value.endsWith('"') || value.endsWith("'");
      if (startsQuoted != endsQuoted) {
        warnings.add('.env line ${index + 1} has mismatched quotes for $key.');
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

class RuntimeStartupCheck {
  const RuntimeStartupCheck({
    required this.code,
    required this.label,
    required this.status,
    required this.detail,
    this.location,
  });

  final String code;
  final String label;
  final String status;
  final String detail;
  final String? location;

  Map<String, String> toJson() {
    return <String, String>{
      'code': code,
      'label': label,
      'status': status,
      'detail': detail,
      if (location case final String location) 'location': location,
    };
  }
}
