import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:spritecraft/src/config/runtime_config.dart';
import 'package:spritecraft/src/server/studio_server.dart';
import 'package:test/test.dart';

void main() {
  group('Studio batch export endpoint', () {
    test('exports multiple animation jobs into one bundle', () async {
      final RuntimeConfig config = await RuntimeConfig.load(
        projectRoot: Directory.current,
      );
      final StudioServer studio = await StudioServer.create(config);
      final HttpServer server = await studio.serve(host: '127.0.0.1', port: 0);
      addTearDown(() => server.close(force: true));

      final Uri bootstrapUri = Uri.parse(
        'http://127.0.0.1:${server.port}/api/bootstrap',
      );
      final http.Response bootstrapResponse = await http.get(bootstrapUri);
      expect(bootstrapResponse.statusCode, 200);
      final Map<String, dynamic> bootstrapPayload =
          jsonDecode(bootstrapResponse.body) as Map<String, dynamic>;
      final Map<String, dynamic> defaults =
          bootstrapPayload['defaults'] as Map<String, dynamic>;
      final Map<String, String> defaultSelections = (
        defaults['selections'] as Map<String, dynamic>? ?? <String, dynamic>{}
      ).map(
        (String key, dynamic value) => MapEntry(key, value.toString()),
      );

      final Uri uri = Uri.parse('http://127.0.0.1:${server.port}/api/lpc/export');
      final http.Response response = await http.post(
        uri,
        headers: <String, String>{'content-type': 'application/json'},
        body: jsonEncode(<String, Object?>{
          'projectName': 'Batch Export Smoke',
          'enginePreset': 'none',
          'bodyType': 'male',
          'animation': 'idle',
          'prompt': 'batch export smoke test',
          'selections': defaultSelections,
          'batchAnimations': <String>['idle', 'walk'],
          'variants': <Map<String, Object?>>[
            <String, Object?>{
              'name': 'base',
              'bodyType': 'male',
              'prompt': 'base variant',
              'selections': defaultSelections,
            },
          ],
        }),
      );

      expect(response.statusCode, 200);
      final Map<String, dynamic> payload =
          jsonDecode(response.body) as Map<String, dynamic>;
      expect(payload['batch'], isTrue);
      expect(payload['jobs'], hasLength(2));
      expect(payload['bundlePath'], isA<String>());
      expect(File(payload['bundlePath'] as String).existsSync(), isTrue);
    });
  });
}
