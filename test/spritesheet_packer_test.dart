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
      expect(metadata['animations'], hasLength(1));
      expect(metadata['animations'][0]['name'], 'default');
      expect(metadata['animations'][0]['frameIndices'], <int>[0, 1]);
      expect(metadata['frames'][0]['column'], 0);
      expect(metadata['frames'][1]['column'], 1);
      expect(metadata['frames'][0]['durationMs'], 100);
      expect(metadata['frames'][0]['pivotX'], 8);
      expect(metadata['frames'][0]['pivotY'], 8);
      expect(metadata['frames'][0]['tags'], contains('idle'));
    });

    test('writes explicit animation timing and pivot metadata when configured', () async {
      final Directory sandbox = await Directory.systemTemp.createTemp(
        'spritesheet_creator_animation_metadata',
      );
      addTearDown(() => sandbox.delete(recursive: true));

      final Directory framesDir = Directory(path.join(sandbox.path, 'frames'));
      await framesDir.create(recursive: true);

      await _writeFrame(
        path.join(framesDir.path, 'walk_0.png'),
        width: 20,
        height: 30,
        color: img.ColorRgb8(255, 255, 0),
      );
      await _writeFrame(
        path.join(framesDir.path, 'walk_1.png'),
        width: 20,
        height: 30,
        color: img.ColorRgb8(0, 255, 255),
      );

      final String outputImage = path.join(sandbox.path, 'build', 'sheet.png');
      final String outputMetadata = path.join(sandbox.path, 'build', 'sheet.json');

      await const SpritesheetPacker().pack(
        SpritesheetOptions(
          inputDirectory: framesDir.path,
          outputImagePath: outputImage,
          outputMetadataPath: outputMetadata,
          columns: 2,
          animationName: 'walk',
          frameDurationMs: 80,
          pivotX: 10,
          pivotY: 24,
        ),
      );

      final Map<String, dynamic> metadata =
          jsonDecode(await File(outputMetadata).readAsString())
              as Map<String, dynamic>;

      expect(metadata['animations'][0]['name'], 'walk');
      expect(metadata['animations'][0]['totalDurationMs'], 160);
      expect(metadata['frames'][0]['durationMs'], 80);
      expect(metadata['frames'][0]['pivotX'], 10);
      expect(metadata['frames'][0]['pivotY'], 24);
      expect(metadata['frames'][0]['tags'], contains('walk'));
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

    test('reports resolved path details when the input directory is missing', () async {
      final String missingPath = path.join('assets', 'frames', 'hero_idle');

      expect(
        () => const SpritesheetPacker().pack(
          SpritesheetOptions(
            inputDirectory: missingPath,
            outputImagePath: path.join('build', 'sheet.png'),
            outputMetadataPath: path.join('build', 'sheet.json'),
          ),
        ),
        throwsA(
          isA<ArgumentError>().having(
            (error) => error.message.toString(),
            'message',
            allOf(
              contains('Input directory does not exist: $missingPath'),
              contains('Resolved path:'),
              contains('Working directory:'),
            ),
          ),
        ),
      );
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
