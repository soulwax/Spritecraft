import 'dart:convert';
import 'dart:io';

import 'package:image/image.dart' as img;
import 'package:spritecraft/src/config/runtime_config.dart';
import 'package:spritecraft/src/server/studio_server.dart';
import 'package:test/test.dart';

void main() {
  test('imports a non-LPC spritesheet with metadata-aware summary', () async {
    final RuntimeConfig config = await RuntimeConfig.load();
    final StudioServer server = await StudioServer.create(config);
    final HttpServer httpServer = await server.serve(port: 0);
    final Directory tempDir = await Directory.systemTemp.createTemp(
      'spritecraft-non-lpc-import',
    );

    try {
      final File imageFile = File('${tempDir.path}/sample-sheet.png');
      final File metadataFile = File('${tempDir.path}/sample-sheet.json');
      final img.Image sampleImage = img.Image(
        width: 64,
        height: 32,
        numChannels: 4,
      );
      img.fill(sampleImage, color: img.ColorRgba8(255, 0, 0, 255));
      await imageFile.writeAsBytes(img.encodePng(sampleImage));
      await metadataFile.writeAsString(
        jsonEncode(<String, Object?>{
          'frames': <String, Object?>{
            'idle_0': <String, Object?>{
              'frame': <String, int>{'x': 0, 'y': 0, 'w': 32, 'h': 32},
            },
            'idle_1': <String, Object?>{
              'frame': <String, int>{'x': 32, 'y': 0, 'w': 32, 'h': 32},
            },
          },
        }),
      );

      final HttpClient client = HttpClient();
      final HttpClientRequest request = await client.post(
        '127.0.0.1',
        httpServer.port,
        '/api/non-lpc/import',
      );
      request.headers.contentType = ContentType.json;
      request.write(
        jsonEncode(<String, Object?>{
          'imagePath': imageFile.path,
          'metadataPath': metadataFile.path,
        }),
      );

      final HttpClientResponse response = await request.close();
      final Map<String, dynamic> payload =
          jsonDecode(await response.transform(utf8.decoder).join())
              as Map<String, dynamic>;

      expect(response.statusCode, 200);
      expect(payload['width'], 64);
      expect(payload['height'], 32);
      expect(payload['imageBase64'], isNotEmpty);
      expect(payload['summary']['frameCount'], 2);
      expect(payload['summary']['columns'], 2);
      expect(payload['summary']['rows'], 1);
      expect(payload['summary']['tileWidth'], 32);
      expect(payload['summary']['tileHeight'], 32);
      expect(payload['summary']['source'], 'image+metadata');
      expect(payload['summary']['frameNames'], containsAll(<String>[
        'idle_0',
        'idle_1',
      ]));
      client.close(force: true);
    } finally {
      await httpServer.close(force: true);
      await server.close();
      await tempDir.delete(recursive: true);
    }
  });
}
