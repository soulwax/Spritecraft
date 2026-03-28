// File: test/spritesheet_packer_test.dart

import 'dart:convert';
import 'dart:io';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;
import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  group('SpritesheetPacker', () {
    test('packs a folder of png files and writes metadata', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'spritesheet_creator_test',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final Directory framesDir = Directory(path.join(sandbox.path, 'frames'));
      await framesDir.create(recursive: true);

      await _writeFrame(
        path.join(framesDir.path, 'idle_0.png'),
        width: 16,
        height: 16,
        color: img.ColorRgb8(255, 0, 0),
      );
      await _writeFrame(
        path.join(framesDir.path, 'idle_1.png'),
        width: 16,
        height: 16,
        color: img.ColorRgb8(0, 255, 0),
      );

      final String outputImage = path.join(sandbox.path, 'build', 'sheet.png');
      final String outputMetadata = path.join(
        sandbox.path,
        'build',
        'sheet.json',
      );

      final SpritesheetBuildResult actual = await const SpritesheetPacker()
          .pack(
            SpritesheetOptions(
              inputDirectory: framesDir.path,
              outputImagePath: outputImage,
              outputMetadataPath: outputMetadata,
              columns: 2,
            ),
          );
      expect(actual.frames, hasLength(2));
      expect(File(outputImage).existsSync(), isTrue);
      expect(File(outputMetadata).existsSync(), isTrue);

      final Map<String, dynamic> metadata =
          jsonDecode(await File(outputMetadata).readAsString())
              as Map<String, dynamic>;
      expect(metadata['schema']['name'], 'spritecraft.spritesheet');
      expect(metadata['image']['width'], 32);
      expect(metadata['image']['height'], 16);
      expect(metadata['layout']['columns'], 2);
      expect(metadata['layout']['frameCount'], 2);
      expect(metadata['frames'][0]['column'], 0);
      expect(metadata['frames'][1]['column'], 1);
    });

    test('rounds sheet dimensions to powers of two when requested', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'spritesheet_creator_pow2',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final Directory framesDir = Directory(path.join(sandbox.path, 'frames'));
      await framesDir.create(recursive: true);

      await _writeFrame(
        path.join(framesDir.path, 'frame.png'),
        width: 30,
        height: 18,
        color: img.ColorRgb8(0, 0, 255),
      );

      final SpritesheetBuildResult result = await const SpritesheetPacker()
          .pack(
            SpritesheetOptions(
              inputDirectory: framesDir.path,
              outputImagePath: path.join(sandbox.path, 'sheet.png'),
              outputMetadataPath: path.join(sandbox.path, 'sheet.json'),
              forcePowerOfTwo: true,
            ),
          );

      expect(result.sheetWidth, 32);
      expect(result.sheetHeight, 32);
    });
  });
}

Future<void> _writeFrame(
  String filePath, {
  required int width,
  required int height,
  required img.Color color,
}) async {
  final img.Image image = img.Image(width: width, height: height);
  img.fill(image, color: color);
  await File(filePath).writeAsBytes(img.encodePng(image));
}
