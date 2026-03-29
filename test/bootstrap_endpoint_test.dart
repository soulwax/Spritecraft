// File: test/bootstrap_endpoint_test.dart

import 'dart:convert';
import 'dart:io';

import 'package:spritecraft/src/config/runtime_config.dart';
import 'package:spritecraft/src/server/studio_server.dart';
import 'package:test/test.dart';

void main() {
  group('Bootstrap endpoint', () {
    test('serves the canonical /api/bootstrap route', () async {
      final RuntimeConfig config = await RuntimeConfig.load(
        projectRoot: Directory.current,
      );
      final StudioServer studio = await StudioServer.create(config);
      final HttpServer server = await studio.serve(host: '127.0.0.1', port: 0);
      addTearDown(() async {
        await server.close(force: true);
      });

      final HttpClient client = HttpClient();
      addTearDown(() {
        client.close(force: true);
      });

      Future<Map<String, dynamic>> fetchJson(String path) async {
        final HttpClientRequest request = await client.getUrl(
          Uri.parse('http://${server.address.host}:${server.port}$path'),
        );
        final HttpClientResponse response = await request.close();
        expect(response.statusCode, 200);
        final String body = await utf8.decoder.bind(response).join();
        return jsonDecode(body) as Map<String, dynamic>;
      }

      final Map<String, dynamic> payload = await fetchJson('/api/bootstrap');
      final Map<String, dynamic> compatibilityPayload = await fetchJson(
        '/api/studio/bootstrap',
      );

      expect(payload['config'], isA<Map<String, dynamic>>());
      expect(payload['catalog'], isA<Map<String, dynamic>>());
      expect(payload['recent'], isA<List<dynamic>>());
      expect(payload, compatibilityPayload);
    });
  });
}
