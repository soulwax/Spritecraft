// File: test/bootstrap_endpoint_test.dart

import 'dart:convert';
import 'dart:io';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;
import 'package:spritecraft/src/config/runtime_config.dart';
import 'package:spritecraft/src/server/studio_server.dart';
import 'package:test/test.dart';

void main() {
  group('Bootstrap endpoint', () {
    test('serves the canonical /api/bootstrap route', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-bootstrap-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      final Directory definitions = Directory(
        path.join(
          root.path,
          'lpc-spritesheet-creator',
          'sheet_definitions',
          'body',
        ),
      );
      final Directory spritesheets = Directory(
        path.join(
          root.path,
          'lpc-spritesheet-creator',
          'spritesheets',
          'body',
          'bodies',
          'male',
          'idle',
        ),
      );
      await definitions.create(recursive: true);
      await spritesheets.create(recursive: true);
      await File(
        path.join(root.path, 'lpc-spritesheet-creator', '.git'),
      ).writeAsString('gitdir: ../.git/modules/lpc-spritesheet-creator');
      await File(
        path.join(root.path, 'lpc-spritesheet-creator', 'CREDITS.csv'),
      ).writeAsString('file,author\n');
      await File(path.join(definitions.path, 'body.json')).writeAsString('''
{
  "name": "Body Color",
  "type_name": "body",
  "variants": ["light"],
  "animations": ["idle"],
  "layer_1": {
    "zPos": 10,
    "male": "body/bodies/male/"
  },
  "credits": []
}
''');
      final img.Image image = img.Image(width: 4, height: 4);
      img.fill(image, color: img.ColorRgb8(255, 0, 0));
      await File(
        path.join(spritesheets.path, 'light.png'),
      ).writeAsBytes(img.encodePng(image));

      final RuntimeConfig config = await RuntimeConfig.load(projectRoot: root);
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
      expect(payload['catalog']['categories'], isA<List<dynamic>>());
      expect(payload['catalog']['typeNames'], isA<List<dynamic>>());
      expect(payload['catalog']['tags'], isA<List<dynamic>>());
      expect(payload['catalog']['variants'], isA<List<dynamic>>());
      expect(payload['catalog']['loadWarningCount'], isA<int>());
      expect(payload['catalog']['categories'], contains('body'));
      expect(payload['catalog']['typeNames'], contains('body'));
      expect(payload['catalog']['variants'], contains('light'));
      expect(payload['runtime'], isA<Map<String, dynamic>>());
      expect(payload['runtime']['exportDirectory'], isA<String>());
      expect(payload['runtime']['projectPackageDirectory'], isA<String>());
      expect(payload['runtime']['recoveryDirectory'], isA<String>());
      expect(payload['runtime']['logsDirectory'], isA<String>());
      expect(payload['runtime']['supportBundleDirectory'], isA<String>());
      expect(payload['runtime']['lpcProjectRoot'], isA<String>());
      expect(payload['runtime']['usesBundledLpcAssets'], isA<bool>());
      expect(payload['runtime']['hasDotEnvFile'], isA<bool>());
      expect(payload['runtime']['historyMode'], isA<String>());
      expect(payload['runtime']['historyPersistenceAvailable'], isA<bool>());
      expect(payload['runtime']['geminiMode'], isA<String>());
      expect(payload['exportPresets'], isA<List<dynamic>>());
      expect(payload['onboarding'], isA<Map<String, dynamic>>());
      expect(payload['onboarding']['steps'], isA<List<dynamic>>());
      expect(
        (payload['exportPresets'] as List<dynamic>)
            .map((dynamic option) => (option as Map<String, dynamic>)['id'])
            .toList(),
        containsAll(<String>[
          'none',
          'godot',
          'unity',
          'both',
          'aseprite',
          'generic',
          'all',
        ]),
      );
      expect(payload['recent'], isA<List<dynamic>>());
      expect(payload, compatibilityPayload);
    });
  });
}
