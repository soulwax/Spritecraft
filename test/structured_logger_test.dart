import 'dart:convert';

import 'package:spritecraft/src/logging/structured_logger.dart';
import 'package:test/test.dart';

void main() {
  test('writes structured JSON with severity, context, and error details', () {
    final List<Map<String, Object?>> entries = <Map<String, Object?>>[];
    final StructuredLogger logger = StructuredLogger(
      clock: () => DateTime.utc(2026, 3, 30, 12, 0, 0),
      writer: (String line, {required LogSeverity severity}) {
        final Map<String, dynamic> decoded =
            jsonDecode(line) as Map<String, dynamic>;
        entries.add(<String, Object?>{
          ...decoded,
          'severityFromWriter': severity.name,
        });
      },
    );

    logger.error(
      subsystem: 'export',
      event: 'export_failed',
      message: 'Export generation failed unexpectedly.',
      context: <String, Object?>{
        'jobId': 'export-123',
        'paths': <String>['build/exports/foo.png'],
      },
      error: StateError('bad frame data'),
      stackTrace: StackTrace.fromString('frame A\nframe B'),
    );

    expect(entries, hasLength(1));
    expect(entries.single['timestamp'], '2026-03-30T12:00:00.000Z');
    expect(entries.single['severity'], 'error');
    expect(entries.single['severityFromWriter'], 'error');
    expect(entries.single['subsystem'], 'export');
    expect(entries.single['event'], 'export_failed');
    expect(entries.single['message'], 'Export generation failed unexpectedly.');

    final Map<String, dynamic> error =
        entries.single['error']! as Map<String, dynamic>;
    expect(error['type'], 'StateError');
    expect(error['message'], contains('bad frame data'));

    final Map<String, dynamic> context =
        entries.single['context']! as Map<String, dynamic>;
    expect(context['jobId'], 'export-123');
    expect(context['paths'], <String>['build/exports/foo.png']);
    expect(entries.single['stackTrace'], contains('frame A'));
  });

  test('normalizes non-primitive context values to strings', () {
    final List<Map<String, Object?>> entries = <Map<String, Object?>>[];
    final StructuredLogger logger = StructuredLogger(
      clock: () => DateTime.utc(2026, 3, 30, 12, 30, 0),
      writer: (String line, {required LogSeverity severity}) {
        entries.add(jsonDecode(line) as Map<String, Object?>);
      },
    );

    logger.warning(
      subsystem: 'database',
      event: 'history_connect_failed',
      message: 'History persistence could not be initialized.',
      context: <String, Object?>{
        'attemptedAt': DateTime.utc(2026, 3, 30, 12, 30, 0),
        'uri': Uri.parse('https://spritecraft.test/health'),
      },
    );

    final Map<String, dynamic> context =
        entries.single['context']! as Map<String, dynamic>;
    expect(context['attemptedAt'], '2026-03-30 12:30:00.000Z');
    expect(context['uri'], 'https://spritecraft.test/health');
  });
}
