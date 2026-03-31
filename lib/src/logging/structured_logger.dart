import 'dart:convert';
import 'dart:io';
import 'package:path/path.dart' as path;

enum LogSeverity { info, warning, error }

typedef StructuredLogWriter =
    void Function(String line, {required LogSeverity severity});

class StructuredLogger {
  StructuredLogger({
    DateTime Function()? clock,
    StructuredLogWriter? writer,
    this._logDirectory,
    this._logPrefix = 'spritecraft',
  })
    : _clock = clock ?? DateTime.now,
      _writer = writer ?? _defaultWriter;

  final DateTime Function() _clock;
  final StructuredLogWriter _writer;
  final Directory? _logDirectory;
  final String _logPrefix;

  void info({
    required String subsystem,
    required String event,
    required String message,
    Map<String, Object?> context = const <String, Object?>{},
  }) {
    _log(
      severity: LogSeverity.info,
      subsystem: subsystem,
      event: event,
      message: message,
      context: context,
    );
  }

  void warning({
    required String subsystem,
    required String event,
    required String message,
    Map<String, Object?> context = const <String, Object?>{},
    Object? error,
    StackTrace? stackTrace,
  }) {
    _log(
      severity: LogSeverity.warning,
      subsystem: subsystem,
      event: event,
      message: message,
      context: context,
      error: error,
      stackTrace: stackTrace,
    );
  }

  void error({
    required String subsystem,
    required String event,
    required String message,
    Map<String, Object?> context = const <String, Object?>{},
    Object? error,
    StackTrace? stackTrace,
  }) {
    _log(
      severity: LogSeverity.error,
      subsystem: subsystem,
      event: event,
      message: message,
      context: context,
      error: error,
      stackTrace: stackTrace,
    );
  }

  void _log({
    required LogSeverity severity,
    required String subsystem,
    required String event,
    required String message,
    required Map<String, Object?> context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    final Map<String, Object?> payload = <String, Object?>{
      'timestamp': _clock().toUtc().toIso8601String(),
      'severity': severity.name,
      'subsystem': subsystem,
      'event': event,
      'message': message,
      if (context.isNotEmpty) 'context': _normalizeValue(context),
      if (error != null)
        'error': <String, Object?>{
          'type': error.runtimeType.toString(),
          'message': error.toString(),
        },
      if (stackTrace != null) 'stackTrace': stackTrace.toString(),
    };

    _writer(jsonEncode(payload), severity: severity);
    _writeToFile(jsonEncode(payload));
  }

  Object? _normalizeValue(Object? value) {
    if (value == null || value is num || value is bool || value is String) {
      return value;
    }
    if (value is Uri || value is DateTime || value is FileSystemEntity) {
      return value.toString();
    }
    if (value is List) {
      return value.map(_normalizeValue).toList(growable: false);
    }
    if (value is Map) {
      return Map<String, Object?>.fromEntries(
        value.entries.map(
          (MapEntry<dynamic, dynamic> entry) =>
              MapEntry(entry.key.toString(), _normalizeValue(entry.value)),
        ),
      );
    }
    return value.toString();
  }

  static void _defaultWriter(String line, {required LogSeverity severity}) {
    final IOSink sink = severity == LogSeverity.info ? stdout : stderr;
    sink.writeln(line);
  }

  void _writeToFile(String line) {
    if (_logDirectory == null) {
      return;
    }

    try {
      _logDirectory.createSync(recursive: true);
      final DateTime now = _clock().toUtc();
      final String stamp =
          '${now.year.toString().padLeft(4, '0')}-'
          '${now.month.toString().padLeft(2, '0')}-'
          '${now.day.toString().padLeft(2, '0')}';
      final File logFile = File(
        path.join(_logDirectory.path, '$_logPrefix-$stamp.log.jsonl'),
      );
      logFile.writeAsStringSync('$line\n', mode: FileMode.append, flush: true);
    } catch (_) {
      // Keep structured stdout/stderr logging working even if local file logging fails.
    }
  }
}
