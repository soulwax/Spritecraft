// File: test/studio_health_test.dart

import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:spritecraft/src/config/runtime_config.dart';
import 'package:spritecraft/src/server/studio_server.dart';
import 'package:test/test.dart';

void main() {
  group('Studio health endpoint', () {
    test('returns runtime checks for the current project', () async {
      final RuntimeConfig config = await RuntimeConfig.load(
        projectRoot: Directory.current,
      );
      final StudioServer studio = await StudioServer.create(config);
      final HttpServer server = await studio.serve(host: '127.0.0.1', port: 0);
      addTearDown(() => server.close(force: true));

      final Uri uri = Uri.parse('http://127.0.0.1:${server.port}/health');
      final http.Response response = await http.get(uri);
      final Map<String, dynamic> payload =
          jsonDecode(response.body) as Map<String, dynamic>;

      expect(response.statusCode, 200);
      expect(payload['status'], anyOf('ok', 'warning', 'error'));
      expect(payload['checks'], isA<List<dynamic>>());

      final List<dynamic> checks = payload['checks'] as List<dynamic>;
      final List<String> labels = checks
          .map((dynamic item) => (item as Map<String, dynamic>)['label'] as String)
          .toList();

      expect(labels, isNot(contains('Studio assets')));
      expect(labels, contains('LPC project'));
      expect(labels, contains('Gemini'));
      expect(labels, contains('Database'));
      expect(labels, contains('.env configuration'));
    });
  });
}
