// File: lib/src/spritesheet_packer.dart

import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;

import 'models/spritesheet_build_result.dart';
import 'models/spritesheet_options.dart';

class SpritesheetPacker {
  const SpritesheetPacker();

  static const Set<String> _supportedExtensions = <String>{
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.bmp',
  };

  Future<SpritesheetBuildResult> pack(SpritesheetOptions options) async {
    final Directory inputDirectory = Directory(options.inputDirectory);
    if (!await inputDirectory.exists()) {
      final String resolvedPath = path.normalize(path.absolute(options.inputDirectory));
      final String currentDirectory = path.normalize(Directory.current.path);
      throw ArgumentError(
        'Input directory does not exist: ${options.inputDirectory}\n'
        'Resolved path: $resolvedPath\n'
        'Working directory: $currentDirectory\n'
        'Create the directory with source frames or pass a different --input path.',
      );
    }

    final List<FileSystemEntity> entries = await inputDirectory.list().toList();
    final List<File> files =
        entries
            .whereType<File>()
            .where(
              (File file) => _supportedExtensions.contains(
                path.extension(file.path).toLowerCase(),
              ),
            )
            .toList()
          ..sort(
            (File a, File b) =>
                path.basename(a.path).compareTo(path.basename(b.path)),
          );

    if (files.isEmpty) {
      throw StateError(
        'No supported image files were found in ${options.inputDirectory}.',
      );
    }

    final List<_LoadedFrame> frames = <_LoadedFrame>[];
    for (final File file in files) {
      final img.Image image = await _decodeImage(file);
      frames.add(_LoadedFrame(file: file, image: image));
    }

    final int tileWidth =
        options.tileWidth ??
        frames.map((frame) => frame.image.width).reduce(math.max);
    final int tileHeight =
        options.tileHeight ??
        frames.map((frame) => frame.image.height).reduce(math.max);

    final int columns = math.max(
      1,
      options.columns ?? math.sqrt(frames.length).ceil(),
    );
    final int rows = (frames.length / columns).ceil();

    final int paddedWidth =
        (columns * tileWidth) + ((columns - 1) * options.padding);
    final int paddedHeight =
        (rows * tileHeight) + ((rows - 1) * options.padding);
    final int sheetWidth = options.forcePowerOfTwo
        ? nextPowerOfTwo(paddedWidth)
        : paddedWidth;
    final int sheetHeight = options.forcePowerOfTwo
        ? nextPowerOfTwo(paddedHeight)
        : paddedHeight;

    final img.Image sheet = img.Image(width: sheetWidth, height: sheetHeight);
    img.fill(sheet, color: img.ColorRgba8(0, 0, 0, 0));

    final List<SpriteFramePlacement> placements = <SpriteFramePlacement>[];
    for (int index = 0; index < frames.length; index++) {
      final _LoadedFrame frame = frames[index];
      if (frame.image.width > tileWidth || frame.image.height > tileHeight) {
        throw StateError(
          'Frame ${path.basename(frame.file.path)} exceeds the tile size '
          '(${frame.image.width}x${frame.image.height} > $tileWidth'
          'x$tileHeight).',
        );
      }

      final int column = index % columns;
      final int row = index ~/ columns;
      final int tileX = column * (tileWidth + options.padding);
      final int tileY = row * (tileHeight + options.padding);
      final int x = tileX + ((tileWidth - frame.image.width) ~/ 2);
      final int y = tileY + ((tileHeight - frame.image.height) ~/ 2);

      img.compositeImage(sheet, frame.image, dstX: x, dstY: y);

      placements.add(
        SpriteFramePlacement(
          name: path.basenameWithoutExtension(frame.file.path),
          sourcePath: path.normalize(frame.file.path),
          index: index,
          column: column,
          row: row,
          tileX: tileX,
          tileY: tileY,
          x: x,
          y: y,
          width: frame.image.width,
          height: frame.image.height,
          tileWidth: tileWidth,
          tileHeight: tileHeight,
          offsetX: x - tileX,
          offsetY: y - tileY,
          sourceWidth: frame.image.width,
          sourceHeight: frame.image.height,
          durationMs: options.frameDurationMs,
          pivotX: options.pivotX ?? (tileWidth ~/ 2),
          pivotY: options.pivotY ?? (tileHeight ~/ 2),
          tags: _deriveFrameTags(path.basenameWithoutExtension(frame.file.path)),
        ),
      );
    }

    final String animationName = options.animationName.trim().isEmpty
        ? 'default'
        : options.animationName.trim();

    final File outputImage = File(options.outputImagePath);
    await outputImage.parent.create(recursive: true);
    await outputImage.writeAsBytes(img.encodePng(sheet));

    final SpritesheetBuildResult result = SpritesheetBuildResult(
      sheetWidth: sheetWidth,
      sheetHeight: sheetHeight,
      tileWidth: tileWidth,
      tileHeight: tileHeight,
      columns: columns,
      rows: rows,
      imagePath: path.normalize(options.outputImagePath),
      metadataPath: path.normalize(options.outputMetadataPath),
      frames: placements,
      animations: <SpritesheetAnimationSequence>[
        SpritesheetAnimationSequence(
          name: animationName,
          loop: true,
          frameIndices: placements
              .map((SpriteFramePlacement placement) => placement.index)
              .toList(),
          totalDurationMs: placements.fold<int>(
            0,
            (int total, SpriteFramePlacement placement) =>
                total + placement.durationMs,
          ),
        ),
      ],
    );

    final File outputMetadata = File(options.outputMetadataPath);
    await outputMetadata.parent.create(recursive: true);
    await outputMetadata.writeAsString(
      const JsonEncoder.withIndent('  ').convert(result.toJson()),
    );

    return result;
  }

  List<String> _deriveFrameTags(String frameName) {
    return frameName
        .toLowerCase()
        .split(RegExp(r'[^a-z0-9]+'))
        .where((String token) => token.isNotEmpty)
        .where((String token) => int.tryParse(token) == null)
        .toSet()
        .toList();
  }

  int nextPowerOfTwo(int value) {
    if (value < 1) {
      return 1;
    }

    int power = 1;
    while (power < value) {
      power <<= 1;
    }
    return power;
  }

  Future<img.Image> _decodeImage(File file) async {
    final Uint8List bytes = await file.readAsBytes();
    final img.Image? decoded = img.decodeImage(bytes);
    if (decoded == null) {
      throw StateError('Could not decode image: ${file.path}');
    }
    return decoded;
  }
}

class _LoadedFrame {
  const _LoadedFrame({required this.file, required this.image});

  final File file;
  final img.Image image;
}
