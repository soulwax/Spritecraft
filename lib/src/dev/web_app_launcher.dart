// File: lib/src/dev/web_app_launcher.dart

import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as path;

enum WebPackageManager { pnpm, npm, yarn, bun }

WebPackageManager detectWebPackageManager(
  Directory webDirectory, {
  String preferred = 'auto',
}) {
  final String normalizedPreferred = preferred.trim().toLowerCase();
  if (normalizedPreferred.isNotEmpty && normalizedPreferred != 'auto') {
    return parseWebPackageManager(normalizedPreferred);
  }

  final File packageJsonFile = File(
    path.join(webDirectory.path, 'package.json'),
  );
  if (packageJsonFile.existsSync()) {
    try {
      final Object? decoded = jsonDecode(packageJsonFile.readAsStringSync());
      if (decoded is Map<String, dynamic>) {
        final String? packageManagerField =
            decoded['packageManager'] as String?;
        if (packageManagerField != null && packageManagerField.isNotEmpty) {
          final String managerName = packageManagerField
              .split('@')
              .first
              .trim()
              .toLowerCase();
          if (managerName.isNotEmpty) {
            return parseWebPackageManager(managerName);
          }
        }
      }
    } catch (_) {
      // Fall through to lockfile detection.
    }
  }

  if (File(path.join(webDirectory.path, 'pnpm-lock.yaml')).existsSync()) {
    return WebPackageManager.pnpm;
  }
  if (File(path.join(webDirectory.path, 'package-lock.json')).existsSync()) {
    return WebPackageManager.npm;
  }
  if (File(path.join(webDirectory.path, 'yarn.lock')).existsSync()) {
    return WebPackageManager.yarn;
  }
  if (File(path.join(webDirectory.path, 'bun.lockb')).existsSync() ||
      File(path.join(webDirectory.path, 'bun.lock')).existsSync()) {
    return WebPackageManager.bun;
  }

  return WebPackageManager.pnpm;
}

WebPackageManager parseWebPackageManager(String value) {
  switch (value.trim().toLowerCase()) {
    case 'pnpm':
      return WebPackageManager.pnpm;
    case 'npm':
      return WebPackageManager.npm;
    case 'yarn':
      return WebPackageManager.yarn;
    case 'bun':
      return WebPackageManager.bun;
  }

  throw ArgumentError(
    'Unsupported web package manager "$value". Use auto, pnpm, npm, yarn, or bun.',
  );
}

String webPackageManagerCommand(WebPackageManager manager) {
  switch (manager) {
    case WebPackageManager.pnpm:
      return 'pnpm';
    case WebPackageManager.npm:
      return 'npm';
    case WebPackageManager.yarn:
      return 'yarn';
    case WebPackageManager.bun:
      return 'bun';
  }
}

bool webDependenciesInstalled(Directory webDirectory) {
  return Directory(path.join(webDirectory.path, 'node_modules')).existsSync();
}

List<String> buildWebInstallArguments(WebPackageManager manager) {
  switch (manager) {
    case WebPackageManager.pnpm:
      return <String>['install'];
    case WebPackageManager.npm:
      return <String>['install'];
    case WebPackageManager.yarn:
      return <String>['install'];
    case WebPackageManager.bun:
      return <String>['install'];
  }
}

List<String> buildWebDevArguments(WebPackageManager manager, {int? port}) {
  switch (manager) {
    case WebPackageManager.pnpm:
      return <String>[
        'dev',
        if (port != null) ...<String>['--port', '$port'],
      ];
    case WebPackageManager.npm:
      return <String>[
        'run',
        'dev',
        if (port != null) ...<String>['--', '--port', '$port'],
      ];
    case WebPackageManager.yarn:
      return <String>[
        'dev',
        if (port != null) ...<String>['--port', '$port'],
      ];
    case WebPackageManager.bun:
      return <String>[
        'run',
        'dev',
        if (port != null) ...<String>['--port', '$port'],
      ];
  }
}
